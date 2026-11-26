"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type MentorChecklistItem = {
  id: string
  competitionId: string
  competitionTitle: string
  title: string
  category: string
  dueDate?: string | null
  instructions?: string | null
  isCompleted: boolean
}

const LS_PREP_ITEMS = 'innovaseed_prep_items_v2'
const PLEGO_MENTORSHIP_URL =
  process.env.NEXT_PUBLIC_PLEGO_MENTORSHIP_URL ||
  'https://lynk.id/plegoindonesia/k829lkgw9g2d'

const MENTORSHIP_STAGES = [
  {
    step: '01',
    label: 'Idea',
    focus: 'Define problem statement, target users, and innovation angle.',
  },
  {
    step: '02',
    label: 'Research',
    focus: 'Validate evidence, references, and feasibility with mentor guidance.',
  },
  {
    step: '03',
    label: 'Prototype',
    focus: 'Build working demo, core features, or testable solution model.',
  },
  {
    step: '04',
    label: 'Presentation',
    focus: 'Structure clear storytelling, visuals, and key impact metrics.',
  },
  {
    step: '05',
    label: 'Pitching',
    focus: 'Deliver confident pitch and prepare sharp answers for jury Q&A.',
  },
] as const

function buildMentorshipUrl(competitionTitle?: string): string {
  try {
    const url = new URL(PLEGO_MENTORSHIP_URL)
    if (competitionTitle && competitionTitle.trim()) {
      url.searchParams.set('competition', competitionTitle.trim())
    }
    return url.toString()
  } catch {
    return PLEGO_MENTORSHIP_URL
  }
}

