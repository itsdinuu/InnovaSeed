"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { PullToRefresh } from '@/components/motion/pull-to-refresh'
import { MotionStyles } from '@/components/motion/motion-styles'
import { PageTransition } from '@/components/motion/page-transition'

const PLEGO_ADMIN_WA_URL = 'https://wa.me/message/YBBHHD4MUJ4TJ1'
const PLEGO_MENTORSHIP_URL =
  process.env.NEXT_PUBLIC_PLEGO_MENTORSHIP_URL || 'https://lynk.id/plegoindonesia/k829lkgw9g2d'

const STUDENT_MOTION_CSS = `
  @keyframes adm-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes adm-pop { 0% { transform: scale(0.92); opacity: 0; } 70% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes adm-pulse-dot { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.55); } 70% { box-shadow: 0 0 0 7px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }

  .adm-page-enter { animation: adm-fade-up 380ms cubic-bezier(0.22, 1, 0.36, 1) both; }
  .adm-fade-up { animation: adm-fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--adm-delay, 0ms); }
  .adm-pop { animation: adm-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: var(--adm-delay, 0ms); }
  .adm-live-dot { animation: adm-pulse-dot 2s ease-out infinite; }

  .adm-lift { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; will-change: transform; }
  .adm-lift:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(146, 64, 14, 0.28); }
  .adm-lift:active { transform: translateY(0) scale(0.99); }

  .adm-nav-btn { transition: background-color 160ms ease, color 160ms ease, transform 160ms ease; }
  .adm-nav-btn:hover { transform: translateX(3px); }
  .adm-nav-btn:active { transform: translateX(1px) scale(0.985); }

  .adm-btn { transition: transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease; }
  .adm-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px -8px rgba(146, 64, 14, 0.45); }
  .adm-btn:active { transform: translateY(0) scale(0.98); }

  @media (prefers-reduced-motion: reduce) {
    .adm-page-enter, .adm-fade-up, .adm-pop, .adm-live-dot { animation: none !important; }
    .adm-lift, .adm-nav-btn, .adm-btn { transition: none !important; }
    .adm-lift:hover, .adm-nav-btn:hover, .adm-btn:hover { transform: none !important; }
  }
`

