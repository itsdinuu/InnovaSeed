"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type TeamRecord = {
  id: string | number
  team_name: string
  lead_id: string | null
  lead_name?: string | null
  institution: string | null
  research_field: string | null
  team_size: string | null
  mentor_code: string | null
  is_virtual?: boolean
  created_at?: string
}

type PendingLinkRequest = {
  id: string
  student_id: string
  project_id: string | null
  student_name: string
  student_email?: string
  matched_team_id: string | number | null
  team_name: string | null
  institution: string | null
  research_field: string | null
  team_size: string | null
  project_title: string
  created_at?: string
}

function isUuidLike(val?: string | null) {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}

function findStudentTeamRow(
  allTeams: Record<string, unknown>[],
  studentId: string,
  studentEmail?: string,
  studentName?: string,
  preferredTeamName?: string | null
): Record<string, unknown> | undefined {
  const byId = allTeams.find((t) => {
    const candidates = [
      t.lead_id,
      t.leader_id,
      t.user_id,
      t.created_by,
      t.student_id,
      t.owner_id,
    ]
    return candidates.some((c) => c !== undefined && c !== null && String(c) === studentId)
  })
  if (byId) return byId

  if (preferredTeamName) {
    const normTeam = preferredTeamName.trim().toLowerCase()
    const byTeamName = allTeams.find(
      (t) => typeof t.team_name === 'string' && t.team_name.trim().toLowerCase() === normTeam
    )
    if (byTeamName) return byTeamName
  }

  if (studentEmail) {
    const normEmail = studentEmail.trim().toLowerCase()
    const byEmail = allTeams.find((t) => {
      const emailCandidates = [t.email, t.lead_email, t.contact_email]
      return emailCandidates.some(
        (e) => typeof e === 'string' && e.trim().toLowerCase() === normEmail
      )
    })
    if (byEmail) return byEmail
  }

  if (studentName) {
    const normName = studentName.trim().toLowerCase()
    const byLeaderName = allTeams.find((t) => {
      const nameCandidates = [t.lead_name, t.leader_name, t.full_name, t.team_name]
      return nameCandidates.some(
        (n) => typeof n === 'string' && n.trim().toLowerCase() === normName
      )
    })
    if (byLeaderName) return byLeaderName
  }

  return undefined
}

