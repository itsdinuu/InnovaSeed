"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

type ProjectData = {
  id: string
  title: string
  subtitle?: string
  description?: string
  status?: string
  category?: string
  project_code?: string
}

type CompetitionData = {
  id: string | number
  title: string
  category?: string
  level?: string
  deadline?: string
}

type MentorFeedbackItem = {
  id: string | number
  mentor_name?: string
  mentor_role?: string
  comment: string
  rating?: number
  created_at?: string
}

export default function StudentDashboardPage() {
  const { isDarkMode } = useTheme()
  const [userName, setUserName] = useState('')
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [activeCompetition, setActiveCompetition] = useState<CompetitionData | null>(null)
  const [isEnrolledCompetition, setIsEnrolledCompetition] = useState(false)
  const [daysUntilDeadline, setDaysUntilDeadline] = useState<number | null>(null)
  const [latestFeedback, setLatestFeedback] = useState<MentorFeedbackItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // State data real & interaksi
  const [prototypeNotesCount, setPrototypeNotesCount] = useState(0)
  const [sampleId, setSampleId] = useState('V1.0 - Lab Test')
  const [experimentalMetric, setExperimentalMetric] = useState('')
  const [experimentalNote, setExperimentalNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Statistik Real-Time
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
  const [mentorRating, setMentorRating] = useState<{ score: number | string; count: number }>({
    score: 'No Review',
    count: 0,
  })
  const [readinessIndex, setReadinessIndex] = useState<{ percentage: number; statusText: string }>({
    percentage: 0,
    statusText: 'Pending',
  })

  const triggerToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  useEffect(() => {
    let isMounted = true

    async function initDashboard() {
      try {
        setLoading(true)

        // 1. Ambil sesi auth user yang sedang login
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          if (isMounted) setLoading(false)
          return
        }

        const user = session.user
        if (isMounted) setCurrentUserId(user.id)

        const resolvedName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split('@')[0] ||
          'Student'
        if (isMounted) setUserName(resolvedName)

        // 2. Prioritaskan proyek aktif yang sedang dikerjakan di tabel `projects` milik user
        let resolvedProject: ProjectData | null = null
        let rawActiveProjectRow: Record<string, unknown> | null = null

        const { data: projRecords } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (projRecords && projRecords.length > 0) {
          const userProjects = (projRecords as Record<string, unknown>[]).filter((row) => {
            const ownerVal = row.user_id ?? row.author_id ?? row.owner_id
            if (ownerVal === undefined || ownerVal === null) return true
            return String(ownerVal) === user.id
          })

          if (userProjects.length > 0) {
            const proj = userProjects[0]
            rawActiveProjectRow = proj
            const rawStatus = (proj.status ?? proj.approval_status ?? 'PROTOTYPE ACTIVE') as string
            resolvedProject = {
              id: String(proj.id),
              title: String(proj.title ?? 'Untitled Project'),
              subtitle: proj.subtitle as string | undefined,
              description:
                (proj.description as string | undefined) ||
                (proj.problem_statement as string | undefined) ||
                (proj.subtitle as string | undefined) ||
                'Active innovation prototype build phase in progress.',
              status: rawStatus.toUpperCase(),
              category:
                (proj.category as string | undefined) ||
                (proj.research_field as string | undefined) ||
                'Applied Sciences & Engineering',
              project_code: proj.project_code as string | undefined,
            }
          }
        }

        // Fallback ke `ideas` hanya jika belum ada proyek di `projects`
        if (!resolvedProject) {
          const { data: ideaRecords } = await supabase
            .from('ideas')
            .select('*')
            .eq('author_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (ideaRecords && ideaRecords.length > 0) {
            const idea = ideaRecords[0]
            rawActiveProjectRow = idea as Record<string, unknown>
            resolvedProject = {
              id: String(idea.id),
              title: String(idea.title ?? 'Untitled Idea'),
              description:
                idea.problem_statement ||
                idea.description ||
                'Active innovation prototype build phase in progress.',
              status: idea.status ? String(idea.status).toUpperCase() : 'IDEA ACTIVE',
              category:
                idea.research_field || idea.category || 'Applied Sciences & Engineering',
            }
          }
        }

        if (isMounted) {
          setProjectData(resolvedProject)
        }

        // 3. Ambil jumlah catatan prototipe asli dari `prototype_notes` untuk proyek aktif
        let notesCount = 0
        if (resolvedProject) {
          const { data: notesData } = await supabase
            .from('prototype_notes')
            .select('id')
            .eq('project_id', resolvedProject.id)
            .eq('author_id', user.id)

          notesCount = notesData ? notesData.length : 0
          if (isMounted) setPrototypeNotesCount(notesCount)
        }

        // 4. Ambil task stats asli dari `project_tasks` (filter proyek aktif jika ada)
        let tasksQuery = supabase
          .from('project_tasks')
          .select('status, project_id')
          .eq('user_id', user.id)

        if (resolvedProject) {
          tasksQuery = tasksQuery.eq('project_id', resolvedProject.id)
        }

        const { data: tasksData } = await tasksQuery

        let calcTotal = 0
        let calcCompleted = 0
        if (tasksData && tasksData.length > 0) {
          calcTotal = tasksData.length
          calcCompleted = tasksData.filter(
            (t) =>
              t.status === 'Completed' ||
              t.status === 'completed' ||
              t.status === 'done' ||
              t.status === 'Done'
          ).length
          if (isMounted) setTaskStats({ total: calcTotal, completed: calcCompleted })
        }

        const taskPercent = calcTotal > 0 ? Math.round((calcCompleted / calcTotal) * 100) : 0
        const logBonus = Math.min(notesCount * 5, 20)
        const finalReadiness = Math.min(taskPercent + logBonus, 100)

        if (isMounted) {
          setReadinessIndex({
            percentage: finalReadiness,
            statusText: finalReadiness >= 80 ? 'Ready' : finalReadiness > 0 ? 'In Progress' : 'Pending',
          })
        }

        // 5. Ambil rating & ulasan mentor asli dari `mentor_feedback`
        const { data: feedbackData } = await supabase
          .from('mentor_feedback')
          .select('*')
          .order('created_at', { ascending: false })

        if (isMounted && feedbackData && feedbackData.length > 0) {
          const relevantFeedback = (feedbackData as Record<string, unknown>[]).filter((fb) => {
            if (fb.student_id && String(fb.student_id) !== user.id) return false
            if (resolvedProject && fb.project_id && String(fb.project_id) !== resolvedProject.id) {
              return false
            }
            return true
          })

          const listToUse =
            relevantFeedback.length > 0
              ? relevantFeedback
              : (feedbackData as Record<string, unknown>[])

          const ratedItems = listToUse.filter((fb) => typeof fb.rating === 'number' && fb.rating > 0)
          if (ratedItems.length > 0) {
            const totalScore = ratedItems.reduce((acc, curr) => acc + Number(curr.rating || 0), 0)
            const avgScore = Number((totalScore / ratedItems.length).toFixed(1))
            setMentorRating({ score: avgScore, count: ratedItems.length })
          }

          const latest = listToUse[0]
          if (latest) {
            setLatestFeedback({
              id: (latest.id as string | number) ?? 1,
              mentor_name: (latest.mentor_name as string | undefined) || 'Mentor Advisor',
              mentor_role: (latest.mentor_role as string | undefined) || 'Innovation Reviewer',
              comment: String(
                latest.feedback_text ??
                  latest.comment ??
                  latest.message ??
                  'Keep updating your prototype logs and milestone tasks.'
              ),
              rating: latest.rating as number | undefined,
              created_at: latest.created_at as string | undefined,
            })
          }
        }

        // 6. Ambil dari tabel `competitions` (kolom `deadline` adalah hari terakhir pendaftaran/submit)
        const { data: allCompetitions } = await supabase
          .from('competitions')
          .select('*')
          .order('deadline', { ascending: true })

        const compRows = (allCompetitions || []) as Record<string, unknown>[]
        const linkedCompetitionId =
          (rawActiveProjectRow?.competition_id as string | number | undefined) ??
          (rawActiveProjectRow?.target_competition_id as string | number | undefined)

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayStartMs = todayStart.getTime()

        const parsedComps = compRows.map((row, idx) => {
          const deadlineStr = row.deadline as string | undefined
          const deadlineEndOfDayMs = deadlineStr
            ? new Date(`${deadlineStr.split('T')[0]}T23:59:59`).getTime()
            : NaN

          const ownerVal = row.user_id ?? row.author_id ?? row.student_id
          const isOwnerMatch =
            ownerVal !== undefined && ownerVal !== null && String(ownerVal) === user.id
          const isProjectMatch =
            linkedCompetitionId !== undefined &&
            linkedCompetitionId !== null &&
            String(row.id) === String(linkedCompetitionId)

          return {
            id: (row.id as string | number) ?? idx + 1,
            title: String(row.title ?? row.name ?? 'Innovation Competition'),
            category:
              (row.category as string | undefined) ||
              (row.field as string | undefined) ||
              (row.track as string | undefined),
            level: (row.level as string | undefined) || 'National',
            deadline: deadlineStr,
            deadlineEndOfDayMs,
            isJoined: isOwnerMatch || isProjectMatch,
          }
        })

        // Prioritas 1: Kompetisi yang diikuti user / terhubung ke proyek aktif
        const joinedComps = parsedComps.filter((c) => c.isJoined)
        // Prioritas 2: Kompetisi yang masih buka (hari ini <= deadline) dan deadline-nya paling dekat
        const openUpcomingComps = parsedComps
          .filter((c) => !Number.isNaN(c.deadlineEndOfDayMs) && c.deadlineEndOfDayMs >= todayStartMs)
          .sort((a, b) => a.deadlineEndOfDayMs - b.deadlineEndOfDayMs)

        const selectedComp =
          joinedComps[0] ?? openUpcomingComps[0] ?? parsedComps[0] ?? null

        if (isMounted) {
          if (selectedComp) {
            setActiveCompetition({
              id: selectedComp.id,
              title: selectedComp.title,
              category: selectedComp.category,
              level: selectedComp.level,
              deadline: selectedComp.deadline,
            })
            setIsEnrolledCompetition(selectedComp.isJoined)

            if (!Number.isNaN(selectedComp.deadlineEndOfDayMs)) {
              const diffDays = Math.max(
                0,
                Math.ceil((selectedComp.deadlineEndOfDayMs - Date.now()) / (1000 * 60 * 60 * 24))
              )
              setDaysUntilDeadline(diffDays)
            } else {
              setDaysUntilDeadline(null)
            }
          } else {
            setActiveCompetition(null)
            setIsEnrolledCompetition(false)
            setDaysUntilDeadline(null)
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void initDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  // Simpan entri Quick Lab Logger langsung ke `prototype_notes` proyek aktif
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !projectData) {
      triggerToast('No active project found to attach lab log.')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.from('prototype_notes').insert([
        {
          project_id: projectData.id,
          author_id: currentUserId,
          version_tag: sampleId.trim() || 'V1.0 - Quick Lab Test',
          status: 'working_well',
          what_was_tested: experimentalMetric.trim() || 'Quick experimental parameter check',
          observations_issues: experimentalNote.trim() || null,
          next_steps: null,
          evidence_url: null,
          is_review_requested: false,
        },
      ])

      if (error) throw error

      setPrototypeNotesCount((prev) => prev + 1)
      setExperimentalMetric('')
      setExperimentalNote('')
      triggerToast('Lab entry saved directly to Prototype Notes!')
    } catch (err: unknown) {
      console.error(err)
      triggerToast('Failed to commit entry to Prototype Notes.')
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercentage =
    taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0

  const completedPrepSteps =
    (prototypeNotesCount > 0 ? 1 : 0) +
    (taskStats.completed > 0 ? 1 : 0) +
    (readinessIndex.percentage >= 50 ? 1 : 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading your innovator dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs transition-colors ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {userName} 👋
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Sprint Validation &amp; Pre-Competition Benchmarking •{' '}
            <span className="text-amber-500 font-bold">InnovaSeed Active Session</span>
          </p>
        </div>

        <div
          className={`flex items-center gap-2 self-start md:self-auto px-3 py-2 rounded-xl border shadow-xs ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <i className="fa-solid fa-flag-checkered text-amber-500 text-lg"></i>
          <div className="flex flex-col text-left text-xs">
            <span className="text-slate-400">
              {isEnrolledCompetition ? 'Joined Competition' : 'Open Competition'}
            </span>
            <span className="font-bold text-amber-500">
              {activeCompetition ? activeCompetition.title : 'Check Competition Hub'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Active Project</span>
            <i className="fa-solid fa-lightbulb text-amber-500"></i>
          </div>
          <div className="mt-2">
            <h3 className="text-base font-bold truncate">
              {projectData ? projectData.title : 'No Project Active'}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-500 font-medium truncate">
                {projectData ? projectData.category || 'Workspace Active' : 'Go to Workspace'}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Milestone Completion</span>
            <i className="fa-solid fa-chart-pie text-amber-500"></i>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{progressPercentage}%</h3>
              <span className="text-xs text-slate-400">
                ({taskStats.completed}/{taskStats.total} Complete)
              </span>
            </div>
            <div
              className={`w-full rounded-full h-2 mt-2 overflow-hidden ${
                isDarkMode ? 'bg-slate-800' : 'bg-[#fff1e5]'
              }`}
            >
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div
          className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Mentor Rating</span>
            <i className="fa-solid fa-star text-amber-500"></i>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{mentorRating.score}</h3>
              {typeof mentorRating.score === 'number' && (
                <span className="text-xs text-slate-400">/ 5.0</span>
              )}
            </div>
            <span className="text-xs text-slate-400 block mt-1">
              {mentorRating.count > 0
                ? `${mentorRating.count} Recent endorsements`
                : 'Awaiting mentor review'}
            </span>
          </div>
        </div>

        <div
          className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Readiness Index</span>
            <i className="fa-solid fa-gauge-high text-amber-500"></i>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{readinessIndex.percentage}%</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                {readinessIndex.statusText}
              </span>
            </div>
            <span className="text-xs text-amber-500 block mt-1 font-semibold">
              Based on tasks &amp; prototype logs
            </span>
          </div>
        </div>
      </div>

      {/* Active Project Card & Competition Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Project Card */}
        <div
          className={`lg:col-span-8 rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-inherit">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {projectData ? projectData.status || 'PROTOTYPE ACTIVE' : 'No Active Project'}
                  </span>
                  <span className="text-xs text-slate-400">Owner: {userName}</span>
                </div>
                <h2 className="text-xl font-bold mt-2">
                  {projectData ? projectData.title : 'No Project Active in Workspace'}
                </h2>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  {projectData
                    ? projectData.description || projectData.subtitle
                    : 'Create a project in Project Workspace or promote an idea from Idea Bank to start.'}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/5 text-amber-600 border border-amber-500/20 font-semibold shrink-0">
                {prototypeNotesCount} Prototype Logs
              </span>
            </div>

            {!projectData ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 grid place-items-center text-lg border border-amber-500/30">
                  <i className="fa-solid fa-lightbulb"></i>
                </div>
                <h3 className="font-bold text-sm">No Active Project Found for {userName}</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Start a project in Project Workspace or pick an idea from Idea Bank to activate your dashboard.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Link
                    href="/dashboard/workspace"
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm inline-flex items-center gap-2"
                  >
                    <span>Open Workspace</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                  <Link
                    href="/dashboard/idea-bank"
                    className={`px-4 py-2 border rounded-xl text-xs font-medium transition ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'border-[#d8c3ad] bg-[#fff8f4] hover:bg-[#fbebdd]'
                    }`}
                  >
                    Go to Idea Bank
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="py-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold">Milestone Roadmap Progress</span>
                    <span className="text-amber-500 font-bold">{progressPercentage}% Completed</span>
                  </div>
                  <div
                    className={`w-full rounded-full h-3 overflow-hidden ${
                      isDarkMode ? 'bg-slate-800' : 'bg-[#fff1e5]'
                    }`}
                  >
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
                  <div
                    className={`p-3 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff1e5]/50 border-[#d8c3ad]'
                    }`}
                  >
                    <span className="text-xs text-slate-400">Category / Track</span>
                    <p className="text-sm font-bold mt-0.5 truncate">
                      {projectData.category || 'Applied Sciences'}
                    </p>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Workspace Verified
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff1e5]/50 border-[#d8c3ad]'
                    }`}
                  >
                    <span className="text-xs text-slate-400">Kanban Tasks</span>
                    <p className="text-sm font-bold mt-0.5">
                      {taskStats.completed} of {taskStats.total} Done
                    </p>
                    <span className="text-[11px] text-slate-400">Cloud Synced</span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff1e5]/50 border-[#d8c3ad]'
                    }`}
                  >
                    <span className="text-xs text-slate-400">Project Reference</span>
                    <p className="text-sm font-bold mt-0.5 truncate font-mono">
                      {projectData.project_code || `#${projectData.id.slice(0, 8)}`}
                    </p>
                    <span className="text-[11px] text-amber-500 font-bold">Supabase Active</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {projectData && (
            <div className="flex items-center justify-between pt-4 border-t border-inherit mt-4">
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/workspace"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm inline-flex items-center gap-2"
                >
                  <span>Open Workspace</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </Link>
                <Link
                  href="/dashboard/notes"
                  className={`px-4 py-2 border rounded-xl text-xs font-medium transition ${
                    isDarkMode
                      ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'border-[#d8c3ad] bg-[#fff8f4] hover:bg-[#fbebdd]'
                  }`}
                >
                  Prototype Notes
                </Link>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline-block">
                InnovaSeed v2 Workspace
              </span>
            </div>
          )}
        </div>

        {/* Competition Countdown Widget */}
        <div className="lg:col-span-4 bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-trophy text-amber-400 text-lg"></i>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  {isEnrolledCompetition ? 'JOINED COMPETITION' : 'OPEN COMPETITION'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px]">
                {isEnrolledCompetition
                  ? 'Joined'
                  : activeCompetition?.level || 'Open Now'}
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-base font-bold text-white">
                {activeCompetition ? activeCompetition.title : 'No Active Competition'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCompetition?.category ||
                  (isEnrolledCompetition
                    ? 'Active Competition Track'
                    : 'Closest deadline currently open')}
              </p>
            </div>

            <div className="mt-4 p-3 bg-black/40 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">
                {activeCompetition?.deadline
                  ? `Closes On: ${new Date(activeCompetition.deadline).toLocaleDateString('id-ID', {
                      dateStyle: 'medium',
                    })}`
                  : 'Check Competition Hub for Schedule'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-lg font-bold text-amber-400 block">
                    {daysUntilDeadline !== null ? daysUntilDeadline : '-'}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase">Days Left</span>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-lg font-bold text-amber-400 block">
                    {prototypeNotesCount}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase">Lab Logs Ready</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-300 mb-1">
                <span>Requirements</span>
                <span className="text-amber-400">
                  {activeCompetition ? `${completedPrepSteps} / 3 Ready` : '0 / 3 Ready'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <i
                  className={`fa-solid fa-circle-check text-xs ${
                    taskStats.completed > 0 ? 'text-amber-400' : 'text-slate-600'
                  }`}
                ></i>{' '}
                Abstract &amp; Executive Summary
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <i
                  className={`fa-solid fa-circle-check text-xs ${
                    prototypeNotesCount > 0 ? 'text-amber-400' : 'text-slate-600'
                  }`}
                ></i>{' '}
                Signed Digital Lab Notebook
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <i
                  className={`fa-solid fa-circle-check text-xs ${
                    readinessIndex.percentage >= 50 ? 'text-amber-400' : 'text-slate-600'
                  }`}
                ></i>{' '}
                Pitch Deck &amp; Jury Q&amp;A Prep
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link
              href="/dashboard/competition-prep"
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>Competition Guidelines &amp; Rubric</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Mentor Feedback & Quick Lab Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mentor Feedback */}
        <div
          className={`lg:col-span-6 rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-comments text-amber-500"></i>
                <h3 className="text-sm font-bold">Mentor Feedback &amp; Updates</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/30">
                {latestFeedback ? 'Synced' : 'No Notes'}
              </span>
            </div>

            {latestFeedback ? (
              <div className="flex items-start gap-3 mt-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center shrink-0 border border-amber-500/30">
                  {(latestFeedback.mentor_name || 'M').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold">{latestFeedback.mentor_name}</h4>
                      <span className="text-slate-400 text-[11px]">{latestFeedback.mentor_role}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {latestFeedback.created_at
                        ? new Date(latestFeedback.created_at).toLocaleDateString('id-ID', {
                            dateStyle: 'medium',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                  <div
                    className={`mt-2 p-3 rounded-xl border-l-4 border-amber-500 text-xs ${
                      isDarkMode ? 'bg-slate-800/60' : 'bg-[#fff1e5]'
                    }`}
                  >
                    <p className="italic">&quot;{latestFeedback.comment}&quot;</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No mentor feedback recorded yet. Request a review from your Prototype Notes page.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-inherit mt-4">
            <Link
              href="/dashboard/mentor-feedback"
              className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm"
            >
              Review Feedback
            </Link>
            <Link
              href="/dashboard/notes"
              className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-[#d8c3ad] bg-[#fff8f4] hover:bg-[#fbebdd]'
              }`}
            >
              Request Mentor Review
            </Link>
          </div>
        </div>

        {/* Quick Lab Notebook Logger Widget */}
        <div
          className={`lg:col-span-6 rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <span className="text-sm font-bold">Quick Lab Logger</span>
              <i className="fa-solid fa-flask-vial text-amber-500"></i>
            </div>

            <form onSubmit={handleAddLog} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Iteration / Version Tag</label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">What Was Tested / Metric</label>
                <input
                  type="text"
                  value={experimentalMetric}
                  onChange={(e) => setExperimentalMetric(e.target.value)}
                  required
                  placeholder="e.g. LCD I2C & RTC relay schedule test"
                  className={`w-full px-3 py-2 rounded-xl outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Observations &amp; Notes</label>
                <textarea
                  value={experimentalNote}
                  onChange={(e) => setExperimentalNote(e.target.value)}
                  placeholder="Record observations or issues found..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl outline-none border resize-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting || !projectData}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>
                  {submitting ? 'Committing...' : 'Save Entry to Prototype Notes'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}