type AccountMentorRow = {
  id: number | string
  mentor_code?: string | null
  mentor_id?: string | null
  is_mentor_verified?: boolean | null
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
  const [userRoleBadge, setUserRoleBadge] = useState('Innovator')

  const [mentorRecord, setMentorRecord] = useState<AccountMentorRow | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSubmittingModal, setIsSubmittingModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const [isCompetitionOpen, setIsCompetitionOpen] = useState(() =>
    Boolean(pathname?.includes('/competition'))
  )

  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false)
  const [mentorCodeInput, setMentorCodeInput] = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { isDarkMode, toggleDarkMode } = useTheme()
  const isOnMentorFeedbackPage = pathname?.includes('/dashboard/mentor-feedback') ?? false

  const isMentorUnlocked = Boolean(mentorRecord?.is_mentor_verified && mentorRecord?.mentor_code)

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 4000)
  }, [])

  const loadAccountMentorStatus = useCallback(async (uid: string, resolvedName: string) => {
    setUserRoleBadge(`${resolvedName} • Innovator`)

    const { data: teamRow } = await supabase
      .from('teams')
      .select('id, mentor_code, mentor_id, is_mentor_verified')
      .eq('lead_id', uid)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (teamRow) {
      setMentorRecord(teamRow as AccountMentorRow)
      setMentorCodeInput(teamRow.mentor_code || '')
    } else {
      setMentorRecord(null)
      setMentorCodeInput('')
    }
  }, [])

  const handleGlobalRefresh = useCallback(async () => {
    router.refresh()
    if (userIdRef.current) {
      await loadAccountMentorStatus(userIdRef.current, userName)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('innovaseed:refresh', {
          detail: { pathname },
        })
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [loadAccountMentorStatus, pathname, router, userName])

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
    const isMounted = true

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

      await loadAccountMentorStatus(user.id, resolvedName)
    }

    void getDashboardData()
  }, [loadAccountMentorStatus, router])

  const openMentorModal = () => {
    setIsMobileSidebarOpen(false)
    setMentorCodeInput(mentorRecord?.mentor_code || '')
    setIsMentorModalOpen(true)
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
        .select('id, uuid, full_name, name, role, mentor_code')
        .eq('role', 'mentor')
        .limit(50)

      const matchedMentor = Array.isArray(mentorProfile)
        ? mentorProfile.find(
            (m) =>
              typeof m.mentor_code === 'string' &&
              m.mentor_code.trim().toUpperCase() === cleanMentorCode
          )
        : null

      if (!matchedMentor) {
        showToast(
          'error',
          `Code "${cleanMentorCode}" is not a valid PLEGO mentor code. Mentor codes are issued by the PLEGO Admin after a paid mentorship enrollment — pay via Lynk first, then contact admin if you need help.`
        )
        return
      }

      const resolvedMentorId = matchedMentor.id || matchedMentor.uuid || null

      if (mentorRecord?.id) {
        const { error: updateErr } = await supabase
          .from('teams')
          .update({
            mentor_code: cleanMentorCode,
            mentor_id: resolvedMentorId,
            is_mentor_verified: true,
          })
          .eq('id', mentorRecord.id)

        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('teams').insert([
          {
            team_name: userName,
            lead_id: userId,
            lead_name: userName,
            cohort_batch: 'Self-Paced Track',
            max_members: 1,
            mentor_code: cleanMentorCode,
            mentor_id: resolvedMentorId,
            is_mentor_verified: true,
          },
        ])

        if (insertErr) throw insertErr
      }

      await loadAccountMentorStatus(userId, userName)
      setIsMentorModalOpen(false)
      showToast(
        'success',
        `Mentor Code ${cleanMentorCode} verified! Connected to ${
          matchedMentor.full_name || matchedMentor.name || 'your PLEGO mentor'
        } — mentor guidance unlocked.`
      )
    } catch (err) {
      console.error('Activate mentor code error:', err)
      showToast('error', 'Failed to verify mentor code. Please contact PLEGO Admin.')
    } finally {
      setIsSubmittingModal(false)
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
    `adm-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
      active
        ? isDarkMode
          ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
          : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
        : isDarkMode
        ? 'text-slate-300 hover:bg-slate-800'
        : 'text-[#534434] hover:bg-[#fff1e5]'
    }`

  const sidebarInner = (
    <div className="adm-fade-up flex flex-col min-h-full justify-between">
      <div>
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
            className="adm-btn lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <Link
          href="/dashboard/idea-bank"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="adm-btn inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] w-full mb-4 shadow-sm"
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

          <div>
            <button
              type="button"
              onClick={() => setIsCompetitionOpen((prev) => !prev)}
              className={`adm-nav-btn w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
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
                className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${
                  isCompetitionOpen ? 'rotate-180' : ''
                }`}
              ></i>
            </button>

            {isCompetitionOpen && (
              <div className="adm-page-enter ml-4 mt-1 pl-3 border-l border-slate-700/60 space-y-1">
                <Link
                  href="/dashboard/competition-target"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`adm-nav-btn flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
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
                  className={`adm-nav-btn flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
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
            className={`adm-nav-btn flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm ${
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
              <span className="adm-live-dot bg-[#F59E0B] text-[#0F172A] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
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

      {/* Sidebar Footer: Account Name, Mentor Status & Admin Support */}
      <div
        className={`mt-5 pt-4 border-t space-y-2 ${
          isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
        }`}
      >
        <div
          className={`adm-lift p-2.5 rounded-xl border space-y-1.5 ${
            isDarkMode
              ? 'bg-slate-800/50 border-slate-700/60'
              : 'bg-[#fff1e5]/70 border-[#d8c3ad]/60'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-[#F59E0B] text-slate-950 font-bold text-[10px] grid place-items-center shrink-0">
                {userName.substring(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 text-xs leading-tight">
                <b className="block truncate text-[11px]">{userName}</b>
                <span
                  className={`text-[10px] block truncate ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  {isMentorUnlocked ? 'PLEGO Mentored Account' : 'Independent Account'}
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
          onClick={openMentorModal}
          className={`adm-nav-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            isDarkMode
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-[#534434] hover:bg-[#fff1e5]'
          }`}
        >
          <i className="fa-solid fa-user-check w-4 text-center text-amber-500"></i>
          PLEGO Mentor Access
        </button>

        <a
          href={PLEGO_ADMIN_WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`adm-nav-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
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
          className="adm-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
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
      <MotionStyles />
      <style>{STUDENT_MOTION_CSS}</style>
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
          className={`adm-pop fixed top-5 right-5 z-70 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Fixed Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:shrink-0 border-r p-4 xl:p-5 sticky top-0 h-screen overflow-y-auto transition-colors ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        {sidebarInner}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div className="adm-page-enter fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <aside
            className={`adm-pop relative z-10 w-76 max-w-[85vw] h-full overflow-y-auto border-r p-5 shadow-2xl ${
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
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-20 transition-colors ${
            isDarkMode
              ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md'
              : 'bg-white/95 border-[#d8c3ad] backdrop-blur-md'
          }`}
        >
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className={`adm-btn relative p-2.5 rounded-xl border text-xs font-bold cursor-pointer shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
              }`}
            >
              <i className="fa-solid fa-bars"></i>
              {unreadCount > 0 && (
                <span className="adm-live-dot absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </button>
            <b className="text-sm">
              InnovaSeed <span className="text-[#F59E0B]">v2</span>
            </b>
          </div>

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

          <div className="flex items-center gap-2 sm:gap-2.5 order-2 sm:order-3 ml-auto">
            <span
              className={`hidden xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-[#fff8f4] border-[#d8c3ad] text-[#534434]'
              }`}
            >
              <i className="fa-regular fa-user text-amber-500"></i>
              <span className="truncate max-w-48">{userName}</span>
            </span>

            <button
              type="button"
              onClick={openMentorModal}
              className={`adm-btn hidden md:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border shadow-sm cursor-pointer ${
                isMentorUnlocked
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#613b00]'
              }`}
            >
              <span
                className={`adm-live-dot w-2 h-2 rounded-full ${
                  isMentorUnlocked ? 'bg-emerald-500' : 'bg-[#F59E0B]'
                }`}
              ></span>
              {isMentorUnlocked ? 'Mentor Active' : 'Self-Paced Mode'}
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`adm-btn p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm ${
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

        <main className="p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto flex-1 min-w-0">
          <PullToRefresh onRefresh={handleGlobalRefresh} className="min-w-0">
            <div key={pathname} className="adm-page-enter">
              <PageTransition>{children}</PageTransition>
            </div>
          </PullToRefresh>
        </main>
      </div>

      {/* Modal: PLEGO Mentor Access */}
      {isMentorModalOpen && (
        <div className="adm-page-enter fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`adm-pop rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border ${
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
                <i className="fa-solid fa-user-check text-amber-500"></i> PLEGO Mentor Access
              </h3>
              <button
                type="button"
                onClick={() => setIsMentorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleActivateMentorCode} className="space-y-4 text-xs">
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-[#FEF3C7]/70 border-[#F59E0B]/40 text-[#613b00]'
                }`}
              >
                <b className="block">Account: {userName}</b>
                <p className="text-[11px] leading-relaxed">
                  Joining competitions on InnovaSeed is free, and you can use all self-paced
                  tools independently at no cost. You only pay if you want to be{' '}
                  <b>mentored by PLEGO for a competition</b>. Purchase the mentorship package
                  via Lynk, and the PLEGO Admin will issue you an official mentor code after
                  payment.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={PLEGO_MENTORSHIP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0F172A] font-bold text-[11px] hover:bg-[#D97706]"
                  >
                    <i className="fa-solid fa-credit-card text-sm"></i>
                    <span>Pay Mentorship Package via Lynk</span>
                  </a>
                  <a
                    href={PLEGO_ADMIN_WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="adm-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                  >
                    <i className="fa-brands fa-whatsapp text-sm"></i>
                    <span>Contact PLEGO Admin</span>
                  </a>
                </div>
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
                  onClick={() => setIsMentorModalOpen(false)}
                  className="adm-btn px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="adm-btn px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingModal ? 'Verifying...' : 'Activate Mentor'}
                </button>
              </div>
            </form>
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