function normalizeTeamRow(
  row: Record<string, unknown>,
  idx: number,
  profileMap?: Map<string, Record<string, unknown>>
): TeamRecord {
  const ownerId = firstNonEmpty(
    row.lead_id,
    row.leader_id,
    row.user_id,
    row.student_id,
    row.created_by
  )
  const ownerProfile = ownerId && profileMap ? profileMap.get(ownerId) : undefined

  return {
    id: (row.id as string | number) ?? idx + 1,
    team_name:
      firstNonEmpty(row.team_name, row.name, row.title, ownerProfile?.team_name) ||
      firstNonEmpty(ownerProfile?.full_name, ownerProfile?.name) ||
      `Team #${idx + 1}`,
    lead_id: ownerId,
    lead_name: firstNonEmpty(
      row.lead_name,
      row.leader_name,
      ownerProfile?.full_name,
      ownerProfile?.name
    ),
    institution: firstNonEmpty(
      row.institution,
      row.school_name,
      row.school,
      row.organization,
      ownerProfile?.institution,
      ownerProfile?.school_name,
      ownerProfile?.school
    ),
    research_field: firstNonEmpty(
      row.research_field,
      row.category,
      row.field,
      row.track
    ),
    team_size:
      row.team_size !== undefined && row.team_size !== null
        ? String(row.team_size)
        : '1',
    mentor_code: firstNonEmpty(row.mentor_code),
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}

export default function TeamManagementClient() {
  const { isDarkMode } = useTheme()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingLinkRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [mentorUserId, setMentorUserId] = useState<string | null>(null)
  const [activeMentorCode, setActiveMentorCode] = useState('')
  const [filterMentorCode, setFilterMentorCode] = useState('')
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

  // Mentor edit modal state
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editResearchField, setEditResearchField] = useState('')
  const [editTeamSize, setEditTeamSize] = useState('')
  const [editMentorCode, setEditMentorCode] = useState('')

  const [toast, setToast] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeamRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const triggerToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Load authenticated mentor ID & mentor_code from profiles
  useEffect(() => {
    let isMounted = true

    async function loadMentorProfileCode() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      const uid = session.user.id
      if (isMounted) setMentorUserId(uid)

      const { data: profile } = await supabase
        .from('profiles')
        .select('mentor_code')
        .eq('id', uid)
        .maybeSingle()

      const rawCode = profile?.mentor_code ? String(profile.mentor_code).trim() : ''
      const resolvedCode =
        rawCode && !isUuidLike(rawCode)
          ? rawCode
          : `MTR-${uid.replace(/-/g, '').slice(0, 6).toUpperCase()}`

      if (isMounted) {
        setActiveMentorCode(resolvedCode)
        setFilterMentorCode(resolvedCode)
      }
    }

    void loadMentorProfileCode()

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch pending student link requests & match against real registration data
  const fetchPendingRequests = useCallback(async () => {
    if (!mentorUserId) return

    const { data: reqRows, error } = await supabase
      .from('mentor_students')
      .select('*')
      .eq('mentor_id', mentorUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error || !reqRows) {
      setPendingRequests([])
      return
    }

    const [{ data: profilesData }, { data: projectsData }, { data: allTeamsData }] =
      await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
      ])

    const profileMap = new Map<string, Record<string, unknown>>()
    ;((profilesData || []) as Record<string, unknown>[]).forEach((p) => {
      if (p.id) profileMap.set(String(p.id), p)
    })

    const projectById = new Map<string, Record<string, unknown>>()
    const projectByStudent = new Map<string, Record<string, unknown>>()
    ;((projectsData || []) as Record<string, unknown>[]).forEach((proj) => {
      if (proj.id) projectById.set(String(proj.id), proj)
      const owner = proj.user_id ?? proj.author_id ?? proj.owner_id ?? proj.student_id
      if (owner && !projectByStudent.has(String(owner))) {
        projectByStudent.set(String(owner), proj)
      }
    })

    const allTeamRows = (allTeamsData || []) as Record<string, unknown>[]

    const mapped: PendingLinkRequest[] = ((reqRows || []) as Record<string, unknown>[]).map(
      (r) => {
        const sid = String(r.student_id || '')
        const sProf = profileMap.get(sid)
        const sEmail = typeof sProf?.email === 'string' ? sProf.email : undefined
        const sName =
          firstNonEmpty(sProf?.full_name, sProf?.name, r.student_name) ||
          (sEmail ? sEmail.split('@')[0] : 'Student')

        const linkedProj =
          (r.project_id ? projectById.get(String(r.project_id)) : undefined) ||
          projectByStudent.get(sid)

        const preferredTeam = firstNonEmpty(
          r.team_name,
          linkedProj?.team_name,
          sProf?.team_name
        )

        const matchedTeam = findStudentTeamRow(
          allTeamRows,
          sid,
          sEmail,
          sName,
          preferredTeam
        )

        return {
          id: String(r.id),
          student_id: sid,
          project_id: r.project_id
            ? String(r.project_id)
            : linkedProj?.id
            ? String(linkedProj.id)
            : null,
          student_name: sName,
          student_email: sEmail,
          matched_team_id:
            matchedTeam?.id !== undefined && matchedTeam?.id !== null
              ? (matchedTeam.id as string | number)
              : null,
          team_name: firstNonEmpty(
            matchedTeam?.team_name,
            matchedTeam?.name,
            r.team_name,
            linkedProj?.team_name,
            sProf?.team_name
          ),
          institution: firstNonEmpty(
            matchedTeam?.institution,
            matchedTeam?.school_name,
            matchedTeam?.school,
            r.institution,
            linkedProj?.institution,
            sProf?.institution,
            sProf?.school_name,
            sProf?.school
          ),
          research_field: firstNonEmpty(
            matchedTeam?.research_field,
            matchedTeam?.category,
            linkedProj?.category,
            linkedProj?.research_field
          ),
          team_size: firstNonEmpty(matchedTeam?.team_size),
          project_title:
            firstNonEmpty(linkedProj?.title, linkedProj?.project_title, r.project_title) ||
            'Student Innovation Project',
          created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
        }
      }
    )

    setPendingRequests(mapped)
  }, [mentorUserId])

  // Fetch connected teams from `teams` AND synthesize entries for any `accepted` mentees
  const fetchTeams = useCallback(async () => {
    setLoading(true)

    const [{ data: allTeamsData }, { data: profilesData }, { data: projectsData }, acceptedLinksRes] =
      await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        mentorUserId
          ? supabase
              .from('mentor_students')
              .select('*')
              .eq('mentor_id', mentorUserId)
              .eq('status', 'accepted')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      ])

    const profileMap = new Map<string, Record<string, unknown>>()
    ;((profilesData || []) as Record<string, unknown>[]).forEach((p) => {
      if (p.id) profileMap.set(String(p.id), p)
    })

    const projectById = new Map<string, Record<string, unknown>>()
    const projectByStudent = new Map<string, Record<string, unknown>>()
    ;((projectsData || []) as Record<string, unknown>[]).forEach((proj) => {
      if (proj.id) projectById.set(String(proj.id), proj)
      const owner = proj.user_id ?? proj.author_id ?? proj.owner_id ?? proj.student_id
      if (owner && !projectByStudent.has(String(owner))) {
        projectByStudent.set(String(owner), proj)
      }
    })

    const allRows = (allTeamsData || []) as Record<string, unknown>[]
    const acceptedRows = (((acceptedLinksRes as { data?: Record<string, unknown>[] } | null)
      ?.data || []) as Record<string, unknown>[])

    const acceptedStudentIds = new Set<string>(
      acceptedRows
        .map((row) => (row.student_id ? String(row.student_id) : ''))
        .filter(Boolean)
    )

    const trimmedFilter = filterMentorCode.trim().toLowerCase()

    const filteredRows = allRows.filter((row) => {
      if (!trimmedFilter) return true

      const rowCode =
        typeof row.mentor_code === 'string' ? row.mentor_code.trim().toLowerCase() : ''
      if (rowCode.includes(trimmedFilter)) return true

      const ownerId = firstNonEmpty(
        row.lead_id,
        row.leader_id,
        row.user_id,
        row.student_id,
        row.created_by
      )
      if (ownerId && acceptedStudentIds.has(ownerId)) {
        return true
      }

      return false
    })

    const normalizedList: TeamRecord[] = filteredRows.map((r, idx) =>
      normalizeTeamRow(r, idx, profileMap)
    )

    // Track which accepted students already have a team card rendered
    const representedStudentIds = new Set<string>(
      normalizedList.map((t) => t.lead_id || '').filter(Boolean)
    )

    // Ensure every accepted student in `mentor_students` is immediately visible even if `teams` row was blocked/unlinked
    acceptedRows.forEach((accRow, idx) => {
      const sid = accRow.student_id ? String(accRow.student_id) : ''
      if (!sid || representedStudentIds.has(sid)) return

      const sProf = profileMap.get(sid)
      const sEmail = typeof sProf?.email === 'string' ? sProf.email : undefined
      const sName =
        firstNonEmpty(sProf?.full_name, sProf?.name, accRow.student_name) ||
        (sEmail ? sEmail.split('@')[0] : 'Student')

      const linkedProj =
        (accRow.project_id ? projectById.get(String(accRow.project_id)) : undefined) ||
        projectByStudent.get(sid)

      const matchedTeam = findStudentTeamRow(allRows, sid, sEmail, sName)

      if (matchedTeam) {
        normalizedList.push(normalizeTeamRow(matchedTeam, normalizedList.length + idx, profileMap))
        representedStudentIds.add(sid)
        return
      }

      const resolvedTeamName =
        firstNonEmpty(accRow.team_name, linkedProj?.team_name, sProf?.team_name) || sName

      const resolvedInstitution = firstNonEmpty(
        accRow.institution,
        linkedProj?.institution,
        sProf?.institution,
        sProf?.school_name,
        sProf?.school
      )

      const resolvedField = firstNonEmpty(
        linkedProj?.category,
        linkedProj?.research_field,
        linkedProj?.title
      )

      normalizedList.push({
        id: `accepted-${accRow.id || sid}`,
        team_name: resolvedTeamName,
        lead_id: sid,
        lead_name: sName,
        institution: resolvedInstitution,
        research_field: resolvedField,
        team_size: '1',
        mentor_code: activeMentorCode || filterMentorCode || 'CONNECTED',
        is_virtual: true,
        created_at: typeof accRow.created_at === 'string' ? accRow.created_at : undefined,
      })

      representedStudentIds.add(sid)
    })

    setTeams(normalizedList)
    setLoading(false)
  }, [activeMentorCode, filterMentorCode, mentorUserId])

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchTeams(), fetchPendingRequests()])
      triggerToast('Team and request data refreshed.')
    } finally {
      setRefreshing(false)
    }
  }, [fetchTeams, fetchPendingRequests])

  useEffect(() => {
    const triggerFetch = () => {
      queueMicrotask(() => {
        void fetchTeams()
        void fetchPendingRequests()
      })
    }

    triggerFetch()

    const channel = supabase
      .channel('realtime-mentor-teams-and-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          triggerFetch()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_students' },
        () => {
          triggerFetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTeams, fetchPendingRequests])

  // Accept student link request -> update `mentor_students` and link/sync `teams` row
  async function handleAcceptRequest(req: PendingLinkRequest) {
    if (!mentorUserId || processingRequestId) return
    setProcessingRequestId(req.id)

    try {
      const { error: updateErr } = await supabase
        .from('mentor_students')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id)

      if (updateErr) throw updateErr

      await supabase
        .from('profiles')
        .update({ mentor_id: mentorUserId })
        .eq('id', req.student_id)

      if (req.project_id) {
        await supabase
          .from('projects')
          .update({ mentor_id: mentorUserId })
          .eq('id', req.project_id)
      }

      const codeToAssign = (filterMentorCode.trim() || activeMentorCode).toUpperCase()

      const { data: latestTeams } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })

      const latestTeamRows = (latestTeams || []) as Record<string, unknown>[]
      const targetTeam =
        (req.matched_team_id !== null
          ? latestTeamRows.find(
              (t) => t.id !== undefined && String(t.id) === String(req.matched_team_id)
            )
          : undefined) ||
        findStudentTeamRow(
          latestTeamRows,
          req.student_id,
          req.student_email,
          req.student_name,
          req.team_name
        )

      if (targetTeam?.id !== undefined && targetTeam?.id !== null) {
        await supabase
          .from('teams')
          .update({
            mentor_code: codeToAssign,
            lead_id: targetTeam.lead_id ?? req.student_id,
          })
          .eq('id', targetTeam.id)
      } else {
        // Persist a real `teams` row using the student's actual registered profile/project data
        await supabase.from('teams').insert({
          team_name: req.team_name || req.student_name,
          lead_id: req.student_id,
          institution: req.institution || null,
          research_field: req.research_field || req.project_title || null,
          team_size: req.team_size || '1',
          mentor_code: codeToAssign,
        })
      }

      if (codeToAssign && !filterMentorCode.trim()) {
        setFilterMentorCode(codeToAssign)
      }

      triggerToast(
        `Link request from ${req.team_name || req.student_name} accepted. Now connected.`
      )
      await Promise.all([fetchPendingRequests(), fetchTeams()])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept link request'
      triggerToast(`Error: ${msg}`)
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Deny student link request -> mark rejected
  async function handleDenyRequest(req: PendingLinkRequest) {
    if (!mentorUserId || processingRequestId) return
    setProcessingRequestId(req.id)

    try {
      const { error: updateErr } = await supabase
        .from('mentor_students')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id)

      if (updateErr) throw updateErr

      triggerToast(`Link request from ${req.team_name || req.student_name} denied.`)
      await fetchPendingRequests()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deny link request'
      triggerToast(`Error: ${msg}`)
    } finally {
      setProcessingRequestId(null)
    }
  }

  function handleOpenModal(team: TeamRecord) {
    setSelectedTeam(team)
    setEditTeamName(team.team_name || '')
    setEditInstitution(team.institution || '')
    setEditResearchField(team.research_field || '')
    setEditTeamSize(team.team_size || '')
    setEditMentorCode(team.mentor_code || activeMentorCode || '')
  }

  async function handleSaveTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam) return

    if (selectedTeam.is_virtual) {
      // Create persistent row in `teams` if it wasn't persisted yet
      const { error } = await supabase.from('teams').insert({
        team_name: editTeamName,
        lead_id: selectedTeam.lead_id,
        institution: editInstitution,
        research_field: editResearchField,
        team_size: editTeamSize,
        mentor_code: editMentorCode,
      })

      if (!error) {
        triggerToast(`Team "${editTeamName}" saved successfully!`)
        setSelectedTeam(null)
        void fetchTeams()
      } else {
        triggerToast(`Failed to save team: ${error.message}`)
      }
      return
    }

    const { error } = await supabase
      .from('teams')
      .update({
        team_name: editTeamName,
        institution: editInstitution,
        research_field: editResearchField,
        team_size: editTeamSize,
        mentor_code: editMentorCode,
      })
      .eq('id', selectedTeam.id)

    if (!error) {
      triggerToast(`Team "${editTeamName}" updated successfully!`)
      setSelectedTeam(null)
      void fetchTeams()
    } else {
      triggerToast(`Failed to update team: ${error.message}`)
    }
  }

  async function handleDeleteTeam(team: TeamRecord) {
    setIsDeleting(true)

    if (team.is_virtual && team.lead_id && mentorUserId) {
      await supabase
        .from('mentor_students')
        .delete()
        .eq('mentor_id', mentorUserId)
        .eq('student_id', team.lead_id)

      triggerToast('Team connection removed.')
      void fetchTeams()
      return
    }

    const { error } = await supabase.from('teams').delete().eq('id', team.id)

    if (!error) {
      triggerToast('Team deleted successfully.')
      void fetchTeams()
    } else {
      triggerToast(`Error: ${error.message}`)
    }

    setIsDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div className="mo-stagger space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Faculty Team Control Panel 👥</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Approve incoming student link requests and manage teams already connected to your mentor code.
          </p>
        </div>

        {/* Mentor Code Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={refreshing}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff8f4]'
            }`}
          >
            <i className={`fa-solid fa-rotate-right ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <input
            type="text"
            placeholder="Filter by Mentor Code..."
            value={filterMentorCode}
            onChange={(e) => setFilterMentorCode(e.target.value)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase outline-none border ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-amber-400'
                : 'bg-white border-[#d8c3ad] text-amber-700'
            }`}
          />
          <button
            type="button"
            onClick={() => void fetchTeams()}
            className="px-4 py-2 bg-[#F59E0B] text-[#0F172A] text-xs font-bold rounded-xl hover:bg-[#D97706] transition cursor-pointer"
          >
            Filter
          </button>
          {filterMentorCode && (
            <button
              type="button"
              onClick={() => setFilterMentorCode('')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-[#d8c3ad] text-[#534434] hover:bg-[#fff8f4]'
              }`}
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {/* Pending Student Link Requests */}
      {pendingRequests.length > 0 && (
        <div
          className={`border rounded-2xl p-6 shadow-xs space-y-4 ${
            isDarkMode
              ? 'bg-slate-900 border-amber-500/40 text-slate-100'
              : 'bg-white border-amber-500/50 text-[#221a12]'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h2 className="font-bold text-sm">
                Pending Link Requests ({pendingRequests.length}) — Awaiting Your Approval
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Accept to link • Deny to reject</span>
          </div>

          <div className="grid gap-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-[#fff8f4] border-[#ebdcd0]'
                }`}
              >
                <div>
                  <h3 className="font-bold text-sm">
                    {req.team_name || req.student_name}
                    {req.team_name && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (Lead: {req.student_name})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Project: <strong className="text-amber-500">{req.project_title}</strong>
                    {req.institution ? ` • ${req.institution}` : ''}
                    {req.student_email ? ` • ${req.student_email}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => void handleAcceptRequest(req)}
                    disabled={processingRequestId === req.id}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {processingRequestId === req.id ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDenyRequest(req)}
                    disabled={processingRequestId === req.id}
                    className={`px-3.5 py-1.5 rounded-xl border font-semibold text-xs transition cursor-pointer disabled:opacity-50 ${
                      isDarkMode
                        ? 'border-slate-600 bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-200'
                        : 'border-[#d8c3ad] bg-white hover:bg-rose-50 text-[#221a12]'
                    }`}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-xs">
          Loading live team data from database...
        </div>
      ) : teams.length === 0 ? (
        <div
          className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-users-slash"></i>
          </div>
          <h3 className="font-bold">
            {filterMentorCode
              ? `No Teams Found for Code "${filterMentorCode}"`
              : 'No Student Teams Registered Yet'}
          </h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            No student teams have registered or linked this mentor code yet. Share your mentor code{' '}
            {activeMentorCode ? (
              <strong className="font-mono text-amber-500">{activeMentorCode}</strong>
            ) : (
              'with students'
            )}{' '}
            and approve incoming requests to establish connection.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`border rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                    Code: {team.mentor_code || 'Unlinked'}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                    }`}
                  >
                    Size: <strong className="text-amber-500">{team.team_size || '1'} Members</strong>
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg">{team.team_name}</h3>
                  {team.lead_name && team.lead_name !== team.team_name && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Team Lead: <strong>{team.lead_name}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                    <strong>Institution:</strong> {team.institution || 'Not Specified'}
                  </p>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                    <strong>Research Field:</strong>{' '}
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                      {team.research_field || 'Not Specified'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(team)}
                  className="px-3 py-2 text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition cursor-pointer"
                >
                  <i className="fa-solid fa-trash mr-1"></i> Delete
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenModal(team)}
                  className="px-4 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square mr-1"></i> Edit Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mentor Team Edit Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="font-bold text-base">Faculty Team Administration 🛠️</h3>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="w-7 h-7 rounded-full bg-slate-500/15 hover:bg-slate-500/25 grid place-items-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Institution</label>
                  <input
                    type="text"
                    required
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mentor Code</label>
                  <input
                    type="text"
                    required
                    value={editMentorCode}
                    onChange={(e) => setEditMentorCode(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl px-3.5 py-2.5 outline-none border uppercase font-bold text-amber-500 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Research Field / Category</label>
                  <input
                    type="text"
                    required
                    value={editResearchField}
                    onChange={(e) => setEditResearchField(e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Team Size</label>
                  <input
                    type="text"
                    required
                    value={editTeamSize}
                    onChange={(e) => setEditTeamSize(e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="px-4 py-2 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="mo-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />
          <div
            className={`mo-pop relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#d8c3ad]'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-red-500/15 text-red-500 grid place-items-center mb-4">
              <i className="fa-solid fa-trash text-lg"></i>
            </div>
            <h3 className="font-bold text-base">Delete team?</h3>
            <p
              className={`text-xs mt-1.5 leading-relaxed ${
                isDarkMode ? 'text-slate-400' : 'text-[#534434]'
              }`}
            >
              {deleteTarget.is_virtual ? (
                <>
                  This will remove your mentor connection with{' '}
                  <strong>{deleteTarget.team_name}</strong>. The student&apos;s team itself stays
                  intact, but you will no longer see or manage it here.
                </>
              ) : (
                <>
                  You are about to permanently delete{' '}
                  <strong>{deleteTarget.team_name}</strong>. This action cannot be undone.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fff1e5]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteTeam(deleteTarget)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash"></i>
                    <span>Yes, delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{toast}</p>
          </div>
        </div>
      )}
    </div>
  )
}