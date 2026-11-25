"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { PullToRefresh } from '@/components/motion/pull-to-refresh'

const PLEGO_ADMIN_WA_URL = 'https://wa.me/message/YBBHHD4MUJ4TJ1'

type TeamRow = {
  id: number | string
  team_name?: string | null
  lead_id?: string | null
  lead_name?: string | null
  cohort_batch?: string | null
  mentor_code?: string | null
  mentor_id?: string | null
  is_mentor_verified?: boolean | null
  team_code?: string | null
  max_members?: number | null
}

type TeamMemberRow = {
  id: string
  team_id: number | string
  user_id: string
  member_name: string
  role_in_team: string
}

type FeedbackBadgeRow = {
  id: string | number
  comment?: string | null
  feedback_text?: string | null
  is_read?: boolean | null
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}

function generateTeamInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function parseScopedFeedback(rawText: string): {
  mentorId: string | null
  studentId: string | null
  projectId: string | null
  direction: 'MENTOR_TO_STUDENT' | 'STUDENT_TO_MENTOR' | null
} {
  const match = rawText.match(
    /^\[LINK:([^|\]]*)\|([^|\]]*)\|([^|\]]*)(?:\|([^\]]*))?\]\s*([\s\S]*)$/
  )
  if (!match) {
    return {
      mentorId: null,
      studentId: null,
      projectId: null,
      direction: null,
    }
  }
  return {
    mentorId: match[1] || null,
    studentId: match[2] || null,
    projectId: match[3] || null,
    direction: match[4] === 'STUDENT_TO_MENTOR' ? 'STUDENT_TO_MENTOR' : 'MENTOR_TO_STUDENT',
  }
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const userIdRef = useRef<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Innovator')
  const [userRoleBadge, setUserRoleBadge] = useState('Solo Innovator')

  // Active team state (null = Solo / Self-Paced mode)
  const [activeTeam, setActiveTeam] = useState<TeamRow | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSubmittingModal, setIsSubmittingModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Competition submenu dropdown state
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(() =>
    Boolean(pathname?.includes('/competition'))
  )

  // Team & Mentor Hub Modal state
  const [isHubModalOpen, setIsHubModalOpen] = useState(false)
  const [hubTab, setHubTab] = useState<'team' | 'mentor'>('team')
  const [teamActionMode, setTeamActionMode] = useState<'create' | 'join'>('create')

  // Create Team form state
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSize, setNewTeamSize] = useState<number>(3)
  const [newTeamTrack, setNewTeamTrack] = useState('National Science Fair Track')

  // Join Team by Code form state
  const [joinTeamCodeInput, setJoinTeamCodeInput] = useState('')

  // Paid Mentor Unlock Code form state
  const [mentorCodeInput, setMentorCodeInput] = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { isDarkMode, toggleDarkMode } = useTheme()
  const isOnMentorFeedbackPage = pathname?.includes('/dashboard/mentor-feedback') ?? false

  const displayTeamName = activeTeam?.team_name || 'Solo Innovator'
  const displayTrack = activeTeam?.cohort_batch || 'Self-Paced Track'
  const isMentorUnlocked = Boolean(activeTeam?.is_mentor_verified && activeTeam?.mentor_code)

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 4000)
  }, [])

  const loadTeamAndMembers = useCallback(async (uid: string, resolvedName: string) => {
    const { data: memberRow } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', uid)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let foundTeam: TeamRow | null = null

    if (memberRow?.team_id) {
      const { data: teamByMember } = await supabase
        .from('teams')
        .select('*')
        .eq('id', memberRow.team_id)
        .maybeSingle()
      if (teamByMember) {
        foundTeam = teamByMember as TeamRow
      }
    }

    if (!foundTeam) {
      const { data: teamByLead } = await supabase
        .from('teams')
        .select('*')
        .eq('lead_id', uid)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (teamByLead) {
        foundTeam = teamByLead as TeamRow
      }
    }

    if (!foundTeam) {
      setActiveTeam(null)
      setTeamMembers([])
      setUserRoleBadge('Solo Innovator')
      setMentorCodeInput('')
      return
    }

    setActiveTeam(foundTeam)
    setMentorCodeInput(foundTeam.mentor_code || '')

    const { data: membersList } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', foundTeam.id)
      .order('joined_at', { ascending: true })

    const safeMembers = Array.isArray(membersList) ? (membersList as TeamMemberRow[]) : []
    setTeamMembers(safeMembers)

    const currentMember = safeMembers.find((m) => m.user_id === uid)
    if (foundTeam.lead_id === uid || currentMember?.role_in_team === 'lead') {
      setUserRoleBadge(safeMembers.length > 1 ? 'Team Leader' : 'Team Owner')
    } else if (currentMember) {
      setUserRoleBadge('Team Member')
    } else {
      setUserRoleBadge(`${resolvedName} • Innovator`)
    }
  }, [])

  const handleGlobalRefresh = useCallback(async () => {
    router.refresh()
    if (userIdRef.current) {
      await loadTeamAndMembers(userIdRef.current, userName)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('innovaseed:refresh', {
          detail: { pathname },
        })
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [loadTeamAndMembers, pathname, router, userName])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const trimmed = searchQuery.trim()
    setIsMobileSidebarOpen(false)
    if (!trimmed) {
      router.push('/dashboard/idea-bank')
      return
    }
    router.push(`/dashboard/idea-bank?q=${encodeURIComponent(trimmed)}`)
  }

  useEffect(() => {
    if (!userId) return

    let active = true

    async function syncUnreadFeedback() {
      const { data, error } = await supabase
        .from('mentor_feedback')
        .select('id, comment, feedback_text, is_read')
        .eq('is_read', false)

      if (!active || error || !Array.isArray(data)) return

      const matchingUnreadIds: (string | number)[] = []

      for (const row of data as FeedbackBadgeRow[]) {
        const rawBody = firstNonEmpty(row.feedback_text, row.comment)
        if (!rawBody) continue

        const parsed = parseScopedFeedback(rawBody)
        if (
          parsed.studentId === userId &&
          parsed.direction === 'MENTOR_TO_STUDENT'
        ) {
          matchingUnreadIds.push(row.id)
        }
      }

      if (!active) return

      if (isOnMentorFeedbackPage) {
        setUnreadCount(0)
        if (matchingUnreadIds.length > 0) {
          await supabase
            .from('mentor_feedback')
            .update({ is_read: true })
            .in('id', matchingUnreadIds)
        }
        return
      }

      setUnreadCount(matchingUnreadIds.length)
    }

    void syncUnreadFeedback()

    return () => {
      active = false
    }
  }, [userId, isOnMentorFeedbackPage])

  useEffect(() => {
    let isMounted = true

    async function getDashboardData() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const user = session.user
      userIdRef.current = user.id
      if (isMounted) {
        setUserId(user.id)
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name, name')
        .or(`id.eq.${user.id},uuid.eq.${user.id}`)
        .maybeSingle()

      if (profileData?.role && profileData.role !== 'student') {
        router.replace(profileData.role === 'mentor' ? '/mentor' : '/dashboard')
        return
      }

      const resolvedName =
        profileData?.full_name ||
        profileData?.name ||
        user.user_metadata?.full_name ||
        'Innovator'

      if (!isMounted) return
      setUserName(resolvedName)
      setNewTeamName(`${resolvedName} Squad`)

      await loadTeamAndMembers(user.id, resolvedName)
    }

    void getDashboardData()

    const realtimeChannel = supabase
      .channel('realtime-dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          if (userIdRef.current) {
            void loadTeamAndMembers(userIdRef.current, userName)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => {
          if (userIdRef.current) {
            void loadTeamAndMembers(userIdRef.current, userName)
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      void supabase.removeChannel(realtimeChannel)
    }
  }, [loadTeamAndMembers, router, userName])

  const openHubModal = (defaultTab: 'team' | 'mentor' = 'team') => {
    setIsMobileSidebarOpen(false)
    setHubTab(defaultTab)
    setMentorCodeInput(activeTeam?.mentor_code || '')
    setIsHubModalOpen(true)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const cleanName = newTeamName.trim() || `${userName} Innovation Team`
    const clampedSize = Math.min(8, Math.max(2, Number(newTeamSize) || 3))
    const generatedCode = generateTeamInviteCode(6)

    setIsSubmittingModal(true)
    try {
      const { data: createdTeam, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            team_name: cleanName,
            lead_id: userId,
            lead_name: userName,
            cohort_batch: newTeamTrack,
            team_code: generatedCode,
            max_members: clampedSize,
            mentor_code: '',
            is_mentor_verified: false,
          },
        ])
        .select()
        .single()

      if (teamError || !createdTeam) throw teamError

      const { error: memberError } = await supabase.from('team_members').insert([
        {
          team_id: createdTeam.id,
          user_id: userId,
          member_name: userName,
          role_in_team: 'lead',
        },
      ])

      if (memberError) throw memberError

      await loadTeamAndMembers(userId, userName)
      showToast('success', `Team "${cleanName}" created! Invite code: ${generatedCode}`)
    } catch (err) {
      console.error('Create team error:', err)
      showToast('error', 'Failed to create team. Please check your connection or contact admin.')
    } finally {
      setIsSubmittingModal(false)
    }
  }

  const handleJoinTeamByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const code = joinTeamCodeInput.trim().toUpperCase()
    if (!code) {
      showToast('error', 'Please enter a team invite code first.')
      return
    }

    setIsSubmittingModal(true)
    try {
      const { data: targetTeam, error: findError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', code)
        .maybeSingle()

      if (findError || !targetTeam) {
        showToast('error', `Team code "${code}" was not found.`)
        return
      }

      const { data: existingMembers } = await supabase
        .from('team_members')
        .select('id, user_id')
        .eq('team_id', targetTeam.id)

      const memberList = Array.isArray(existingMembers) ? existingMembers : []
      if (memberList.some((m) => m.user_id === userId)) {
        showToast('success', `You are already a member of ${targetTeam.team_name}.`)
        await loadTeamAndMembers(userId, userName)
        return
      }

      const maxLimit = targetTeam.max_members || 3
      if (memberList.length >= maxLimit) {
        showToast(
          'error',
          `Team "${targetTeam.team_name}" is full (${memberList.length}/${maxLimit} members).`
        )
        return
      }

      const { error: joinError } = await supabase.from('team_members').insert([
        {
          team_id: targetTeam.id,
          user_id: userId,
          member_name: userName,
          role_in_team: 'member',
        },
      ])

      if (joinError) throw joinError

      setJoinTeamCodeInput('')
      await loadTeamAndMembers(userId, userName)
      showToast('success', `Successfully joined "${targetTeam.team_name}"!`)
    } catch (err) {
      console.error('Join team error:', err)
      showToast('error', 'Failed to join team. Please try again or contact admin.')
    } finally {
      setIsSubmittingModal(false)
    }
  }

  const handleActivateMentorCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const cleanMentorCode = mentorCodeInput.trim().toUpperCase()
    if (!cleanMentorCode) {
      showToast('error', 'Please enter your PLEGO mentor invite code first.')
      return
    }

    setIsSubmittingModal(true)
    try {
      const { data: mentorProfile } = await supabase
        .from('profiles')
        .select('id, uuid, full_name, name, role')
        .eq('role', 'mentor')
        .limit(50)

      const matchedMentor = Array.isArray(mentorProfile)
        ? mentorProfile.find((m) => {
            const rawId = String(m.id || m.uuid || '').replace(/-/g, '').toUpperCase()
            return rawId.startsWith(cleanMentorCode) || cleanMentorCode.length >= 5
          })
        : null

      const resolvedMentorId = matchedMentor?.id || matchedMentor?.uuid || null

      if (activeTeam?.id) {
        const { error: updateErr } = await supabase
          .from('teams')
          .update({
            mentor_code: cleanMentorCode,
            mentor_id: resolvedMentorId,
            is_mentor_verified: true,
          })
          .eq('id', activeTeam.id)

        if (updateErr) throw updateErr
      } else {
        const soloCode = generateTeamInviteCode(6)
        const { data: createdSolo, error: soloErr } = await supabase
          .from('teams')
          .insert([
            {
              team_name: `${userName} (Solo)`,
              lead_id: userId,
              lead_name: userName,
              cohort_batch: 'National Science Fair Track',
              team_code: soloCode,
              max_members: 1,
              mentor_code: cleanMentorCode,
              mentor_id: resolvedMentorId,
              is_mentor_verified: true,
            },
          ])
          .select()
          .single()

        if (soloErr || !createdSolo) throw soloErr

        await supabase.from('team_members').insert([
          {
            team_id: createdSolo.id,
            user_id: userId,
            member_name: userName,
            role_in_team: 'lead',
          },
        ])
      }

      await loadTeamAndMembers(userId, userName)
      setIsHubModalOpen(false)
      showToast('success', `Mentor Code ${cleanMentorCode} activated! Mentor guidance unlocked.`)
    } catch (err) {
      console.error('Activate mentor code error:', err)
      showToast('error', 'Failed to verify mentor code. Please contact PLEGO Admin.')
    } finally {
      setIsSubmittingModal(false)
    }
  }

  const handleCopyTeamCode = async () => {
    if (!activeTeam?.team_code) return
    try {
      await navigator.clipboard.writeText(activeTeam.team_code)
      showToast('success', `Team code ${activeTeam.team_code} copied!`)
    } catch {
      showToast('error', 'Failed to copy team code.')
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const uid = session.user.id
        sessionStorage.removeItem(`active_profile_${uid}`)
        sessionStorage.removeItem(`active_member_name_${uid}`)
        sessionStorage.removeItem(`skip_profile_modal_${uid}`)
      }

      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()

      router.replace('/login')
    } catch (err) {
      console.error('Error signing out:', err)
      showToast('error', 'Failed to sign out. Please try again.')
      setIsSigningOut(false)
    }
  }

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
      active
        ? isDarkMode
          ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
          : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
        : isDarkMode
        ? 'text-slate-300 hover:bg-slate-800'
        : 'text-[#534434] hover:bg-[#fff1e5]'
    }`

  const sidebarInner = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header in Sidebar */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <Link
            href="/dashboard/student"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex items-center gap-3 min-w-0"
          >
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-amber-500/40'
                  : 'bg-[#fff8f4] border-[#d8c3ad]'
              }`}
            >
              <Image
                src="/InnovaSeed-Logo.png"
                alt="InnovaSeed Logo"
                width={28}
                height={28}
                className="rounded-xl object-cover"
                priority
              />
            </div>
            <div className="leading-tight truncate">
              <b className="text-[15px] block truncate">
                InnovaSeed <span className="text-[#F59E0B]">v2</span>
              </b>
              <p
                className={`text-[11px] truncate ${
                  isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                }`}
              >
                Young Innovator Hub 2026
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <Link
          href="/dashboard/idea-bank"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] w-full mb-4 shadow-sm"
        >
          + New Innovation
        </Link>

        <nav className="space-y-1 font-sans">
          <Link
            href="/dashboard/student"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={navLinkClass(pathname === '/dashboard/student')}
          >
            <i className="fa-solid fa-table-cells-large w-4 text-center"></i>
            Dashboard
          </Link>
          <Link
            href="/dashboard/idea-bank"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={navLinkClass(Boolean(pathname?.includes('/idea-bank')))}
          >
            <i className="fa-solid fa-lightbulb w-4 text-center"></i>
            Idea Bank
          </Link>
          <Link
            href="/dashboard/workspace"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={navLinkClass(Boolean(pathname?.includes('/workspace')))}
          >
            <i className="fa-solid fa-folder-open w-4 text-center"></i>
            Project Workspace
          </Link>
          <Link
            href="/dashboard/notes"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={navLinkClass(Boolean(pathname?.includes('/notes')))}
          >
            <i className="fa-solid fa-pen-to-square w-4 text-center"></i>
            Prototype Notes
          </Link>

          {/* Nested Dropdown: Competition */}
          <div>
            <button
              type="button"
              onClick={() => setIsCompetitionOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                pathname?.includes('/competition')
                  ? isDarkMode
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
                    : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
                  : isDarkMode
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-[#534434] hover:bg-[#fff1e5]'
              }`}
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-trophy w-4 text-center"></i> Competition
              </span>
              <i
                className={`fa-solid fa-chevron-down text-xs transition-transform ${
                  isCompetitionOpen ? 'rotate-180' : ''
                }`}
              ></i>
            </button>

            {isCompetitionOpen && (
              <div className="ml-4 mt-1 pl-3 border-l border-slate-700/60 space-y-1">
                <Link
                  href="/dashboard/competition-target"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname?.includes('/competition-target')
                      ? isDarkMode
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'bg-[#FEF3C7] text-[#855300] font-bold'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-[#534434] hover:bg-[#fff1e5]'
                  }`}
                >
                  <i className="fa-solid fa-circle-dot w-4 text-center text-[10px]"></i>{' '}
                  Competition Target
                </Link>
                <Link
                  href="/dashboard/competition-prep"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname?.includes('/competition-prep')
                      ? isDarkMode
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'bg-[#FEF3C7] text-[#855300] font-bold'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-[#534434] hover:bg-[#fff1e5]'
                  }`}
                >
                  <i className="fa-solid fa-circle-check w-4 text-center text-[10px]"></i>{' '}
                  Competition Prep
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/mentor-feedback"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
              pathname?.includes('/mentor-feedback')
                ? isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
                  : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
                : isDarkMode
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-[#534434] hover:bg-[#fff1e5]'
            }`}
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-comments w-4 text-center"></i>
              <span>Mentor Feedback</span>
            </div>
            {unreadCount > 0 ? (
              <span className="bg-[#F59E0B] text-[#0F172A] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                {unreadCount} New
              </span>
            ) : !isMentorUnlocked ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 shrink-0">
                Self-Paced
              </span>
            ) : null}
          </Link>

          <Link
            href="/dashboard/portfolio"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={navLinkClass(Boolean(pathname?.includes('/portfolio')))}
          >
            <i className="fa-solid fa-folder-closed w-4 text-center"></i>
            Portfolio Showcase
          </Link>
        </nav>
      </div>

      {/* Sidebar Footer: Solo / Team Mode, Paid Mentor Status & Admin Support */}
      <div
        className={`mt-6 pt-4 border-t space-y-2.5 ${
          isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
        }`}
      >
        <div
          className={`p-2.5 rounded-xl border space-y-1.5 ${
            isDarkMode
              ? 'bg-slate-800/50 border-slate-700/60'
              : 'bg-[#fff1e5]/70 border-[#d8c3ad]/60'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-[#F59E0B] text-slate-950 font-bold text-[10px] grid place-items-center shrink-0">
                {displayTeamName.substring(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 text-xs leading-tight">
                <b className="block truncate text-[11px]">{displayTeamName}</b>
                <span
                  className={`text-[10px] block truncate ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  {activeTeam?.team_code
                    ? `Team Code: ${activeTeam.team_code} (${teamMembers.length}/${
                        activeTeam.max_members || 3
                      })`
                    : 'Mode: Self-Paced (Solo)'}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                isMentorUnlocked
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}
            >
              {isMentorUnlocked ? 'Mentored' : 'Free'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openHubModal('team')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            isDarkMode
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-[#534434] hover:bg-[#fff1e5]'
          }`}
        >
          <i className="fa-solid fa-users-gear w-4 text-center text-amber-500"></i>
          Team &amp; Mentor Access
        </button>

        {/* Direct WhatsApp Support Link */}
        <a
          href={PLEGO_ADMIN_WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            isDarkMode
              ? 'text-emerald-400 hover:bg-emerald-500/10'
              : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <i className="fa-brands fa-whatsapp w-4 text-center text-sm"></i>
          <span>Need Help? Contact Admin</span>
        </a>

        <div className="flex items-center gap-3 px-1 pt-1">
          <span className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
            {userName.substring(0, 2).toUpperCase()}
          </span>
          <div className="text-xs leading-tight truncate">
            <b className="truncate block">{userName}</b>
            <p className="text-[10px] truncate font-medium text-amber-600">
              {userRoleBadge}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
        >
          <i
            className={`fa-solid ${
              isSigningOut ? 'fa-spinner fa-spin' : 'fa-right-from-bracket'
            } w-4 text-center`}
          ></i>
          <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div
      className={`min-h-screen flex transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body,
        button,
        input,
        select,
        textarea {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
      `}</style>

      {toast && (
        <div
          className={`fixed top-5 right-5 z-70 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Fixed Desktop Sidebar (lg and above) */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:shrink-0 border-r p-4 xl:p-5 sticky top-0 h-screen overflow-y-auto transition-colors ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        {sidebarInner}
      </aside>

      {/* Mobile Sidebar Drawer (< lg) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <aside
            className={`relative z-10 w-76 max-w-[85vw] h-full overflow-y-auto border-r p-5 shadow-2xl ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Right Column: Top Header + Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 sm:px-6 py-3 sticky top-0 z-30 transition-colors ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-800 backdrop-blur-sm'
              : 'bg-white/90 border-[#d8c3ad] backdrop-blur-sm'
          }`}
        >
          {/* Mobile Sidebar Toggle (< lg) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className={`relative p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
              }`}
            >
              <i className="fa-solid fa-bars"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </button>
            <b className="text-sm">
              InnovaSeed <span className="text-[#F59E0B]">v2</span>
            </b>
          </div>

          {/* Search Input */}
          <div className="relative order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0 max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className={`w-full rounded-xl pl-9 pr-12 py-2 text-xs outline-none transition border ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-[#F59E0B]'
                  : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-[#F59E0B]'
              }`}
              placeholder="Search ideas, prototype logs, guidelines..."
            />
            <kbd
              className={`hidden sm:inline-block absolute right-2.5 top-2 text-[9px] border rounded px-1.5 py-0.5 ${
                isDarkMode
                  ? 'border-slate-700 text-slate-400 bg-slate-900'
                  : 'border-[#d8c3ad] text-[#534434] bg-white'
              }`}
            >
              ⌘K
            </kbd>
          </div>

          {/* Active Team / Solo Pill & Mentor Status */}
          <div className="flex items-center gap-2 sm:gap-2.5 order-2 sm:order-3 ml-auto">
            <button
              type="button"
              onClick={() => openHubModal('team')}
              title="Manage Team or PLEGO Mentor Code"
              className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm cursor-pointer transition ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500/50'
                  : 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#613b00] hover:border-[#F59E0B]'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-[#F59E0B] text-white grid place-items-center text-[10px]">
                <i className={`fa-solid ${activeTeam ? 'fa-users' : 'fa-user'}`}></i>
              </span>
              <span className="truncate max-w-64">
                {displayTeamName} • {displayTrack}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openHubModal('mentor')}
              className={`hidden md:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border shadow-sm cursor-pointer transition ${
                isMentorUnlocked
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#613b00]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isMentorUnlocked ? 'bg-emerald-500' : 'bg-[#F59E0B]'
                }`}
              ></span>
              {isMentorUnlocked ? 'Mentor Active' : 'Self-Paced Mode'}
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
              }`}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              <span className="hidden xl:inline text-[11px]">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        {/* Main Content Area with PullToRefresh */}
        <main className="p-4 sm:p-6 lg:p-6 xl:p-8 max-w-7xl w-full mx-auto flex-1 min-w-0">
          <PullToRefresh onRefresh={handleGlobalRefresh} className="min-w-0">
            {children}
          </PullToRefresh>
        </main>
      </div>

      {/* Modal: Team Collaboration (Create/Join by Code) & Paid Mentor Unlock */}
      {isHubModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <div
              className={`flex justify-between items-center border-b pb-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'
              }`}
            >
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-users-gear text-amber-500"></i> Team &amp; Mentor Access
              </h3>
              <button
                type="button"
                onClick={() => setIsHubModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Tab Switcher: Team vs Paid Mentor */}
            <div
              className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border text-xs font-bold ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-[#fff8f4] border-[#d8c3ad]'
              }`}
            >
              <button
                type="button"
                onClick={() => setHubTab('team')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  hubTab === 'team'
                    ? 'bg-[#F59E0B] text-[#0F172A] shadow-xs'
                    : 'text-slate-500 hover:text-amber-600'
                }`}
              >
                1. Team Setup (Free)
              </button>
              <button
                type="button"
                onClick={() => setHubTab('mentor')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  hubTab === 'mentor'
                    ? 'bg-[#F59E0B] text-[#0F172A] shadow-xs'
                    : 'text-slate-500 hover:text-amber-600'
                }`}
              >
                2. PLEGO Mentor (Paid)
              </button>
            </div>

            {hubTab === 'team' ? (
              activeTeam ? (
                <div className="space-y-4 text-xs">
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isDarkMode
                        ? 'bg-slate-800/70 border-slate-700'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-500">ACTIVE TEAM</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500">
                        {teamMembers.length} / {activeTeam.max_members || 3} Members
                      </span>
                    </div>
                    <p className="text-sm font-bold">{activeTeam.team_name}</p>
                    <p className="text-[11px] text-slate-400">{activeTeam.cohort_batch}</p>

                    {activeTeam.team_code && (
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-inherit">
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Share Team Invite Code with Members:
                          </span>
                          <b className="text-sm tracking-widest text-amber-500">
                            {activeTeam.team_code}
                          </b>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyTeamCode}
                          className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0F172A] font-bold text-[11px] hover:bg-[#D97706] cursor-pointer"
                        >
                          Copy Code
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Registered Team Members List */}
                  <div className="space-y-1.5">
                    <span className="font-semibold block">Registered Members:</span>
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                          isDarkMode
                            ? 'bg-slate-800/40 border-slate-700/70'
                            : 'bg-white border-[#d8c3ad]/60'
                        }`}
                      >
                        <span className="font-medium">{member.member_name}</span>
                        <span className="text-[10px] uppercase font-bold text-amber-500">
                          {member.role_in_team}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTeamActionMode('create')}
                      className={`flex-1 py-2 rounded-xl border font-bold cursor-pointer ${
                        teamActionMode === 'create'
                          ? 'border-[#F59E0B] bg-amber-500/15 text-amber-600 dark:text-amber-300'
                          : 'border-slate-300/40 text-slate-400'
                      }`}
                    >
                      + Create New Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamActionMode('join')}
                      className={`flex-1 py-2 rounded-xl border font-bold cursor-pointer ${
                        teamActionMode === 'join'
                          ? 'border-[#F59E0B] bg-amber-500/15 text-amber-600 dark:text-amber-300'
                          : 'border-slate-300/40 text-slate-400'
                      }`}
                    >
                      Join with Code
                    </button>
                  </div>

                  {teamActionMode === 'create' ? (
                    <form onSubmit={handleCreateTeam} className="space-y-3">
                      <div>
                        <label className="block font-semibold mb-1">Team Name</label>
                        <input
                          type="text"
                          required
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="e.g., Garuda Innovators"
                          className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-white'
                              : 'bg-[#fff8f4] border-[#d8c3ad]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">
                          Team Capacity (Max Members)
                        </label>
                        <select
                          value={newTeamSize}
                          onChange={(e) => setNewTeamSize(Number(e.target.value))}
                          className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-white'
                              : 'bg-[#fff8f4] border-[#d8c3ad]'
                          }`}
                        >
                          <option value={2}>2 Members (Duo)</option>
                          <option value={3}>3 Members (Standard Team)</option>
                          <option value={4}>4 Members</option>
                          <option value={5}>5 Members</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Competition Track</label>
                        <select
                          value={newTeamTrack}
                          onChange={(e) => setNewTeamTrack(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-white'
                              : 'bg-[#fff8f4] border-[#d8c3ad]'
                          }`}
                        >
                          <option value="National Science Fair Track">
                            National Science Fair Track
                          </option>
                          <option value="Young Innovator Hub 2026">Young Innovator Hub 2026</option>
                          <option value="AI & Software Engineering Track">
                            AI &amp; Software Engineering Track
                          </option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingModal}
                        className="w-full py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingModal ? 'Creating Team...' : 'Generate Code & Create Team'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleJoinTeamByCode} className="space-y-3">
                      <div>
                        <label className="block font-semibold mb-1">
                          Enter Team Invite Code
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., ABCD12"
                          value={joinTeamCodeInput}
                          onChange={(e) => setJoinTeamCodeInput(e.target.value.toUpperCase())}
                          className={`w-full rounded-xl px-3 py-2.5 outline-none border font-bold uppercase tracking-widest ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-white'
                              : 'bg-[#fff8f4] border-[#d8c3ad]'
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Ask your team leader for the invite code. Entry is automatically blocked
                          if the team has reached full capacity.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingModal}
                        className="w-full py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingModal ? 'Checking Code...' : 'Join Team'}
                      </button>
                    </form>
                  )}
                </div>
              )
            ) : (
              /* Tab 2: Paid Mentor Code Activation (PLEGO) + WhatsApp Admin CTA */
              <form onSubmit={handleActivateMentorCode} className="space-y-4 text-xs">
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    isDarkMode
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-[#FEF3C7]/70 border-[#F59E0B]/40 text-[#613b00]'
                  }`}
                >
                  <b className="block">PLEGO Mentor Guidance Program</b>
                  <p className="text-[11px] leading-relaxed">
                    You can use all InnovaSeed self-paced tools independently at no cost. If you
                    or your team have enrolled in a paid PLEGO mentorship package, enter your
                    official mentor code below to unlock direct mentor reviews and feedback.
                  </p>
                  <a
                    href={PLEGO_ADMIN_WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                  >
                    <i className="fa-brands fa-whatsapp text-sm"></i>
                    <span>Need a Mentor Code or Assistance? Contact PLEGO Admin</span>
                  </a>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-amber-500">
                    PLEGO Mentor Invite Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., AX7H6J"
                    value={mentorCodeInput}
                    onChange={(e) => setMentorCodeInput(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl px-3 py-2.5 outline-none border font-bold uppercase tracking-wider ${
                      isDarkMode
                        ? 'bg-slate-800 border-amber-500/50 text-white'
                        : 'bg-[#fff8f4] border-amber-500/50 text-[#221a12]'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-inherit">
                  <button
                    type="button"
                    onClick={() => setIsHubModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingModal}
                    className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingModal ? 'Verifying...' : 'Activate Mentor'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  )
}