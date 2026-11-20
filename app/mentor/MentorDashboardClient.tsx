"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type MenteeProjectOverview = {
  linkId: string
  studentId: string
  studentName: string
  status: string
  projectId: string | null
  projectTitle: string
  projectStage: string
  approvalStatus: string
  progressPercentage: number
  teamName: string | null
  teamLeadName: string | null
}

type IncomingStudentMessage = {
  id: string
  senderName: string
  studentId: string | null
  projectId: string | null
  message: string
  createdAt?: string
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}

export default function MentorDashboardClient() {
  const { isDarkMode } = useTheme()

  const [loading, setLoading] = useState(true)
  const [mentorName, setMentorName] = useState('Mentor')
  const [mentorCode, setMentorCode] = useState<string | null>(null)
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [menteeProjects, setMenteeProjects] = useState<MenteeProjectOverview[]>([])
  const [recentMessages, setRecentMessages] = useState<IncomingStudentMessage[]>([])

  const loadMentorDashboard = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setMenteeProjects([])
        setRecentMessages([])
        setAcceptedCount(0)
        setPendingCount(0)
        setLoading(false)
        return
      }

      const mentorUserId = session.user.id

      const [
        { data: currentProfile },
        { data: allProfiles },
        { data: linksData },
        { data: projectsData },
        { data: optionalTeams, error: teamsErr },
        { data: optionalMembers, error: membersErr },
        { data: repliesData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', mentorUserId).maybeSingle(),
        supabase.from('profiles').select('*'),
        supabase.from('mentor_students').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('team_members').select('*'),
        supabase
          .from('mentor_replies')
          .select('id, feedback_id, sender_name, message, created_at')
          .order('created_at', { ascending: false })
          .limit(15),
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
        : `MTR-${mentorUserId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
      setMentorCode(resolvedMentorCode)

      const teamRows: Record<string, unknown>[] =
        !teamsErr && Array.isArray(optionalTeams)
          ? (optionalTeams as Record<string, unknown>[])
          : []

      const teamById = new Map<string, Record<string, unknown>>()
      for (const tm of teamRows) {
        if (tm.id) teamById.set(String(tm.id), tm)
      }

      const memberRows: Record<string, unknown>[] =
        !membersErr && Array.isArray(optionalMembers)
          ? (optionalMembers as Record<string, unknown>[])
          : []

      const allLinks = (linksData || []) as Record<string, unknown>[]
      const mentorLinks = allLinks.filter((l) => {
        const mId = l.mentor_id ? String(l.mentor_id) : ''
        const mCode = firstNonEmpty(l.mentor_code)?.toUpperCase()
        const studentId = String(l.student_id || l.user_id || '')

        const matchedByTeamMentorCode = teamRows.some((tm) => {
          const tCode = firstNonEmpty(tm.mentor_code)?.toUpperCase()
          const leadId = tm.lead_id ? String(tm.lead_id) : ''
          return tCode === resolvedMentorCode && studentId && leadId === studentId
        })

        return (
          mId === mentorUserId ||
          (mCode && mCode === resolvedMentorCode) ||
          matchedByTeamMentorCode
        )
      })

      const activeOrPendingLinks = mentorLinks.filter(
        (l) => String(l.status || 'pending').toLowerCase() !== 'rejected'
      )

      const acceptedLinks = activeOrPendingLinks.filter(
        (l) => String(l.status || 'pending').toLowerCase() === 'accepted'
      )
      const pendingLinks = activeOrPendingLinks.filter(
        (l) => String(l.status || 'pending').toLowerCase() === 'pending'
      )

      setAcceptedCount(acceptedLinks.length)
      setPendingCount(pendingLinks.length)

      const profileMap = new Map<string, Record<string, unknown>>()
      for (const p of (allProfiles || []) as Record<string, unknown>[]) {
        if (p.id) profileMap.set(String(p.id), p)
      }

      const projects = (projectsData || []) as Record<string, unknown>[]
      const projectById = new Map<string, Record<string, unknown>>()
      for (const proj of projects) {
        if (proj.id) projectById.set(String(proj.id), proj)
      }

      const overviewItems: MenteeProjectOverview[] = activeOrPendingLinks.map((lnk) => {
        const studentId = String(lnk.student_id || lnk.user_id || '')
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

        const explicitProjectId = lnk.project_id ? String(lnk.project_id) : null
        const matchedProject =
          (explicitProjectId ? projectById.get(explicitProjectId) : undefined) ||
          projects.find((proj) => {
            const owner = proj.user_id ?? proj.author_id ?? proj.owner_id ?? proj.student_id
            return owner !== undefined && owner !== null && String(owner) === studentId
          })

        let matchedTeam = teamRows.find((tm) => {
          const leadId = tm.lead_id ?? tm.leader_id ?? tm.user_id ?? tm.student_id
          return leadId !== undefined && leadId !== null && String(leadId) === studentId
        })

        if (!matchedTeam) {
          const matchedMember = memberRows.find((mem) => {
            const mName = firstNonEmpty(mem.name)
            return mName && mName.toLowerCase() === studentName.toLowerCase()
          })
          const memTeamId = firstNonEmpty(
            matchedMember?.team_id,
            matchedProject?.team_id,
            lnk.team_id
          )
          if (memTeamId) {
            matchedTeam = teamById.get(memTeamId)
          }
        }

        const resolvedTeamName = firstNonEmpty(
          matchedTeam?.team_name,
          matchedTeam?.name,
          lnk.team_name
        )

        const resolvedLeadId = firstNonEmpty(matchedTeam?.lead_id)
        const resolvedTeamLeadName =
          firstNonEmpty(matchedTeam?.lead_name, matchedTeam?.leader_name) ||
          (resolvedLeadId && profileMap.get(resolvedLeadId)
            ? firstNonEmpty(
                profileMap.get(resolvedLeadId)?.full_name,
                profileMap.get(resolvedLeadId)?.name
              )
            : resolvedTeamName
            ? studentName
            : null)

        const approvalStatus = String(
          matchedProject?.approval_status || lnk.approval_status || 'in_progress'
        ).toLowerCase()
        const progressPercentage = Number(matchedProject?.progress_percentage ?? 0) || 0

        return {
          linkId: String(lnk.id ?? `${studentId}-${Math.random()}`),
          studentId,
          studentName,
          status: String(lnk.status || 'pending'),
          projectId: matchedProject?.id ? String(matchedProject.id) : explicitProjectId,
          projectTitle:
            firstNonEmpty(
              matchedProject?.title,
              matchedProject?.project_title,
              lnk.project_title
            ) || 'No Active Project Yet',
          projectStage:
            firstNonEmpty(matchedProject?.status, matchedProject?.stage, matchedProject?.phase) ||
            'In Progress',
          approvalStatus,
          progressPercentage,
          teamName: resolvedTeamName,
          teamLeadName: resolvedTeamLeadName,
        }
      })

      setMenteeProjects(overviewItems)

      const incoming = ((repliesData || []) as Record<string, unknown>[])
        .filter((rep) => {
          const sender = firstNonEmpty(rep.sender_name) || ''
          return sender.length > 0 && sender.toLowerCase() !== resolvedMentorName.toLowerCase()
        })
        .slice(0, 5)
        .map((rep, idx) => {
          const sender = firstNonEmpty(rep.sender_name) || 'Student'
          const matchedMentee = overviewItems.find(
            (m) => m.studentName.toLowerCase() === sender.toLowerCase()
          )
          return {
            id: String(rep.id ?? idx),
            senderName: sender,
            studentId: matchedMentee?.studentId ?? overviewItems[0]?.studentId ?? null,
            projectId: matchedMentee?.projectId ?? overviewItems[0]?.projectId ?? null,
            message: firstNonEmpty(rep.message) || '',
            createdAt: firstNonEmpty(rep.created_at) || undefined,
          }
        })

      setRecentMessages(incoming)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const triggerLoad = () => {
      queueMicrotask(() => {
        void loadMentorDashboard()
      })
    }

    triggerLoad()

    const channel = supabase
      .channel('realtime-mentor-dashboard-overview')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_students' },
        () => triggerLoad()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => triggerLoad()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => triggerLoad()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_replies' },
        () => triggerLoad()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadMentorDashboard])

  const readyForReviewCount = menteeProjects.filter(
    (m) => m.approvalStatus === 'pending_review'
  ).length

  return (
    <div className="space-y-6">
      <div
        className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        <div>
          <h1 className="text-2xl font-extrabold">Welcome back, {mentorName}! 👋</h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDarkMode ? 'text-slate-400' : 'text-[#534434]'
            }`}
          >
            Quick oversight of connected students, their active innovation projects, and review
            shortcuts.
          </p>
        </div>

        {mentorCode && (
          <div className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 text-xs font-mono font-bold">
            Code: {mentorCode}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="text-xs font-semibold text-slate-400">Connected Students</div>
          <div className="text-2xl font-extrabold mt-1 text-amber-500">{acceptedCount}</div>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="text-xs font-semibold text-slate-400">Pending Link Requests</div>
          <div className="text-2xl font-extrabold mt-1 text-amber-500">{pendingCount}</div>
        </div>
        <div
          className={`p-5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="text-xs font-semibold text-slate-400">Ready for Completion Review</div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">
            {readyForReviewCount}
          </div>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-6 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-sm">Connected Students &amp; Active Projects</h2>
          <div className="flex items-center gap-4">
            <Link
              href="/mentor/evaluation"
              className="text-xs font-bold text-amber-500 hover:underline"
            >
              Open Grading &amp; Rubrics &rarr;
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading dashboard overview...
          </div>
        ) : menteeProjects.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <p className="font-bold text-sm">No student connections found yet.</p>
            <p>
              Once a student links your mentor code, their name, team, and active project will
              appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {menteeProjects.map((item) => {
              const targetHref = `/mentor/evaluation?studentId=${encodeURIComponent(
                item.studentId
              )}${item.projectId ? `&projectId=${encodeURIComponent(item.projectId)}` : ''}`
              const isReadyForReview = item.approvalStatus === 'pending_review'
              const isApproved = item.approvalStatus === 'approved'

              return (
                <div
                  key={item.linkId}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition ${
                    isReadyForReview
                      ? isDarkMode
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-emerald-50/70 border-emerald-500/40'
                      : isDarkMode
                      ? 'bg-slate-800/50 border-slate-700/60'
                      : 'bg-[#fff8f4] border-[#ebdcd0]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm">{item.studentName}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'accepted'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-amber-500/15 text-amber-600'
                        }`}
                      >
                        {item.status}
                      </span>
                      {isReadyForReview && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                          Completed Project • Ready for Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600">
                          Approved &amp; Portfolio Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-amber-600">
                      Project: {item.projectTitle} ({item.progressPercentage}%)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.teamName
                        ? `Team: ${item.teamName} • Lead: ${
                            item.teamLeadName || item.studentName
                          }`
                        : `Student Lead: ${item.studentName} • Stage: ${item.projectStage}`}
                    </p>
                  </div>

                  <Link
                    href={targetHref}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs transition self-start sm:self-center shrink-0 ${
                      isReadyForReview
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                        : 'bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A]'
                    }`}
                  >
                    {isReadyForReview ? 'Approve & Open Grading Rubric' : 'Open Grading Rubric'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        className={`rounded-2xl border p-6 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm">Recent Student Messages &amp; Check-In Notes</h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
              {recentMessages.length}
            </span>
          </div>
          <Link
            href="/mentor/evaluation"
            className="text-xs font-bold text-amber-500 hover:underline"
          >
            Open Grading &amp; Rubrics &rarr;
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center animate-pulse">
            Loading student messages...
          </p>
        ) : recentMessages.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No student check-in notes yet. Messages sent by your students will appear here in real
            time.
          </p>
        ) : (
          <div className="grid gap-2.5">
            {recentMessages.map((msg) => {
              const replyHref = msg.studentId
                ? `/mentor/evaluation?studentId=${encodeURIComponent(msg.studentId)}${
                    msg.projectId ? `&projectId=${encodeURIComponent(msg.projectId)}` : ''
                  }`
                : '/mentor/evaluation'

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border ${
                    isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/60'
                      : 'bg-[#fffaf5] border-[#ece0d3]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-amber-600">{msg.senderName}</span>
                      {msg.createdAt && (
                        <span className="text-[10px] text-slate-400">
                          • {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  <Link
                    href={replyHref}
                    className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 font-bold text-[11px] transition self-start sm:self-center shrink-0"
                  >
                    Open Rubric
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}