"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type PrototypeLogItem = {
  id: string
  versionTag: string
  status: string
  whatWasTested: string
  observationsIssues: string
  nextSteps: string
  isReviewRequested: boolean
}

type ThreadNoteItem = {
  id: string | number
  sender: string
  text: string
  createdAt?: string
  isFromStudent: boolean
}

type ProjectSummaryItem = {
  id: string
  studentId: string
  teamName: string
  institution: string
  projectId: string | null
  projectCode: string
  projectTitle: string
  projectSubtitle: string
  sprintName: string
  stageLabel: string
  approvalStatus: string
  progressPercent: number
  completedMilestones: number
  totalMilestones: number
  prototypeAttemptCount: number
  prototypeLogs: PrototypeLogItem[]
  threadNotes: ThreadNoteItem[]
}

const STAGE_OPTIONS = [
  'Ideation',
  'In Progress',
  'Prototype Testing',
  'Revision Needed',
  'Competition Ready',
] as const

function rawStr(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim()
    }
  }
  return ''
}

function cleanNoteField(val: unknown): string {
  const s = rawStr(val)
  if (!s || s.toLowerCase() === 'nothing') return ''
  return s
}

function formatStage(raw: string): string {
  if (!raw) return 'In Progress'
  const lower = raw.toLowerCase()
  if (lower.includes('idea')) return 'Ideation'
  if (lower.includes('test') || lower.includes('prototyp')) return 'Prototype Testing'
  if (lower.includes('rev')) return 'Revision Needed'
  if (lower.includes('ready') || lower.includes('comp') || lower.includes('approv')) {
    return 'Competition Ready'
  }
  return 'In Progress'
}

function toDbApprovalStatus(stage: string): string {
  switch (stage) {
    case 'Ideation':
      return 'ideation'
    case 'Prototype Testing':
      return 'prototype_testing'
    case 'Revision Needed':
      return 'revision_needed'
    case 'Competition Ready':
      return 'competition_ready'
    case 'In Progress':
    default:
      return 'in_progress'
  }
}

function formatPrototypeStatusBadge(status: string): { label: string; className: string } {
  const lower = status.toLowerCase()
  if (lower.includes('working')) {
    return {
      label: 'Working Well',
      className: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20',
    }
  }
  if (lower.includes('critical')) {
    return {
      label: 'Critical Issue',
      className: 'bg-rose-500/15 text-rose-500 border border-rose-500/20',
    }
  }
  if (lower.includes('revision')) {
    return {
      label: 'Needs Revision',
      className: 'bg-amber-500/15 text-amber-500 border border-amber-500/20',
    }
  }
  return {
    label: status || 'Logged',
    className: 'bg-slate-500/15 text-slate-400',
  }
}

function parseScopedFeedback(rawText: string): {
  mentorId: string | null
  studentId: string | null
  projectId: string | null
  direction: 'MENTOR_TO_STUDENT' | 'STUDENT_TO_MENTOR' | null
  cleanText: string
} {
  const match = rawText.match(/^\[LINK:([^|\]]*)\|([^|\]]*)\|([^|\]]*)(?:\|([^\]]*))?\]\s*(.*)$/)
  if (!match) {
    return {
      mentorId: null,
      studentId: null,
      projectId: null,
      direction: null,
      cleanText: rawText,
    }
  }
  const dir = match[4] === 'STUDENT_TO_MENTOR' ? 'STUDENT_TO_MENTOR' : 'MENTOR_TO_STUDENT'
  return {
    mentorId: match[1] || null,
    studentId: match[2] || null,
    projectId: match[3] || null,
    direction: dir,
    cleanText: match[5]?.trim() || '',
  }
}

