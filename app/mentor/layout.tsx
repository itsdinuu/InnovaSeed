"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

type TeamMemberItem = {
  id: string
  name: string
  roleLabel: string
  isMentor?: boolean
}

type TeamConversationGroup = {
  key: string
  studentId: string
  projectId: string
  teamName: string
  projectTitle: string
  members: TeamMemberItem[]
  unreadCount: number
  lastMessageText: string
  lastMessageTime?: string
}

type ChatMessageItem = {
  id: string | number
  senderName: string
  senderRole: string
  direction: 'MENTOR_TO_STUDENT' | 'STUDENT_TO_MENTOR'
  text: string
  createdAt?: string
  rawIdNum: number
}

function isUuidLike(val?: string | null) {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

function getInitials(name?: string) {
  if (!name) return 'TM'
  const cleaned = name.replace(/^(dr\.|prof\.|mr\.|mrs\.|ms\.)\s*/i, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 2) || 'TM').toUpperCase()
}

function getOwnerIdFromRow(row: Record<string, unknown>): string | null {
  const raw = row.user_id ?? row.author_id ?? row.owner_id ?? row.created_by ?? null
  return raw === undefined || raw === null || String(raw).trim() === '' ? null : String(raw)
}

function parseScopedFeedback(rawText: string): {
  mentorId: string | null
  studentId: string | null
  projectId: string | null
  direction: 'MENTOR_TO_STUDENT' | 'STUDENT_TO_MENTOR' | null
  cleanText: string
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
      cleanText: rawText,
    }
  }
  return {
    mentorId: match[1] || null,
    studentId: match[2] || null,
    projectId: match[3] || null,
    direction: match[4] === 'STUDENT_TO_MENTOR' ? 'STUDENT_TO_MENTOR' : 'MENTOR_TO_STUDENT',
    cleanText: match[5]?.trim() || '',
  }
}

function collectRowIds(row: Record<string, unknown>): string[] {
  const ids: string[] = []
  for (const val of Object.values(row)) {
    if (typeof val === 'string' || typeof val === 'number') {
      const str = String(val).trim()
      if (str) ids.push(str)
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string' && item.trim()) {
          ids.push(item.trim())
        } else if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          for (const k of ['id', 'user_id', 'student_id', 'member_id']) {
            if (obj[k]) ids.push(String(obj[k]).trim())
          }
        }
      }
    }
  }
  return ids
}

function MentorDashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mentorUserId, setMentorUserId] = useState<string | null>(null)
  const [mentorName, setMentorName] = useState('Faculty Lead')
  const [mentorCode, setMentorCode] = useState<string | null>(null)
  const [mentorRoleBadge, setMentorRoleBadge] = useState('Faculty Reviewer')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // State Chat Drawer / Pop-up (2 tahap: List Tim dulu -> Klik tim melebar & geser ke chat)
  const [chatOpen, setChatOpen] = useState(false)
  const [activeTeamKey, setActiveTeamKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all')
  const [teamGroups, setTeamGroups] = useState<TeamConversationGroup[]>([])
  const [allMessages, setAllMessages] = useState<
    Array<
      ChatMessageItem & {
        studentId: string
        projectId: string
        teamKey: string
      }
    >
  >([])
  const [lastSeenByTeam, setLastSeenByTeam] = useState<Record<string, number>>({})
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
  if (!mentorUserId) return

  const storageKey = `mentor_last_seen_${mentorUserId}`

  const restoreData = () => {
    try {
      const saved = localStorage.getItem(storageKey)

      if (!saved) {
        setLastSeenByTeam({})
        return
      }

      const parsed = JSON.parse(saved) as Record<string, unknown>
      const validEntries: Record<string, number> = {}

      for (const [teamKey, value] of Object.entries(parsed)) {
        const id = Number(value)

        if (Number.isFinite(id) && id >= 0) {
          validEntries[teamKey] = id
        }
      }

      setLastSeenByTeam(validEntries)
    } catch (error) {
      console.error(
        'Failed to restore read-message markers:',
        error
      )
      setLastSeenByTeam({})
    }
  }

  queueMicrotask(restoreData)
}, [mentorUserId])

  const { isDarkMode, toggleDarkMode } = useTheme()

  const loadMentorConversations = useCallback(
    async (currentMentorId: string, currentMentorDisplayName: string) => {
      try {
        const linkedStudentIds = new Set<string>()

        const { data: linkRows } = await supabase
          .from('mentor_students')
          .select('*')
          .eq('mentor_id', currentMentorId)

        if (linkRows && linkRows.length > 0) {
          for (const row of linkRows as Record<string, unknown>[]) {
            const st = String(row.status || '').toLowerCase()
            if (row.student_id && (!st || st === 'accepted' || st === 'active')) {
              linkedStudentIds.add(String(row.student_id))
            }
          }
        }

        const { data: profilesRows } = await supabase.from('profiles').select('*')
        const profileMap = new Map<string, Record<string, unknown>>()
        for (const p of (profilesRows || []) as Record<string, unknown>[]) {
          if (p.id) {
            const pid = String(p.id)
            profileMap.set(pid, p)
            const assignedMentor =
              p.mentor_id ?? p.assigned_mentor_id ?? p.supervisor_id ?? null
            if (assignedMentor && String(assignedMentor) === currentMentorId) {
              linkedStudentIds.add(pid)
            }
          }
        }

        const { data: projectsRows } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        const projectsArr = (projectsRows || []) as Record<string, unknown>[]
        const projectsByOwner = new Map<string, Record<string, unknown>>()
        const projectIdsByOwner = new Map<string, string[]>()

        for (const proj of projectsArr) {
          const ownerId = getOwnerIdFromRow(proj)
          const projMentor = proj.mentor_id ?? proj.advisor_id ?? null
          if (projMentor && String(projMentor) === currentMentorId && ownerId) {
            linkedStudentIds.add(ownerId)
          }
          if (ownerId) {
            if (!projectsByOwner.has(ownerId)) {
              projectsByOwner.set(ownerId, proj)
            }
            if (proj.id !== undefined && proj.id !== null) {
              const arr = projectIdsByOwner.get(ownerId) || []
              arr.push(String(proj.id))
              projectIdsByOwner.set(ownerId, arr)
            }
          }
        }

        const { data: teamsRows } = await supabase.from('teams').select('*')
        const teamsArr = (teamsRows || []) as Record<string, unknown>[]

        const resolveTeamNameFromTable = (
          studentId: string,
          projectId: string
        ): string | undefined => {
          const candidateKeys = new Set<string>([
            studentId,
            ...(projectIdsByOwner.get(studentId) || []),
          ])
          if (projectId && projectId !== 'default') {
            candidateKeys.add(projectId)
          }

          for (const tRow of teamsArr) {
            const rawTeamName =
              typeof tRow.team_name === 'string' ? tRow.team_name.trim() : ''
            if (!rawTeamName) continue

            const rowTokenSet = new Set(collectRowIds(tRow))
            for (const key of candidateKeys) {
              if (rowTokenSet.has(key)) {
                return rawTeamName
              }
            }
          }
          return undefined
        }

        const teamMembersByStudentId = new Map<string, TeamMemberItem[]>()

        for (const tRow of teamsArr) {
          const tMentor = tRow.mentor_id ?? tRow.advisor_id ?? null
          const rowTokens = collectRowIds(tRow)
          if (tMentor && String(tMentor) === currentMentorId) {
            for (const token of rowTokens) {
              if (profileMap.has(token)) {
                linkedStudentIds.add(token)
              }
            }
          }

          const candidateStudent =
            tRow.student_id ?? tRow.leader_id ?? tRow.user_id ?? tRow.owner_id ?? null
          if (candidateStudent && Array.isArray(tRow.members)) {
            const parsedTeamMembers: TeamMemberItem[] = []
            tRow.members.forEach((m, idx) => {
              if (typeof m === 'string' && m.trim()) {
                parsedTeamMembers.push({
                  id: `tm-${idx}`,
                  name: m.trim(),
                  roleLabel: idx === 0 ? 'Team Lead' : 'Member',
                })
              } else if (m && typeof m === 'object') {
                const mObj = m as Record<string, unknown>
                const mName = String(mObj.name ?? mObj.full_name ?? '').trim()
                if (mName) {
                  parsedTeamMembers.push({
                    id: String(mObj.id ?? `tm-${idx}`),
                    name: mName,
                    roleLabel: String(mObj.role ?? (idx === 0 ? 'Team Lead' : 'Member')),
                  })
                }
              }
            })
            if (parsedTeamMembers.length > 0) {
              teamMembersByStudentId.set(String(candidateStudent), parsedTeamMembers)
            }
          }
        }

        const { data: feedbackRows } = await supabase
          .from('mentor_feedback')
          .select('*')
          .order('id', { ascending: true })

        const parsedRows: Array<{
          idNum: number
          rawId: string | number
          studentId: string
          projectId: string
          direction: 'MENTOR_TO_STUDENT' | 'STUDENT_TO_MENTOR'
          text: string
          createdAt?: string
          senderName?: string
          senderRole?: string
        }> = []

        for (const fb of (feedbackRows || []) as Record<string, unknown>[]) {
          const rawBody = String(fb.feedback_text ?? fb.comment ?? fb.message ?? '').trim()
          if (!rawBody) continue

          const parsed = parseScopedFeedback(rawBody)
          const rowIdNum = Number(fb.id) || parsedRows.length + 1
          const createdAt =
            (fb.inserted_at as string | undefined) || (fb.created_at as string | undefined)

          if (parsed.mentorId && parsed.studentId) {
            if (parsed.mentorId !== currentMentorId) continue
            linkedStudentIds.add(parsed.studentId)
            const resolvedProjId =
              parsed.projectId ||
              (fb.project_id ? String(fb.project_id) : '') ||
              String(projectsByOwner.get(parsed.studentId)?.id || 'default')

            parsedRows.push({
              idNum: rowIdNum,
              rawId: (fb.id as string | number) ?? rowIdNum,
              studentId: parsed.studentId,
              projectId: resolvedProjId,
              direction: parsed.direction ?? 'MENTOR_TO_STUDENT',
              text: parsed.cleanText,
              createdAt,
              senderName: fb.mentor_name as string | undefined,
              senderRole: fb.mentor_role as string | undefined,
            })
            continue
          }

          const fbMentor = fb.mentor_id ? String(fb.mentor_id) : null
          const fbStudent = fb.student_id
            ? String(fb.student_id)
            : fb.user_id
            ? String(fb.user_id)
            : null

          if (fbMentor && fbMentor !== currentMentorId) continue
          if (fbStudent && linkedStudentIds.has(fbStudent)) {
            const resolvedProjId =
              (fb.project_id ? String(fb.project_id) : '') ||
              String(projectsByOwner.get(fbStudent)?.id || 'default')
            parsedRows.push({
              idNum: rowIdNum,
              rawId: (fb.id as string | number) ?? rowIdNum,
              studentId: fbStudent,
              projectId: resolvedProjId,
              direction: 'MENTOR_TO_STUDENT',
              text: rawBody,
              createdAt,
              senderName: fb.mentor_name as string | undefined,
              senderRole: fb.mentor_role as string | undefined,
            })
          }
        }

        const groupsMap = new Map<string, TeamConversationGroup>()

        for (const studentId of linkedStudentIds) {
          const prof = profileMap.get(studentId) || {}
          const studentDisplayName =
            (typeof prof.full_name === 'string' && prof.full_name.trim()) ||
            (typeof prof.name === 'string' && prof.name.trim()) ||
            (typeof prof.email === 'string' && prof.email.split('@')[0]) ||
            `Student ${studentId.slice(0, 6)}`

          const proj = projectsByOwner.get(studentId)
          const projectId = proj?.id ? String(proj.id) : 'default'
          const projectTitle =
            (typeof proj?.title === 'string' && proj.title.trim()) || 'Active Innovation Project'

          const teamName =
            resolveTeamNameFromTable(studentId, projectId) || studentDisplayName

          const rawMembers = Array.isArray(proj?.team_members) ? proj.team_members : []
          const parsedMembers: TeamMemberItem[] = [
            ...(teamMembersByStudentId.get(studentId) || []),
          ]

          if (parsedMembers.length === 0 && rawMembers.length > 0) {
            rawMembers.forEach((m, idx) => {
              if (typeof m === 'string' && m.trim()) {
                parsedMembers.push({
                  id: `m-${idx}`,
                  name: m.trim(),
                  roleLabel: idx === 0 ? 'Team Lead' : 'Member',
                })
              } else if (m && typeof m === 'object') {
                const mObj = m as Record<string, unknown>
                const mName = String(mObj.name ?? mObj.full_name ?? '').trim()
                if (mName) {
                  parsedMembers.push({
                    id: String(mObj.id ?? `m-${idx}`),
                    name: mName,
                    roleLabel: String(mObj.role ?? (idx === 0 ? 'Team Lead' : 'Member')),
                  })
                }
              }
            })
          }

          if (parsedMembers.length === 0) {
            parsedMembers.push({
              id: studentId,
              name: studentDisplayName,
              roleLabel: 'Student Lead',
            })
          }

          if (!parsedMembers.some((m) => m.isMentor)) {
            parsedMembers.push({
              id: currentMentorId,
              name: currentMentorDisplayName,
              roleLabel: 'Mentor',
              isMentor: true,
            })
          }

          const groupKey = `${studentId}::${projectId}`
          groupsMap.set(groupKey, {
            key: groupKey,
            studentId,
            projectId,
            teamName,
            projectTitle,
            members: parsedMembers,
            unreadCount: 0,
            lastMessageText: 'No messages yet. Click to start conversation.',
            lastMessageTime: undefined,
          })
        }

        const formattedMessages: Array<
          ChatMessageItem & { studentId: string; projectId: string; teamKey: string }
        > = []

        for (const msg of parsedRows) {
          const prof = profileMap.get(msg.studentId) || {}
          const studentDisplayName =
            (typeof prof.full_name === 'string' && prof.full_name.trim()) ||
            (typeof prof.name === 'string' && prof.name.trim()) ||
            (typeof prof.email === 'string' && prof.email.split('@')[0]) ||
            `Student ${msg.studentId.slice(0, 6)}`

          const proj = projectsByOwner.get(msg.studentId)
          const resolvedProjId =
            msg.projectId !== 'default'
              ? msg.projectId
              : proj?.id
              ? String(proj.id)
              : 'default'

          const groupKey = `${msg.studentId}::${resolvedProjId}`

          if (!groupsMap.has(groupKey)) {
            const projectTitle =
              (typeof proj?.title === 'string' && proj.title.trim()) || 'Active Innovation Project'
            const teamName =
              resolveTeamNameFromTable(msg.studentId, resolvedProjId) || studentDisplayName

            groupsMap.set(groupKey, {
              key: groupKey,
              studentId: msg.studentId,
              projectId: resolvedProjId,
              teamName,
              projectTitle,
              members: [
                ...(teamMembersByStudentId.get(msg.studentId) || [
                  { id: msg.studentId, name: studentDisplayName, roleLabel: 'Student Lead' },
                ]),
                {
                  id: currentMentorId,
                  name: currentMentorDisplayName,
                  roleLabel: 'Mentor',
                  isMentor: true,
                },
              ],
              unreadCount: 0,
              lastMessageText: msg.text,
              lastMessageTime: msg.createdAt,
            })
          }

          const targetGroup = groupsMap.get(groupKey)!
          targetGroup.lastMessageText =
            msg.direction === 'STUDENT_TO_MENTOR'
              ? `${studentDisplayName}: ${msg.text}`
              : `You: ${msg.text}`
          targetGroup.lastMessageTime = msg.createdAt

          const seenId = lastSeenByTeam[groupKey] ?? 0
          if (msg.direction === 'STUDENT_TO_MENTOR' && msg.idNum > seenId) {
            targetGroup.unreadCount += 1
          }

          formattedMessages.push({
            id: msg.rawId,
            rawIdNum: msg.idNum,
            studentId: msg.studentId,
            projectId: resolvedProjId,
            teamKey: groupKey,
            senderName:
              msg.direction === 'STUDENT_TO_MENTOR'
                ? studentDisplayName
                : msg.senderName || currentMentorDisplayName,
            senderRole:
              msg.direction === 'STUDENT_TO_MENTOR'
                ? 'Student'
                : msg.senderRole || 'Mentor',
            direction: msg.direction,
            text: msg.text,
            createdAt: msg.createdAt,
          })
        }

        const listGroups = Array.from(groupsMap.values())
        setTeamGroups(listGroups)
        setAllMessages(formattedMessages)
      } catch (err) {
        console.error('Error loading mentor conversations:', err)
      }
    },
    [lastSeenByTeam]
  )

  useEffect(() => {
    let isMounted = true

    async function getMentorProfile() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          if (isMounted) router.replace('/login')
          return
        }

        const user = session.user
        if (isMounted) setMentorUserId(user.id)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Supabase profile fetch error:', profileError.message)
        }

        const prof = (profileData || {}) as Record<string, unknown>

        const resolvedName =
          (typeof prof.full_name === 'string' && prof.full_name.trim()) ||
          (typeof prof.name === 'string' && prof.name.trim()) ||
          (typeof user.user_metadata?.full_name === 'string' &&
            user.user_metadata.full_name.trim()) ||
          (typeof user.email === 'string' ? user.email.split('@')[0] : 'Faculty Mentor')

        const rawCode = typeof prof.mentor_code === 'string' ? prof.mentor_code.trim() : ''
        const resolvedCode =
          rawCode && !isUuidLike(rawCode)
            ? rawCode.toUpperCase()
            : `MTR-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

        if (!isMounted) return

        setMentorName(resolvedName)
        setMentorCode(resolvedCode)

        const dbRole =
          (typeof prof.role === 'string' ? prof.role.toLowerCase() : '') ||
          (typeof user.user_metadata?.role === 'string'
            ? user.user_metadata.role.toLowerCase()
            : 'mentor')

        if (dbRole === 'student') {
          router.replace('/dashboard/student')
          return
        }

        setMentorRoleBadge('Faculty Reviewer')

        queueMicrotask(() => {
          void loadMentorConversations(user.id, resolvedName)
        })
      } catch (err) {
        console.error('Exception during profile load:', err)
      }
    }

    void getMentorProfile()

    return () => {
      isMounted = false
    }
  }, [router, loadMentorConversations])

  useEffect(() => {
    if (!mentorUserId) return

    const channel = supabase
      .channel('realtime-mentor-header-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_feedback' }, () => {
        queueMicrotask(() => {
          void loadMentorConversations(mentorUserId, mentorName)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_students' }, () => {
        queueMicrotask(() => {
          void loadMentorConversations(mentorUserId, mentorName)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        queueMicrotask(() => {
          void loadMentorConversations(mentorUserId, mentorName)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        queueMicrotask(() => {
          void loadMentorConversations(mentorUserId, mentorName)
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mentorUserId, mentorName, loadMentorConversations])

  const totalUnreadCount = useMemo(
    () => teamGroups.reduce((sum, g) => sum + g.unreadCount, 0),
    [teamGroups]
  )

  const filteredTeams = useMemo(() => {
    return teamGroups.filter((g) => {
      const matchesTab = filterTab === 'all' ? true : g.unreadCount > 0
      if (!matchesTab) return false
      const q = searchQuery.trim().toLowerCase()
      if (!q) return true
      const memberMatch = g.members.some((m) => m.name.toLowerCase().includes(q))
      return (
        g.teamName.toLowerCase().includes(q) ||
        g.projectTitle.toLowerCase().includes(q) ||
        memberMatch
      )
    })
  }, [teamGroups, filterTab, searchQuery])

  const selectedTeam = useMemo(
    () => teamGroups.find((g) => g.key === activeTeamKey) || null,
    [teamGroups, activeTeamKey]
  )

  const activeThreadMessages = useMemo(() => {
    if (!selectedTeam) return []
    return allMessages.filter((m) => m.teamKey === selectedTeam.key)
  }, [allMessages, selectedTeam])

  const handleSelectTeam = (group: TeamConversationGroup) => {
    setActiveTeamKey(group.key)

    // Clear this team's badge immediately when its conversation is opened.
    setTeamGroups((prev) =>
      prev.map((item) =>
        item.key === group.key ? { ...item, unreadCount: 0 } : item
      )
    )

    const maxId = allMessages
      .filter((m) => m.teamKey === group.key)
      .reduce((acc, m) => Math.max(acc, m.rawIdNum), 0)

    if (maxId > 0) {
      const updated = {
        ...lastSeenByTeam,
        [group.key]: Math.max(lastSeenByTeam[group.key] || 0, maxId),
      }
      setLastSeenByTeam(updated)

      // Persist outside the state updater (avoids side effects in React updater).
      if (mentorUserId) {
        try {
          localStorage.setItem(
            `mentor_last_seen_${mentorUserId}`,
            JSON.stringify(updated)
          )
        } catch (error) {
          console.error('Failed to save read-message markers:', error)
        }
      }
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentorUserId || !selectedTeam || !replyText.trim() || sendingReply) return

    setSendingReply(true)
    try {
      const cleanBody = replyText.trim()
      const scopedText = `[LINK:${mentorUserId}|${selectedTeam.studentId}|${selectedTeam.projectId}|MENTOR_TO_STUDENT] ${cleanBody}`

      const { error } = await supabase.from('mentor_feedback').insert([
        {
          mentor_id: mentorUserId,
          student_id: selectedTeam.studentId,
          project_id: selectedTeam.projectId !== 'default' ? selectedTeam.projectId : null,
          mentor_name: mentorName,
          mentor_role: mentorRoleBadge,
          feedback_text: scopedText,
          comment: scopedText,
        },
      ])

      if (error) throw error

      setReplyText('')
      await loadMentorConversations(mentorUserId, mentorName)
    } catch (err) {
      console.error('Failed to send mentor reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const userId = session.user.id
        sessionStorage.removeItem(`active_profile_${userId}`)
        sessionStorage.removeItem(`active_member_name_${userId}`)
        sessionStorage.removeItem(`skip_profile_modal_${userId}`)
      }

      await supabase.auth.signOut()
      router.replace('/login')
    } catch (err) {
      console.error('Error signing out:', err)
      setIsSigningOut(false)
    }
  }

  const navItems = [
    { href: '/mentor', label: 'Overview Teams', icon: 'fa-chart-line', exact: true },
    { href: '/mentor/evaluation', label: 'Grading & Rubrics', icon: 'fa-clipboard-list' },
    { href: '/mentor/submissions', label: 'Student Submissions', icon: 'fa-folder-tree' },
    { href: '/mentor/competition-prep', label: 'Competition Control', icon: 'fa-trophy' },
    { href: '/mentor/teams', label: 'Team Management', icon: 'fa-users-gear' },
  ]

  const isActiveLink = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return Boolean(pathname?.startsWith(href))
  }

  return (
    <div
      className={`flex min-h-screen transition-colors duration-200 ${
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

        @keyframes bubblePopIn {
          0% {
            opacity: 0;
            transform: scale(0.25) translateY(-8px);
          }
          70% {
            opacity: 1;
            transform: scale(1.02) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes chatSlideIn {
          0% {
            opacity: 0;
            transform: translateX(28px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .animate-bubble-pop {
          transform-origin: top right;
          animation: bubblePopIn 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .animate-chat-slide {
          animation: chatSlideIn 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <aside
            className={`relative z-50 flex flex-col w-64 max-w-[80vw] border-r p-4 h-full overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-[#d8c3ad]'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/InnovaSeed-Logo.png"
                  alt="InnovaSeed Logo"
                  width={36}
                  height={36}
                  className="rounded-xl object-cover shadow-xs border border-amber-500/30 bg-amber-500/10"
                />
                <div>
                  <b className="text-sm">
                    InnovaSeed <span className="text-[#F59E0B]">Evaluator</span>
                  </b>
                  <p className="text-[10px] text-slate-400">Faculty Portal 2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-500"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <nav className="space-y-1 text-sm">
              {navItems.map((item) => {
                const active = isActiveLink(item.href, item.exact)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                      active
                        ? isDarkMode
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
                          : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
                        : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-[#534434] hover:bg-[#fff1e5]'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-4 text-center`}></i>
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div
              className={`mt-auto pt-4 border-t space-y-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
                  {mentorName.substring(0, 2).toUpperCase()}
                </span>
                <div className="text-xs leading-tight truncate">
                  <b className="truncate block">{mentorName}</b>
                  <p className="text-[10px] text-amber-600">{mentorCode || mentorRoleBadge}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSignOut()}
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
          </aside>
        </div>
      )}

      {/* Global Sidebar Khusus Mentor (Desktop) */}
      <aside
        className={`hidden lg:flex flex-col w-64 shrink-0 border-r p-4 sticky top-0 h-screen transition-colors overflow-y-auto ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#d8c3ad]'
        }`}
      >
        <div className="flex items-center gap-3 mb-5">
          <Image
            src="/InnovaSeed-Logo.png"
            alt="InnovaSeed Logo"
            width={40}
            height={40}
            className="rounded-xl object-cover shadow-xs border border-amber-500/30 bg-amber-500/10"
            priority
          />
          <div>
            <b className="text-[15px]">
              InnovaSeed <span className="text-[#F59E0B]">Evaluator</span>
            </b>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Faculty Portal 2026
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[10px]">
              <i className="fa-solid fa-chalkboard-user"></i> Faculty Console
            </span>
          </div>
          {mentorCode && (
            <div className="mt-2 font-mono font-bold text-[11px] text-amber-800">
              Code: {mentorCode}
            </div>
          )}
        </div>

        <nav className="space-y-1 text-sm">
          {navItems.map((item) => {
            const active = isActiveLink(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  active
                    ? isDarkMode
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
                      : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
                    : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-[#534434] hover:bg-[#fff1e5]'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center`}></i>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div
          className={`mt-auto pt-4 border-t space-y-3 ${
            isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center gap-3 pt-1">
            <span className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
              {mentorName.substring(0, 2).toUpperCase()}
            </span>
            <div className="text-sm leading-tight truncate">
              <b className="truncate block">{mentorName}</b>
              <p className="text-[11px] truncate font-medium text-amber-600">
                {mentorRoleBadge}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3.5 sticky top-0 z-20 transition-colors ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md'
              : 'bg-white/90 border-[#d8c3ad] backdrop-blur-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className={`lg:hidden p-2 rounded-xl border text-xs ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-[#d8c3ad] text-[#221a12]'
              }`}
            >
              <i className="fa-solid fa-bars"></i>
            </button>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Mentor Evaluation Console
            </span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto relative">
            <button
              type="button"
              onClick={() => {
                setChatOpen((prev) => {
                  const next = !prev
                  if (!next) setActiveTeamKey(null)
                  return next
                })
              }}
              aria-label="Toggle mentor team messages"
              className={`relative p-2 rounded-xl border text-xs font-bold transition-transform duration-150 active:scale-90 flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                chatOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
              }`}
            >
              <i className="fa-solid fa-message"></i>
              {totalUnreadCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold grid place-items-center leading-none">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#613b00] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              Faculty Mode Active
            </span>

            <button
              type="button"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
              }`}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              <span className="hidden xl:inline text-[11px]">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* Pop-up / Drawer Messages: Tahap 1 List Tim -> Tahap 2 Melebar & Geser ke Ruang Chat */}
            {chatOpen && (
              <div
                key={selectedTeam ? 'chat-expanded' : 'chat-compact'}
                className={`fixed top-16 right-4 sm:right-6 z-40 rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ease-out flex flex-col md:flex-row animate-bubble-pop ${
                  selectedTeam
                    ? 'w-[calc(100vw-2rem)] sm:w-205 max-w-205'
                    : 'w-[calc(100vw-2rem)] sm:w-88'
                } max-h-[78vh] ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-white border-[#d8c3ad] text-[#221a12]'
                }`}
              >
                {/* Kolom Kiri: Messages & List Tim */}
                <div
                  className={`flex flex-col ${
                    selectedTeam
                      ? `w-full md:w-76 shrink-0 border-b md:border-b-0 md:border-r ${
                          isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
                        }`
                      : 'w-full'
                  }`}
                >
                  <div
                    className={`p-3.5 border-b flex items-center justify-between gap-2 ${
                      isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">Messages</span>
                      {totalUnreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold">
                          {totalUnreadCount} unread
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChatOpen(false)
                        setActiveTeamKey(null)
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 cursor-pointer"
                      aria-label="Close messages panel"
                    >
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12]'
                      }`}
                    >
                      <i className="fa-solid fa-magnifying-glass text-slate-400 text-[11px]"></i>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search team or member..."
                        className="w-full bg-transparent outline-none text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setFilterTab('all')}
                        className={`px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          filterTab === 'all'
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-[#fff8f4] border-[#d8c3ad] text-[#534434]'
                        }`}
                      >
                        All Teams
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterTab('unread')}
                        className={`px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          filterTab === 'unread'
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-[#fff8f4] border-[#d8c3ad] text-[#534434]'
                        }`}
                      >
                        Unread
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                    {filteredTeams.length === 0 ? (
                      <div className="py-8 px-4 text-center text-xs text-slate-400">
                        No teams found for this filter.
                      </div>
                    ) : (
                      filteredTeams.map((group) => {
                        const isSelected = selectedTeam?.key === group.key
                        return (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() => handleSelectTeam(group)}
                            className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-amber-500/20 border border-amber-500/40'
                                  : 'bg-[#FEF3C7] border border-amber-500/40'
                                : isDarkMode
                                ? 'hover:bg-slate-800/80 border border-transparent'
                                : 'hover:bg-[#fff1e5] border border-transparent'
                            }`}
                          >
                            <span className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-600 font-bold text-xs grid place-items-center shrink-0 border border-amber-500/30">
                              {getInitials(group.teamName)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold truncate">
                                  {group.teamName}
                                </span>
                                {group.unreadCount > 0 && (
                                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold grid place-items-center shrink-0">
                                    {group.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {group.lastMessageText}
                              </p>
                            </div>
                            <i className="fa-solid fa-chevron-right text-[10px] text-slate-400 shrink-0"></i>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Kolom Kanan: Ruang Obrolan Tim (Muncul & Menggeser ke Kanan Saat Tim Diklik) */}
                {selectedTeam && (
                  <div
                    key={selectedTeam.key}
                    className="flex-1 flex flex-col min-w-0 min-h-85 animate-chat-slide"
                  >
                    <div
                      className={`p-3.5 border-b flex items-center justify-between gap-2 ${
                        isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold truncate">
                            {selectedTeam.teamName}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-bold truncate">
                            {selectedTeam.projectTitle}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {selectedTeam.members.map((member) => (
                            <span
                              key={member.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                member.isMentor
                                  ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                  : isDarkMode
                                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-[#fff8f4] text-[#534434] border-[#d8c3ad]'
                              }`}
                            >
                              {member.name}
                              <span className="opacity-70">({member.roleLabel})</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTeamKey(null)}
                        className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-500 cursor-pointer shrink-0"
                        title="Back to teams list"
                      >
                        <i className="fa-solid fa-compress text-xs"></i>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {activeThreadMessages.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                          No messages in this team thread yet. Send feedback below.
                        </div>
                      ) : (
                        activeThreadMessages.map((msg) => {
                          const isFromMentor = msg.direction === 'MENTOR_TO_STUDENT'
                          return (
                            <div
                              key={msg.id}
                              className={`flex items-end gap-2 ${
                                isFromMentor ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {!isFromMentor && (
                                <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-[10px] grid place-items-center shrink-0">
                                  {getInitials(msg.senderName)}
                                </span>
                              )}
                              <div
                                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs border ${
                                  isFromMentor
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-medium'
                                    : isDarkMode
                                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                                    : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <span className="text-[10px] font-extrabold opacity-85">
                                    {isFromMentor ? `You (${mentorName})` : msg.senderName}
                                  </span>
                                  {msg.createdAt && (
                                    <span className="text-[9px] opacity-70">
                                      {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                              </div>
                              {isFromMentor && (
                                <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 font-bold text-[10px] grid place-items-center shrink-0">
                                  {getInitials(mentorName)}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>

                    <form
                      onSubmit={handleSendReply}
                      className={`p-3 border-t flex items-center gap-2 ${
                        isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
                      }`}
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${selectedTeam.teamName}...`}
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-none ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12]'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyText.trim()}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-paper-plane"></i>
                        <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-275 flex-1">{children}</main>
      </div>
    </div>
  )
}

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MentorDashboardContent>{children}</MentorDashboardContent>
    </ThemeProvider>
  )
}