export default function CompetitionPrepPage() {
  const { isDarkMode } = useTheme()

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [viewerRole, setViewerRole] = useState<string>('student')
  const [studentName, setStudentName] = useState<string>('Student')
  const [teamName, setTeamName] = useState<string>('')
  const [todayLabel, setTodayLabel] = useState<string>('')

  const [checklistItems, setChecklistItems] = useState<MentorChecklistItem[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

    queueMicrotask(() => {
      if (active) {
        setTodayLabel(formattedDate)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const notify = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const loadPrepWorkspace = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const activeUserId: string | null = session?.user?.id ?? null
    const emailLower = (session?.user?.email || '').trim().toLowerCase()

    let resolvedRole =
      typeof session?.user?.user_metadata?.role === 'string' &&
      session.user.user_metadata.role.trim()
        ? session.user.user_metadata.role.trim().toLowerCase()
        : 'student'

    let resolvedStudent =
      typeof session?.user?.user_metadata?.full_name === 'string' &&
      session.user.user_metadata.full_name.trim()
        ? session.user.user_metadata.full_name.trim()
        : session?.user?.email
        ? session.user.email.split('@')[0]
        : 'Student'

    let resolvedTeamName = ''

    if (activeUserId) {
      const [{ data: teamsRes }, { data: membersRes }, { data: profilesRes }] =
        await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('team_members').select('*'),
          supabase.from('profiles').select('*'),
        ])

      const profilesList = (Array.isArray(profilesRes) ? profilesRes : []) as Record<
        string,
        unknown
      >[]
      const meProfile = profilesList.find((p) => String(p.id) === activeUserId)
      if (meProfile) {
        if (typeof meProfile.role === 'string' && meProfile.role.trim()) {
          resolvedRole = meProfile.role.trim().toLowerCase()
        }
        const pName =
          typeof meProfile.full_name === 'string' && meProfile.full_name.trim()
            ? meProfile.full_name.trim()
            : typeof meProfile.name === 'string' && meProfile.name.trim()
            ? meProfile.name.trim()
            : ''
        if (pName) resolvedStudent = pName
      }

      const teamsList = (Array.isArray(teamsRes) ? teamsRes : []) as Record<string, unknown>[]
      const membersList = (Array.isArray(membersRes) ? membersRes : []) as Record<
        string,
        unknown
      >[]

      if (resolvedRole !== 'mentor') {
        const matchedMember = membersList.find((m) => {
          const mId = String(m.user_id ?? m.student_id ?? m.member_id ?? m.profile_id ?? '')
          const mEmail = typeof m.email === 'string' ? m.email.trim().toLowerCase() : ''
          const mName = typeof m.name === 'string' ? m.name.trim().toLowerCase() : ''
          return (
            (mId && mId === activeUserId) ||
            (emailLower && mEmail && mEmail === emailLower) ||
            (resolvedStudent && mName && mName === resolvedStudent.toLowerCase())
          )
        })

        const matchedTeam =
          (matchedMember?.team_id
            ? teamsList.find((t) => String(t.id) === String(matchedMember.team_id))
            : null) ||
          teamsList.find((t) => {
            const lead = String(t.lead_id ?? t.leader_id ?? t.user_id ?? t.student_id ?? '')
            return lead && lead === activeUserId
          }) ||
          null

        if (matchedTeam) {
          resolvedTeamName = String(
            (typeof matchedTeam.team_name === 'string' && matchedTeam.team_name.trim()) ||
              (typeof matchedTeam.name === 'string' && matchedTeam.name.trim()) ||
              ''
          )
        }
      }
    }

    setViewerRole(resolvedRole)
    setStudentName(resolvedStudent)
    setTeamName(resolvedTeamName)

    const mapPrepRow = (
      r: Record<string, unknown>,
      idx: number,
      prefix: string
    ): MentorChecklistItem => {
      const cId = String(r.competition_id ?? r.competitionId ?? '')
      const cTitle = String(
        r.competition_title ??
          r.competitionTitle ??
          r.competition_name ??
          'General Competition Prep'
      )
      const statusRaw = String(r.status || '').toLowerCase()
      const completed =
        Boolean(r.is_completed ?? r.isCompleted) ||
        statusRaw === 'completed' ||
        statusRaw === 'done'

      return {
        id: r.id ? String(r.id) : `${prefix}-${idx}`,
        competitionId: cId,
        competitionTitle: cTitle,
        title: String(r.title ?? r.material_title ?? 'Preparation Deliverable'),
        category: String(r.category ?? r.track ?? 'Mentor Checklist'),
        dueDate: r.due_date ?? r.dueDate ? String(r.due_date ?? r.dueDate) : null,
        instructions:
          r.notes ?? r.description ?? r.instructions
            ? String(r.notes ?? r.description ?? r.instructions)
            : null,
        isCompleted: completed,
      }
    }

    let loadedChecklist: MentorChecklistItem[] = []

    const { data: prepRows, error: prepError } = await supabase
      .from('competition_prep_materials')
      .select('*')

    if (!prepError && Array.isArray(prepRows) && prepRows.length > 0) {
      loadedChecklist = prepRows
        .filter((raw) => {
          const r = (raw || {}) as Record<string, unknown>
          // Pairing gate: students only see checklists assigned to THEM by their
          // paired mentor (student_id column on competition_prep_materials)
          const assignedStudent = String(
            r.student_id ?? r.studentId ?? r.assigned_student_id ?? r.target_student_id ?? ''
          )
          return assignedStudent && assignedStudent === activeUserId
        })
        .map((raw, idx) => mapPrepRow((raw || {}) as Record<string, unknown>, idx, 'mentor-prep'))
    } else {
      try {
        const rawLsPrep = localStorage.getItem(LS_PREP_ITEMS)
        if (rawLsPrep) {
          const parsedLs = JSON.parse(rawLsPrep) as Record<string, unknown>[]
          if (Array.isArray(parsedLs) && parsedLs.length > 0) {
            loadedChecklist = parsedLs.map((r, idx) =>
              mapPrepRow(r || {}, idx, 'ls-prep')
            )
          }
        }
      } catch {
        // Ignore localStorage parse error
      }
    }

    setChecklistItems(loadedChecklist)
    setIsLoading(false)
    setIsRefreshing(false)
  }, [])

  const subscribePrepRealtime = useCallback(() => {
    const channel = supabase
      .channel('student-competition-prep-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_prep_materials' },
        (payload) => {
          void loadPrepWorkspace(true)
          if (payload.eventType === 'INSERT') {
            notify('New preparation checklist assigned by your mentor!')
          } else if (payload.eventType === 'UPDATE') {
            notify('Mentor checklist updated in real time.')
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadPrepWorkspace, notify])

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (active) {
        void loadPrepWorkspace(false)
      }
    })

    const unsubscribe = subscribePrepRealtime()

    return () => {
      active = false
      unsubscribe()
    }
  }, [loadPrepWorkspace, subscribePrepRealtime])

  const handleToggleChecklist = async (item: MentorChecklistItem) => {
    const nextCompleted = !item.isCompleted
    const nextList = checklistItems.map((c) =>
      c.id === item.id ? { ...c, isCompleted: nextCompleted } : c
    )
    setChecklistItems(nextList)

    try {
      localStorage.setItem(
        LS_PREP_ITEMS,
        JSON.stringify(
          nextList.map((c) => ({
            ...c,
            status: c.isCompleted ? 'completed' : 'todo',
          }))
        )
      )
    } catch {
      // Ignore localStorage error
    }

    if (!item.id.startsWith('ls-prep-') && !item.id.startsWith('mentor-prep-')) {
      await supabase
        .from('competition_prep_materials')
        .update({
          status: nextCompleted ? 'completed' : 'todo',
        })
        .eq('id', item.id)
    }

    notify(
      nextCompleted
        ? `Checked off "${item.title}"!`
        : `Unchecked "${item.title}".`
    )
  }

  const completedCount = checklistItems.filter((i) => i.isCompleted).length
  const totalCount = checklistItems.length
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const headerContextBadge =
    viewerRole === 'mentor'
      ? `${studentName} • Mentor View`
      : teamName
      ? `${studentName} • ${teamName}`
      : studentName

  const featuredCompetitionTitle = checklistItems[0]?.competitionTitle || ''
  const ctaHref = buildMentorshipUrl(featuredCompetitionTitle)

  return (
    <div className="mo-stagger w-full max-w-full overflow-x-hidden space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-500">
            <span>
              <i className="fa-solid fa-clipboard-check mr-1"></i> PLEGO Competition Prep
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-normal normal-case bg-amber-500/15 text-amber-600 border border-amber-500/30">
              {headerContextBadge}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] tracking-normal normal-case bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 wrap-break-words">
            Competition Prep Checklist
          </h1>
          <p
            className={`text-xs mt-1 leading-relaxed wrap-break-words ${
              isDarkMode ? 'text-slate-400' : 'text-[#534434]'
            }`}
          >
            Track your preparation deliverables and follow PLEGO&apos;s mentorship flow from
            idea to research, prototype, presentation, and pitching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => void loadPrepWorkspace(true)}
            disabled={isRefreshing}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border flex items-center gap-1.5 shadow-sm transition cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff8f4]'
            }`}
          >
            <i
              className={`fa-solid fa-rotate text-amber-500 ${
                isRefreshing ? 'fa-spin' : ''
              }`}
            ></i>
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {todayLabel && (
            <div
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 shadow-sm ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-400'
                  : 'bg-white border-[#d8c3ad] text-[#855300]'
              }`}
            >
              <i className="fa-regular fa-calendar-check text-amber-500"></i>
              <span>{todayLabel}</span>
            </div>
          )}

          <div
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-3 shadow-sm ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <i className="fa-solid fa-list-check text-amber-500"></i>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Checklist Progress
              </div>
              <div className="text-xs font-extrabold text-amber-500">
                {completedCount} of {totalCount} Completed ({progressPercent}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paid Mentorship CTA Banner */}
      <div
        className={`rounded-2xl border p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDarkMode
            ? 'bg-slate-900 border-amber-500/30 text-slate-100'
            : 'bg-[#fffcf9] border-amber-400/70 text-[#221a12]'
        }`}
      >
        <div className="space-y-1 min-w-0 flex-1">
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
            PLEGO Mentorship Program
          </span>
          <h2 className="text-base font-extrabold wrap-break-words">
            Idea → Research → Prototype → Presentation → Pitching
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed wrap-break-words">
            Want structured mentor guidance for your competition? Request PLEGO mentorship
            directly to get guided support across every stage.
          </p>
        </div>

        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition shadow-sm inline-flex items-center justify-center gap-2 shrink-0"
        >
          <span>Get Mentored for This Competition</span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
        </a>
      </div>

      {/* 5-Stage Mentorship Roadmap */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 shadow-sm space-y-4 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <i className="fa-solid fa-route text-amber-500"></i> Competition Preparation Flow
          </h3>
          <span className="text-[11px] text-slate-400">
            End-to-end mentorship stages
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {MENTORSHIP_STAGES.map((stage) => (
            <div
              key={stage.step}
              className={`rounded-xl border p-3.5 space-y-1.5 ${
                isDarkMode
                  ? 'bg-slate-800/50 border-slate-700'
                  : 'bg-[#fffcf9] border-[#d8c3ad]'
              }`}
            >
              <div className="text-[10px] font-extrabold text-amber-500">
                STAGE {stage.step}
              </div>
              <div className="text-xs font-extrabold">{stage.label}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{stage.focus}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Items */}
      {isLoading ? (
        <div
          className={`w-full rounded-2xl border p-12 text-center text-xs text-slate-400 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          Loading preparation checklist...
        </div>
      ) : checklistItems.length === 0 ? (
        <div
          className={`w-full rounded-2xl border p-6 sm:p-8 text-center space-y-3 shadow-sm ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <i className="fa-solid fa-list-check text-2xl text-amber-500"></i>
          <h3 className="text-sm font-extrabold wrap-break-words">
            No Checklist Items Assigned Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed wrap-break-words">
            Once your <b>paired mentor</b> assigns preparation deliverables, they will appear
            here automatically. Not paired yet? Get mentored by PLEGO using the button above.
          </p>
        </div>
      ) : (
        <div
          className={`w-full rounded-2xl border p-5 sm:p-6 shadow-sm space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <i className="fa-solid fa-square-check text-amber-500"></i> Mentor Preparation
              Checklist
            </h3>
            <span className="text-[11px] text-slate-400">
              Click an item to mark it complete as your team prepares
            </span>
          </div>

          <div className="space-y-3">
            {checklistItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleToggleChecklist(item)}
                className={`w-full text-left p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 ${
                  item.isCompleted
                    ? isDarkMode
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-300'
                      : 'bg-emerald-50/70 border-emerald-300 text-[#221a12]'
                    : isDarkMode
                    ? 'bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12] hover:bg-[#fbebdd]'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                    item.isCompleted
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : isDarkMode
                      ? 'border-slate-600 bg-slate-900'
                      : 'border-[#d8c3ad] bg-white'
                  }`}
                >
                  {item.isCompleted && <i className="fa-solid fa-check text-[10px]"></i>}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-xs font-extrabold wrap-break-words ${
                        item.isCompleted ? 'line-through opacity-75' : ''
                      }`}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600">
                        {item.category}
                      </span>
                      {item.dueDate && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Due {item.dueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-amber-600 wrap-break-words">
                    {item.competitionTitle}
                  </div>

                  {item.instructions && (
                    <p className="text-xs text-slate-400 leading-relaxed pt-0.5 wrap-break-words">
                      {item.instructions}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}