function GradingRubricsContent() {
  const { isDarkMode } = useTheme()
  const searchParams = useSearchParams()

  const targetStudentId = searchParams.get('studentId')
  const targetProjectId = searchParams.get('projectId')

  const [mentorId, setMentorId] = useState<string | null>(null)
  const [mentorName, setMentorName] = useState('Mentor')
  const [items, setItems] = useState<ProjectSummaryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  const [stageInput, setStageInput] = useState('In Progress')
  const [feedbackInput, setFeedbackInput] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishingPortfolio, setPublishingPortfolio] = useState(false)

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedItemId) || null,
    [items, selectedItemId]
  )

  const openSummaryPopup = useCallback((item: ProjectSummaryItem) => {
    setSelectedItemId(item.id)
    setStageInput(item.stageLabel)
    setFeedbackInput('')
  }, [])

  const loadTrackerData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setItems([])
        setLoading(false)
        return
      }

      const currentMentorId = session.user.id
      setMentorId(currentMentorId)

      const [
        { data: currentProfile },
        { data: allProfiles },
        { data: linksData },
        { data: teamsData },
        { data: projectsData },
        { data: tasksData },
        { data: notesData },
        { data: feedbackData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentMentorId).maybeSingle(),
        supabase.from('profiles').select('*'),
        supabase.from('mentor_students').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('project_tasks').select('*'),
        supabase.from('prototype_notes').select('*').order('id', { ascending: false }),
        supabase.from('mentor_feedback').select('*').order('id', { ascending: false }),
      ])

      const mentorProf = (currentProfile || {}) as Record<string, unknown>
      const resolvedMentorName =
        rawStr(
          mentorProf.full_name,
          mentorProf.name,
          typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : null,
          typeof session.user.email === 'string' ? session.user.email.split('@')[0] : null
        ) || 'Mentor'
      setMentorName(resolvedMentorName)

      const rawCode = rawStr(mentorProf.mentor_code)
      const resolvedCode = rawCode
        ? rawCode.toUpperCase()
        : `MTR-${currentMentorId.replace(/-/g, '').slice(0, 6).toUpperCase()}`

      const profileMap = new Map<string, Record<string, unknown>>()
      for (const p of (allProfiles || []) as Record<string, unknown>[]) {
        if (p.id) profileMap.set(String(p.id), p)
      }

      const allTeams = (teamsData || []) as Record<string, unknown>[]
      const allProjects = (projectsData || []) as Record<string, unknown>[]
      const allTasks = (tasksData || []) as Record<string, unknown>[]
      const allNotes = (notesData || []) as Record<string, unknown>[]
      const allFeedback = (feedbackData || []) as Record<string, unknown>[]
      const allLinks = (linksData || []) as Record<string, unknown>[]

      const projectById = new Map<string, Record<string, unknown>>()
      for (const proj of allProjects) {
        if (proj.id) projectById.set(String(proj.id), proj)
      }

      const connectedStudentIds = new Set<string>()
      const linkByStudent = new Map<string, Record<string, unknown>>()

      for (const l of allLinks) {
        if (String(l.status || '').toLowerCase() === 'rejected') continue
        const mId = l.mentor_id ? String(l.mentor_id) : ''
        const mCode = rawStr(l.mentor_code).toUpperCase()
        const sId = String(l.student_id || l.user_id || '')
        if (!sId) continue

        const matchedTeamCode = allTeams.some((tm) => {
          const tCode = rawStr(tm.mentor_code).toUpperCase()
          const leadId = tm.lead_id ? String(tm.lead_id) : ''
          return tCode === resolvedCode && leadId === sId
        })

        if (mId === currentMentorId || (mCode && mCode === resolvedCode) || matchedTeamCode) {
          connectedStudentIds.add(sId)
          if (!linkByStudent.has(sId)) linkByStudent.set(sId, l)
        }
      }

      for (const p of (allProfiles || []) as Record<string, unknown>[]) {
        if (p.mentor_id && String(p.mentor_id) === currentMentorId && p.id) {
          connectedStudentIds.add(String(p.id))
        }
      }

      for (const proj of allProjects) {
        if (proj.mentor_id && String(proj.mentor_id) === currentMentorId && proj.user_id) {
          connectedStudentIds.add(String(proj.user_id))
        }
      }

      const mapped: ProjectSummaryItem[] = Array.from(connectedStudentIds).map(
        (studentId, idx) => {
          const lnk = linkByStudent.get(studentId) || {}
          const studentProf = profileMap.get(studentId)

          const studentDisplayName =
            rawStr(lnk.student_name, lnk.lead_name, studentProf?.full_name, studentProf?.name) ||
            `Student ${idx + 1}`

          const matchedTeam = allTeams.find((tm) => {
            const leadId = tm.lead_id ?? tm.leader_id ?? tm.user_id ?? tm.student_id
            return leadId !== undefined && leadId !== null && String(leadId) === studentId
          })

          const explicitProjectId = lnk.project_id ? String(lnk.project_id) : null
          const matchedProject =
            (explicitProjectId ? projectById.get(explicitProjectId) : undefined) ||
            allProjects.find((proj) => proj.user_id && String(proj.user_id) === studentId)

          const projectId = matchedProject?.id ? String(matchedProject.id) : explicitProjectId

          const projectTasks = allTasks.filter(
            (tk) =>
              (projectId && tk.project_id && String(tk.project_id) === projectId) ||
              (tk.user_id && String(tk.user_id) === studentId)
          )

          const completedMilestones = projectTasks.filter((tk) => {
            const st = String(tk.status || '').toLowerCase()
            return (
              tk.is_completed === true ||
              tk.completed === true ||
              st === 'done' ||
              st === 'completed'
            )
          }).length

          const totalMilestones = projectTasks.length

          const rawProgress = Number(
            matchedProject?.progress_percentage ??
              matchedProject?.progress_percent ??
              matchedProject?.progress ??
              (totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0)
          )
          const progressPercent = Number.isFinite(rawProgress)
            ? Math.min(100, Math.max(0, rawProgress))
            : 0

          const matchingNotes = allNotes.filter(
            (nt) =>
              (projectId && nt.project_id && String(nt.project_id) === projectId) ||
              (nt.author_id && String(nt.author_id) === studentId)
          )

          const prototypeLogs: PrototypeLogItem[] = matchingNotes.map((nt, nIdx) => ({
            id: String(nt.id ?? `${studentId}-note-${nIdx}`),
            versionTag: rawStr(nt.version_tag) || `Attempt #${matchingNotes.length - nIdx}`,
            status: rawStr(nt.status) || 'logged',
            whatWasTested: cleanNoteField(nt.what_was_tested),
            observationsIssues: cleanNoteField(nt.observations_issues),
            nextSteps: cleanNoteField(nt.next_steps),
            isReviewRequested: Boolean(nt.is_review_requested),
          }))

          const teamName =
            rawStr(matchedTeam?.team_name, matchedTeam?.name, lnk.team_name) ||
            `${studentDisplayName}'s Team`

          const threadNotes: ThreadNoteItem[] = []
          for (const fb of allFeedback) {
            const rawBody = rawStr(fb.feedback_text, fb.comment)
            if (!rawBody) continue

            const parsed = parseScopedFeedback(rawBody)
            if (parsed.mentorId && parsed.studentId) {
              if (parsed.mentorId !== currentMentorId || parsed.studentId !== studentId) {
                continue
              }
              const isFromStudent = parsed.direction === 'STUDENT_TO_MENTOR'
              threadNotes.push({
                id: (fb.id as string | number) ?? `${studentId}-fb-${threadNotes.length}`,
                sender: isFromStudent
                  ? studentDisplayName
                  : rawStr(fb.mentor_name) || resolvedMentorName,
                text: parsed.cleanText,
                createdAt: rawStr(fb.inserted_at, fb.created_at) || undefined,
                isFromStudent,
              })
            }
          }

          const approvalStatus = rawStr(matchedProject?.approval_status).toLowerCase() || 'in_progress'

          return {
            id: String(matchedTeam?.id ?? projectId ?? studentId),
            studentId,
            teamName,
            institution:
              rawStr(matchedTeam?.institution, studentProf?.institution) || 'InnovaSeed School',
            projectId,
            projectCode: rawStr(matchedProject?.project_code) || 'PRJ-ACTIVE',
            projectTitle:
              rawStr(matchedProject?.title, matchedTeam?.research_field, lnk.project_title) ||
              'Active Innovation Project',
            projectSubtitle: rawStr(matchedProject?.subtitle),
            sprintName: rawStr(matchedProject?.sprint_name) || 'Sprint 1',
            stageLabel: formatStage(rawStr(matchedProject?.approval_status, matchedTeam?.status)),
            approvalStatus,
            progressPercent,
            completedMilestones,
            totalMilestones,
            prototypeAttemptCount: prototypeLogs.length,
            prototypeLogs,
            threadNotes,
          }
        }
      )

      setItems(mapped)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTrackerData(false)
    }, 0)

    const channel = supabase
      .channel('realtime-project-prototype-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_students' }, () => {
        void loadTrackerData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        void loadTrackerData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        void loadTrackerData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, () => {
        void loadTrackerData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prototype_notes' }, () => {
        void loadTrackerData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_feedback' }, () => {
        void loadTrackerData(true)
      })
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [loadTrackerData])

  useEffect(() => {
    if (loading || hasAutoOpened || items.length === 0) return
    if (!targetStudentId && !targetProjectId) return

    const matched = items.find(
      (it) =>
        (targetStudentId && it.studentId === targetStudentId) ||
        (targetProjectId && it.projectId === targetProjectId)
    )

    if (matched) {
      const timer = setTimeout(() => {
        openSummaryPopup(matched)
        setHasAutoOpened(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [loading, hasAutoOpened, items, targetStudentId, targetProjectId, openSummaryPopup])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.teamName.toLowerCase().includes(q) ||
        it.projectTitle.toLowerCase().includes(q) ||
        it.projectCode.toLowerCase().includes(q) ||
        it.institution.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

  const extractErrorMessage = (error: unknown): string => {
    if (!error) return 'Unknown error'
    if (error instanceof Error) return error.message
    if (typeof error === 'object') {
      const errObj = error as Record<string, unknown>
      const parts = [
        typeof errObj.message === 'string' ? errObj.message : '',
        typeof errObj.details === 'string' ? errObj.details : '',
        typeof errObj.hint === 'string' ? errObj.hint : '',
        typeof errObj.code === 'string' ? `[${errObj.code}]` : '',
      ].filter(Boolean)
      if (parts.length > 0) return parts.join(' — ')
    }
    return String(error)
  }

  const handleApproveAndPublishToPortfolio = async () => {
    if (!selectedItem || publishingPortfolio || !mentorId) return
    setPublishingPortfolio(true)

    try {
      if (selectedItem.projectId) {
        const { error: projErr } = await supabase
          .from('projects')
          .update({
            approval_status: 'approved',
            progress_percentage: 100,
          })
          .eq('id', selectedItem.projectId)

        if (projErr) throw projErr
      }

      const approvalNote =
        feedbackInput.trim() ||
        `Project "${selectedItem.projectTitle}" approved by ${mentorName} and published to portfolio.`

      if (selectedItem.studentId) {
        const scopedPayloadText = `[LINK:${mentorId}|${selectedItem.studentId}|${
          selectedItem.projectId || ''
        }|MENTOR_TO_STUDENT] ${approvalNote}`
        const todayDate = new Date().toISOString().slice(0, 10)

        const { error: fbErr } = await supabase.from('mentor_feedback').insert({
          mentor_name: mentorName,
          comment: scopedPayloadText,
          feedback_text: scopedPayloadText,
          created_at: todayDate,
          is_read: false,
        })

        if (fbErr) throw fbErr

        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: selectedItem.studentId,
          title: `Portfolio Unlocked — ${selectedItem.projectTitle}`,
          message: approvalNote,
          is_read: false,
        })

        if (notifErr) {
          console.warn('Notification insert warning:', extractErrorMessage(notifErr))
        }
      }

      setFeedbackInput('')
      await loadTrackerData(true)

      setToastMessage(
        `${selectedItem.projectTitle} approved and published to ${selectedItem.teamName}'s portfolio.`
      )
      setTimeout(() => setToastMessage(null), 4500)
      setSelectedItemId(null)
    } catch (err: unknown) {
      setToastMessage('Failed to publish to portfolio: ' + extractErrorMessage(err))
      setTimeout(() => setToastMessage(null), 4500)
    } finally {
      setPublishingPortfolio(false)
    }
  }

  const handleSaveCoachingUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedItem || saving || !mentorId) return

    setSaving(true)
    const trimmedFeedback = feedbackInput.trim()

    try {
      if (selectedItem.projectId && stageInput) {
        const { error: projErr } = await supabase
          .from('projects')
          .update({ approval_status: toDbApprovalStatus(stageInput) })
          .eq('id', selectedItem.projectId)

        if (projErr) throw projErr
      }

      if (trimmedFeedback && selectedItem.studentId) {
        const scopedPayloadText = `[LINK:${mentorId}|${selectedItem.studentId}|${
          selectedItem.projectId || ''
        }|MENTOR_TO_STUDENT] ${trimmedFeedback}`
        const todayDate = new Date().toISOString().slice(0, 10)

        const { error: fbErr } = await supabase.from('mentor_feedback').insert({
          mentor_name: mentorName,
          comment: scopedPayloadText,
          feedback_text: scopedPayloadText,
          created_at: todayDate,
          is_read: false,
        })

        if (fbErr) throw fbErr

        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: selectedItem.studentId,
          title: `Guidance from ${mentorName}`,
          message: trimmedFeedback,
          is_read: false,
        })

        if (notifErr) {
          console.warn('Notification insert warning:', extractErrorMessage(notifErr))
        }
      }

      setFeedbackInput('')
      await loadTrackerData(true)

      setToastMessage(
        trimmedFeedback
          ? `Coaching feedback sent to ${selectedItem.teamName}.`
          : `Workspace stage updated for ${selectedItem.teamName}.`
      )
      setTimeout(() => setToastMessage(null), 4000)

      if (!trimmedFeedback) {
        setSelectedItemId(null)
      }
    } catch (err: unknown) {
      setToastMessage('Failed to save update: ' + extractErrorMessage(err))
      setTimeout(() => setToastMessage(null), 4500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Grading &amp; Rubrics</h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDarkMode ? 'text-slate-400' : 'text-[#534434]'
            }`}
          >
            Review completed milestones, prototype test iterations, and approve projects to publish
            to student portfolios.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search team or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`rounded-xl px-4 py-2.5 text-xs outline-none border w-full md:w-64 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-white border-[#d8c3ad]'
          }`}
        />
      </div>

      {/* Team & Project List */}
      <div
        className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <h2 className="font-bold text-base">Teams &amp; Active Projects</h2>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
            {filteredItems.length} {filteredItems.length === 1 ? 'Project' : 'Projects'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading teams and active projects...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-1.5">
            <p className="font-bold text-sm">No active team projects found.</p>
            <p>Connected teams and their projects will appear in this list.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isPendingReview = item.approvalStatus === 'pending_review'
              const isApproved = item.approvalStatus === 'approved'

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSummaryPopup(item)}
                  className={`w-full p-4 rounded-2xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition cursor-pointer ${
                    isPendingReview
                      ? isDarkMode
                        ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'border-emerald-500/50 bg-emerald-50/70 hover:bg-emerald-50'
                      : isDarkMode
                      ? 'border-slate-800 bg-slate-950/50 hover:border-amber-500/40 hover:bg-slate-800/50'
                      : 'border-[#d8c3ad] bg-[#fff8f4] hover:border-amber-500 hover:bg-amber-50/40'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm">{item.teamName}</span>
                      <span className="text-[11px] text-slate-400">• {item.institution}</span>
                      {isPendingReview && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                          Ready for Completion Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600">
                          Approved &amp; Published
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-amber-500 mt-1">
                      {item.projectTitle} ({item.progressPercent}%)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.sprintName} • {item.prototypeAttemptCount} Prototype{' '}
                      {item.prototypeAttemptCount === 1 ? 'Attempt' : 'Attempts'}
                      {item.threadNotes.length > 0 && ` • ${item.threadNotes.length} Messages`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-500/10">
                      {isApproved ? 'Approved' : item.stageLabel}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-[#F59E0B] text-[#0F172A] text-xs font-bold">
                      Evaluate &amp; Rubric
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Pop-up Summary & Rubric Modal */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItemId(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl p-6 rounded-2xl border shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3 border-inherit gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  {selectedItem.teamName} • {selectedItem.institution}
                </span>
                <h3 className="font-extrabold text-lg mt-0.5">{selectedItem.projectTitle}</h3>
                {selectedItem.projectSubtitle && (
                  <p
                    className={`text-xs mt-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                    }`}
                  >
                    {selectedItem.projectSubtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="w-8 h-8 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Project Workspace Summary */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-[#fff8f4] border-[#d8c3ad]'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500">
                  1. Project Workspace Status
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedItem.projectCode}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Current Sprint / Stage</span>
                  <span className="font-bold mt-0.5 block">
                    {selectedItem.sprintName} •{' '}
                    {selectedItem.approvalStatus === 'approved'
                      ? 'Approved'
                      : selectedItem.stageLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Workspace Progress</span>
                  <span className="font-extrabold text-amber-500 mt-0.5 block">
                    {selectedItem.progressPercent}%
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Milestones Completed</span>
                  <span className="font-bold mt-0.5 block">
                    {selectedItem.totalMilestones > 0
                      ? `${selectedItem.completedMilestones} / ${selectedItem.totalMilestones}`
                      : `${selectedItem.completedMilestones} Completed`}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Prototype Notes Summary */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-[#fff8f4] border-[#d8c3ad]'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-500">
                  2. Prototype Notes &amp; Testing Iterations
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
                  Tested {selectedItem.prototypeAttemptCount}{' '}
                  {selectedItem.prototypeAttemptCount === 1 ? 'Time' : 'Times'}
                </span>
              </div>

              {selectedItem.prototypeLogs.length === 0 ? (
                <p className="text-xs italic text-slate-400">
                  No prototype test iterations recorded yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                  {selectedItem.prototypeLogs.map((log) => {
                    const badge = formatPrototypeStatusBadge(log.status)
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-white border-[#d8c3ad]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold">{log.versionTag}</span>
                          <div className="flex items-center gap-1.5">
                            {log.isReviewRequested && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500">
                                Review Requested
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {log.whatWasTested && (
                          <p className="text-[11px] text-slate-400">
                            <strong className="text-slate-300">Tested:</strong> {log.whatWasTested}
                          </p>
                        )}
                        {log.observationsIssues && (
                          <p className="text-[11px] text-slate-400">
                            <strong className="text-slate-300">Observations:</strong>{' '}
                            {log.observationsIssues}
                          </p>
                        )}
                        {log.nextSteps && (
                          <p className="text-[11px] text-slate-400">
                            <strong className="text-slate-300">Next Steps:</strong> {log.nextSteps}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section 3: Live Coaching & Student Check-In Thread */}
            {selectedItem.threadNotes.length > 0 && (
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDarkMode
                    ? 'bg-slate-950/60 border-slate-800'
                    : 'bg-[#fff8f4] border-[#d8c3ad]'
                }`}
              >
                <h4 className="font-bold text-xs uppercase tracking-wider text-sky-500">
                  3. Coaching &amp; Student Check-In History
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedItem.threadNotes.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl border text-xs ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-white border-[#d8c3ad]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-bold text-[11px] ${
                            msg.isFromStudent ? 'text-sky-500' : 'text-amber-500'
                          }`}
                        >
                          {msg.sender}
                        </span>
                        {msg.createdAt && (
                          <span className="text-[10px] text-slate-400">{msg.createdAt}</span>
                        )}
                      </div>
                      <p className="mt-0.5">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Stage Update, Rubric Feedback & Portfolio Approval */}
            <form onSubmit={handleSaveCoachingUpdate} className="space-y-3 text-xs pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Update Project Stage</label>
                  <select
                    value={stageInput}
                    onChange={(e) => setStageInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    {STAGE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <p className="text-[11px] text-slate-400">
                    Add rubric/coaching notes below or approve directly to publish to portfolio.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Rubric &amp; Mentor Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Write rubric evaluation or coaching guidance for this team..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="py-2.5 px-4 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving || publishingPortfolio}
                  className="flex-1 py-2.5 px-4 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : feedbackInput.trim()
                    ? 'Save & Send Feedback'
                    : 'Save Stage'}
                </button>
                {selectedItem.approvalStatus !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => void handleApproveAndPublishToPortfolio()}
                    disabled={publishingPortfolio || saving}
                    className="flex-1 py-2.5 px-4 font-extrabold bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-600 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {publishingPortfolio
                      ? 'Publishing...'
                      : 'Approve & Publish to Portfolio'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Updated</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GradingRubricsClient() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          Loading grading &amp; rubrics...
        </div>
      }
    >
      <GradingRubricsContent />
    </Suspense>
  )
}