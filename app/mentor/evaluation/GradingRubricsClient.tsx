"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type ConnectedTeamProgress = {
  id: string
  studentId: string
  studentName: string
  teamName: string
  institution: string
  projectId: string | null
  prototypeTitle: string
  projectStage: string
  lastFeedbackNote: string
  isMonitored: boolean
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}

export default function GradingRubricsClient() {
  const { isDarkMode } = useTheme()
  const searchParams = useSearchParams()

  const targetStudentId = searchParams.get('studentId')
  const targetProjectId = searchParams.get('projectId')

  const [mentorId, setMentorId] = useState<string | null>(null)
  const [mentorName, setMentorName] = useState<string>('Mentor')
  const [teams, setTeams] = useState<ConnectedTeamProgress[]>([])
  const [selectedTeam, setSelectedTeam] = useState<ConnectedTeamProgress | null>(null)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  const [stageInput, setStageInput] = useState('In Progress')
  const [feedbackInput, setFeedbackInput] = useState('')

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const openMonitoringModal = useCallback((team: ConnectedTeamProgress) => {
    setSelectedTeam(team)
    setStageInput(team.projectStage || 'In Progress')
    setFeedbackInput('')
  }, [])

  const loadConnectedTeams = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setTeams([])
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
        { data: feedbackData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentMentorId).maybeSingle(),
        supabase.from('profiles').select('*'),
        supabase.from('mentor_students').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('mentor_feedback').select('*').order('id', { ascending: false }),
      ])

      const mentorProf = (currentProfile || {}) as Record<string, unknown>
      const resolvedMentorName =
        firstNonEmpty(
          mentorProf.full_name,
          mentorProf.name,
          typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : null,
          typeof session.user.email === 'string' ? session.user.email.split('@')[0] : null
        ) || 'Mentor'
      setMentorName(resolvedMentorName)

      const rawCode = firstNonEmpty(mentorProf.mentor_code)
      const resolvedMentorCode = rawCode
        ? rawCode.toUpperCase()
        : `MTR-${currentMentorId.replace(/-/g, '').slice(0, 6).toUpperCase()}`

      const profileMap = new Map<string, Record<string, unknown>>()
      for (const p of (allProfiles || []) as Record<string, unknown>[]) {
        if (p.id) profileMap.set(String(p.id), p)
      }

      const allTeams = (teamsData || []) as Record<string, unknown>[]
      const allProjects = (projectsData || []) as Record<string, unknown>[]
      const projectById = new Map<string, Record<string, unknown>>()
      for (const proj of allProjects) {
        if (proj.id) projectById.set(String(proj.id), proj)
      }

      const feedbackRows = (feedbackData || []) as Record<string, unknown>[]
      const latestFeedbackByProject = new Map<string, Record<string, unknown>>()
      const latestFeedbackByStudent = new Map<string, Record<string, unknown>>()

      for (const fb of feedbackRows) {
        if (fb.project_id && !latestFeedbackByProject.has(String(fb.project_id))) {
          latestFeedbackByProject.set(String(fb.project_id), fb)
        }
        if (fb.student_id && !latestFeedbackByStudent.has(String(fb.student_id))) {
          latestFeedbackByStudent.set(String(fb.student_id), fb)
        }
      }

      const allLinks = (linksData || []) as Record<string, unknown>[]
      const connectedLinks = allLinks.filter((l) => {
        const status = String(l.status || '').toLowerCase()
        if (status === 'rejected') return false

        const mId = l.mentor_id ? String(l.mentor_id) : ''
        const mCode = firstNonEmpty(l.mentor_code)?.toUpperCase()
        const sId = String(l.student_id || l.user_id || '')

        const matchedByTeamCode = allTeams.some((tm) => {
          const tCode = firstNonEmpty(tm.mentor_code)?.toUpperCase()
          const leadId = tm.lead_id ? String(tm.lead_id) : ''
          return tCode === resolvedMentorCode && sId && leadId === sId
        })

        return (
          mId === currentMentorId ||
          (mCode && mCode === resolvedMentorCode) ||
          matchedByTeamCode
        )
      })

      const mapped: ConnectedTeamProgress[] = connectedLinks.map((lnk, idx) => {
        const studentId = String(lnk.student_id || lnk.user_id || `student-${idx}`)
        const studentProf = profileMap.get(studentId)

        const studentName =
          firstNonEmpty(
            lnk.student_name,
            lnk.lead_name,
            studentProf?.full_name,
            studentProf?.name
          ) ||
          (typeof studentProf?.email === 'string'
            ? studentProf.email.split('@')[0]
            : `Student ${studentId.slice(0, 6)}`)

        const matchedTeam = allTeams.find((tm) => {
          const leadId = tm.lead_id ?? tm.leader_id ?? tm.user_id ?? tm.student_id
          return leadId !== undefined && leadId !== null && String(leadId) === studentId
        })

        const explicitProjectId = lnk.project_id ? String(lnk.project_id) : null
        const matchedProject =
          (explicitProjectId ? projectById.get(explicitProjectId) : undefined) ||
          allProjects.find((proj) => {
            const owner = proj.user_id ?? proj.author_id ?? proj.owner_id ?? proj.student_id
            return owner !== undefined && owner !== null && String(owner) === studentId
          })

        const resolvedProjectId = matchedProject?.id
          ? String(matchedProject.id)
          : explicitProjectId
        const resolvedTeamId = matchedTeam?.id ? String(matchedTeam.id) : null
        const recordKey = String(resolvedTeamId ?? resolvedProjectId ?? studentId)

        const latestFb =
          (resolvedProjectId ? latestFeedbackByProject.get(resolvedProjectId) : undefined) ||
          latestFeedbackByStudent.get(studentId)

        const lastFeedbackNote =
          firstNonEmpty(latestFb?.feedback_text, latestFb?.comment) || ''

        const projectStage =
          firstNonEmpty(
            matchedProject?.stage,
            matchedProject?.phase,
            matchedProject?.status,
            matchedTeam?.status
          ) || 'In Progress'

        return {
          id: recordKey,
          studentId,
          studentName,
          teamName:
            firstNonEmpty(matchedTeam?.team_name, matchedTeam?.name, lnk.team_name) ||
            `${studentName}'s Team`,
          institution:
            firstNonEmpty(matchedTeam?.institution, studentProf?.institution) ||
            'InnovaSeed School',
          projectId: resolvedProjectId,
          prototypeTitle:
            firstNonEmpty(
              matchedProject?.title,
              matchedProject?.project_title,
              matchedTeam?.research_field,
              lnk.project_title
            ) || 'Active Innovation Project',
          projectStage,
          lastFeedbackNote,
          isMonitored: Boolean(lastFeedbackNote) || projectStage !== 'In Progress',
        }
      })

      setTeams(mapped)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadConnectedTeams()
    }, 0)

    const channel = supabase
      .channel('realtime-mentor-project-monitoring')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_students' },
        () => {
          void loadConnectedTeams()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          void loadConnectedTeams()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          void loadConnectedTeams()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_feedback' },
        () => {
          void loadConnectedTeams()
        }
      )
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [loadConnectedTeams])

  useEffect(() => {
    if (loading || hasAutoOpened || teams.length === 0) return
    if (!targetStudentId && !targetProjectId) return

    const matched = teams.find(
      (t) =>
        (targetStudentId && t.studentId === targetStudentId) ||
        (targetProjectId && t.projectId === targetProjectId)
    )

    if (matched) {
      const timer = setTimeout(() => {
        openMonitoringModal(matched)
        setHasAutoOpened(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [loading, hasAutoOpened, teams, targetStudentId, targetProjectId, openMonitoringModal])

  const handleSaveMonitoring = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedTeam || saving) return

    setSaving(true)
    const trimmedFeedback = feedbackInput.trim()

    try {
      if (selectedTeam.projectId && stageInput) {
        await supabase
          .from('projects')
          .update({ status: stageInput })
          .eq('id', selectedTeam.projectId)
      }

      if (trimmedFeedback && selectedTeam.studentId) {
        const messageText = `[Mentor Feedback — ${selectedTeam.prototypeTitle}] ${trimmedFeedback}`

        await supabase.from('mentor_feedback').insert({
          mentor_name: mentorName,
          mentor_id: mentorId,
          student_id: selectedTeam.studentId,
          project_id: selectedTeam.projectId,
          comment: messageText,
          feedback_text: messageText,
          is_read: false,
        })

        await supabase.from('notifications').insert({
          user_id: selectedTeam.studentId,
          title: `New Feedback from ${mentorName}`,
          message: messageText,
          is_read: false,
        })
      }

      setTeams((prev) =>
        prev.map((t) =>
          t.id === selectedTeam.id
            ? {
                ...t,
                projectStage: stageInput || t.projectStage,
                lastFeedbackNote: trimmedFeedback || t.lastFeedbackNote,
                isMonitored: true,
              }
            : t
        )
      )

      setSelectedTeam(null)
      setSuccessMessage(
        trimmedFeedback
          ? `Feedback for ${selectedTeam.teamName} sent to student's Mentor Feedback!`
          : `Progress check-in for ${selectedTeam.teamName} recorded.`
      )
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Terjadi kesalahan: ' + message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Workspace &amp; Prototype Monitoring 🧭</h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDarkMode ? 'text-slate-400' : 'text-[#534434]'
            }`}
          >
            Follow ongoing student progress in workspaces and prototypes, and send feedback only when guidance is needed.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 self-start md:self-auto">
          Mentor Coaching View
        </span>
      </div>

      <div
        className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <h2 className="font-bold text-base">Active Student Progress Tracker</h2>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
            {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading student workspace &amp; prototype progress...
          </div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <p className="font-bold text-sm">No connected student teams yet.</p>
            <p>
              Once a student connects using your mentor code, their ongoing workspace and prototype progress will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b ${
                    isDarkMode
                      ? 'border-slate-800 text-slate-400'
                      : 'border-[#d8c3ad] text-[#534434]'
                  }`}
                >
                  <th className="py-3 px-4">Team &amp; Student</th>
                  <th className="py-3 px-4">Workspace / Prototype</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Sent Feedback</th>
                  <th className="py-3 px-4 text-center">Check Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {teams.map((team) => {
                  const isHighlighted =
                    (targetStudentId && team.studentId === targetStudentId) ||
                    (targetProjectId && team.projectId === targetProjectId)

                  return (
                    <tr
                      key={team.id}
                      className={`transition ${
                        isHighlighted
                          ? isDarkMode
                            ? 'bg-amber-500/10 divide-slate-800'
                            : 'bg-amber-50/80 divide-[#d8c3ad]'
                          : isDarkMode
                          ? 'hover:bg-slate-800/40 divide-slate-800'
                          : 'hover:bg-[#fff8f4] divide-[#d8c3ad]'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="font-bold">{team.teamName}</div>
                        <div className="text-[11px] text-slate-400">
                          {team.studentName} • {team.institution}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-amber-500 font-medium">
                        {team.prototypeTitle}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-[11px] font-semibold">
                          {team.projectStage}
                        </span>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        {team.lastFeedbackNote ? (
                          <p className="line-clamp-2 text-[11px] text-slate-400">
                            {team.lastFeedbackNote}
                          </p>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">
                            No feedback sent (checked / no notes)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            team.isMonitored
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {team.isMonitored ? 'Checked' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openMonitoringModal(team)}
                          className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0F172A] font-bold hover:bg-[#D97706] transition cursor-pointer shadow-xs"
                        >
                          Check Progress
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTeam && (
        <div
          onClick={() => setSelectedTeam(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <h3 className="font-bold text-base">Progress Check &amp; Optional Feedback</h3>
                <p
                  className={`text-[11px] ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  Team: <strong>{selectedTeam.teamName}</strong> ({selectedTeam.studentName})
                </p>
                <p className="text-[11px] font-semibold text-amber-500 mt-0.5">
                  Project: {selectedTeam.prototypeTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="w-8 h-8 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMonitoring} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  1. Project Progress Stage
                </label>
                <select
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                >
                  <option value="Ideation">Ideation</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Prototype Testing">Prototype Testing</option>
                  <option value="Revision Needed">Revision Needed</option>
                  <option value="Competition Ready">Competition Ready</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  2. Feedback to Student (Optional)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  If left empty, no message will be sent to the student. If filled, it will appear in the student&apos;s Mentor Feedback page.
                </p>
                <textarea
                  rows={4}
                  placeholder="Write optional feedback or guidance for the student's workspace/prototype..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="flex-1 py-2.5 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : feedbackInput.trim()
                    ? 'Send Feedback'
                    : 'Save Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}