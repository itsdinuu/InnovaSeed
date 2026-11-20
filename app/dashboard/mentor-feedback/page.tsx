"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

const PROJECT_WORKSPACE_PATH = '/dashboard/workspace'

type MentorOption = {
  id: string
  full_name: string
  email?: string
  mentor_code: string
  specialization?: string | null
}

type LinkRecord = {
  id: string
  student_id: string
  mentor_id: string
  project_id?: string | null
  status: 'pending' | 'accepted' | 'rejected' | string
  check_in_note?: string | null
  created_at?: string
  updated_at?: string
}

type FeedbackRow = {
  id: string | number
  mentor_name?: string | null
  comment?: string | null
  feedback_text?: string | null
  created_at?: string | null
  inserted_at?: string | null
  is_read?: boolean | null
}

type DisplayFeedbackItem = {
  id: string | number
  senderLabel: string
  text: string
  createdAt?: string | null
  isStudentNote?: boolean
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

function parseScopedFeedback(rawText: string): {
  mentorId: string | null
  studentId: string | null
  projectId: string | null
  direction: 'MENTOR_TO_STUDENT' | 'STUDENT_TO_MENTOR' | null
  cleanText: string
} {
  const match = rawText.match(/^\[LINK:([^|\]]*)\|([^|\]]*)\|([^|\]]*)(?:\|([^\]]*))?\]\s*([\s\S]*)$/)
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

export default function MentorFeedbackClient() {
  const router = useRouter()
  const pathname = usePathname()
  const { isDarkMode } = useTheme()

  const [studentUserId, setStudentUserId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string>('Student')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeProjectTitle, setActiveProjectTitle] = useState<string>('Active Innovation Project')

  const [mentors, setMentors] = useState<MentorOption[]>([])
  const [mentorCodeInput, setMentorCodeInput] = useState('')
  const [currentLink, setCurrentLink] = useState<LinkRecord | null>(null)
  const [feedbackNotes, setFeedbackNotes] = useState<DisplayFeedbackItem[]>([])
  const [checkInNote, setCheckInNote] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submittingLink, setSubmittingLink] = useState(false)
  const [goingToWorkspace, setGoingToWorkspace] = useState(false)
  const [isSendingNote, setIsSendingNote] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const navResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [toast, setToast] = useState<{
    title: string
    message: string
    type?: 'success' | 'error'
  } | null>(null)

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' = 'success'
  ) => {
    setToast({ title, message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Ensure button state never stays stuck when returning to this view

    useEffect(() => {
    if (!pathname) return
    queueMicrotask(() => {
      setGoingToWorkspace(false)
    })
  }, [pathname])

  useEffect(() => {
    const resetNavState = () => {
      if (navResetTimerRef.current) {
        clearTimeout(navResetTimerRef.current)
        navResetTimerRef.current = null
      }
      setGoingToWorkspace(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetNavState()
      }
    }

    window.addEventListener('pageshow', resetNavState)
    window.addEventListener('focus', resetNavState)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (navResetTimerRef.current) {
        clearTimeout(navResetTimerRef.current)
      }
      window.removeEventListener('pageshow', resetNavState)
      window.removeEventListener('focus', resetNavState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadStudentContext() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        if (isMounted) setLoading(false)
        return
      }

      const uid = session.user.id
      if (isMounted) setStudentUserId(uid)

      const [{ data: projectsData }, { data: profData }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      ])

      const profObj = (profData || {}) as Record<string, unknown>
      const resolvedStudentName =
        firstNonEmpty(
          profObj.full_name,
          profObj.name,
          session.user.user_metadata?.full_name,
          typeof session.user.email === 'string' ? session.user.email.split('@')[0] : null
        ) || 'Student'

      if (isMounted) setStudentName(resolvedStudentName)

      const rows = (projectsData || []) as Record<string, unknown>[]
      const ownedProject = rows.find((proj) => {
        const owner = proj.user_id ?? proj.author_id ?? proj.owner_id ?? proj.student_id
        return owner !== undefined && owner !== null && String(owner) === uid
      })

      if (isMounted && ownedProject) {
        setActiveProjectId(ownedProject.id ? String(ownedProject.id) : null)
        const title = firstNonEmpty(ownedProject.title, ownedProject.project_title)
        if (title) setActiveProjectTitle(title)
      }
    }

    void loadStudentContext()

    return () => {
      isMounted = false
    }
  }, [])

  const fetchMentorsAndLinkState = useCallback(
    async (silent = false) => {
      if (!studentUserId) {
        setLoading(false)
        return
      }

      if (!silent) setLoading(true)

      try {
        const [{ data: profilesData }, { data: linksData }, { data: feedbackRows }] =
          await Promise.all([
            supabase.from('profiles').select('*'),
            supabase
              .from('mentor_students')
              .select('*')
              .eq('student_id', studentUserId)
              .order('created_at', { ascending: false }),
            supabase.from('mentor_feedback').select('*').order('id', { ascending: false }),
          ])

        const allProfiles = (profilesData || []) as Record<string, unknown>[]
        const myProfile = allProfiles.find((p) => String(p.id || '') === studentUserId)
        const profileMentorId = myProfile?.mentor_id ? String(myProfile.mentor_id) : null

        const mentorList: MentorOption[] = allProfiles
          .filter((p) => {
            const role = typeof p.role === 'string' ? p.role.toLowerCase() : ''
            return role === 'mentor' || role === 'faculty' || Boolean(p.mentor_code)
          })
          .map((p) => {
            const id = String(p.id || '')
            const rawCode = firstNonEmpty(p.mentor_code)
            const resolvedCode =
              rawCode && !isUuidLike(rawCode)
                ? rawCode.toUpperCase()
                : `MTR-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

            return {
              id,
              full_name:
                firstNonEmpty(p.full_name, p.name) ||
                (typeof p.email === 'string' ? p.email.split('@')[0] : 'Mentor'),
              email: typeof p.email === 'string' ? p.email : undefined,
              mentor_code: resolvedCode,
              specialization: firstNonEmpty(p.specialization, p.research_field, p.department),
            }
          })

        setMentors(mentorList)

        const links = ((linksData || []) as Record<string, unknown>[]).map((row) => ({
          ...(row as unknown as LinkRecord),
          id: String(row.id),
          student_id: String(row.student_id || ''),
          mentor_id: String(row.mentor_id || ''),
          status: String(row.status || 'pending'),
        }))

        let activeOrPending: LinkRecord | null =
          links.find((l) => l.status === 'accepted') ||
          links.find((l) => l.status === 'pending') ||
          links[0] ||
          null

        if (!activeOrPending && profileMentorId) {
          activeOrPending = {
            id: `profile-link-${studentUserId}`,
            student_id: studentUserId,
            mentor_id: profileMentorId,
            project_id: activeProjectId,
            status: 'accepted',
          }
        }

        setCurrentLink(activeOrPending)

        if (activeOrPending?.mentor_id) {
          const matchedMentor = mentorList.find((m) => m.id === activeOrPending.mentor_id)
          if (matchedMentor && !mentorCodeInput) {
            setMentorCodeInput(matchedMentor.mentor_code)
          }
        }

        const connectedMentorId =
          activeOrPending?.status === 'accepted' ? activeOrPending.mentor_id : null
        const connectedMentorObj = connectedMentorId
          ? mentorList.find((m) => m.id === connectedMentorId) || null
          : null

        const scopedNotes: DisplayFeedbackItem[] = []

        if (connectedMentorId && Array.isArray(feedbackRows)) {
          for (const rawRow of feedbackRows as FeedbackRow[]) {
            const rawBody = firstNonEmpty(rawRow.feedback_text, rawRow.comment)
            if (!rawBody) continue

            const parsed = parseScopedFeedback(rawBody)
            if (!parsed.mentorId || !parsed.studentId) continue
            if (parsed.mentorId !== connectedMentorId || parsed.studentId !== studentUserId) {
              continue
            }

            const isStudentNote = parsed.direction === 'STUDENT_TO_MENTOR'
            scopedNotes.push({
              id: rawRow.id,
              senderLabel: isStudentNote
                ? `${studentName} (You)`
                : firstNonEmpty(rawRow.mentor_name, connectedMentorObj?.full_name) || 'Mentor',
              text: parsed.cleanText,
              createdAt: rawRow.inserted_at || rawRow.created_at,
              isStudentNote,
            })
          }
        }

        setFeedbackNotes(scopedNotes)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [studentUserId, studentName, activeProjectId, mentorCodeInput]
  )

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchMentorsAndLinkState(false)
      showToast('Refreshed', 'Mentor connection and feedback status updated.')
    } finally {
      setRefreshing(false)
    }
  }, [fetchMentorsAndLinkState])

  useEffect(() => {
    const triggerFetch = (silent: boolean) => {
      queueMicrotask(() => {
        void fetchMentorsAndLinkState(silent)
      })
    }

    triggerFetch(false)

    if (!studentUserId) return

    const channel = supabase
      .channel(`realtime-student-mentor-link-${studentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_students',
          filter: `student_id=eq.${studentUserId}`,
        },
        () => {
          triggerFetch(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${studentUserId}`,
        },
        () => {
          triggerFetch(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_feedback',
        },
        () => {
          triggerFetch(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMentorsAndLinkState, studentUserId])

  const linkedMentor = currentLink
    ? mentors.find((m) => m.id === currentLink.mentor_id) || null
    : null

  async function handleRequestMentorLink(targetMentor?: MentorOption) {
    if (!studentUserId || submittingLink) return

    const codeToMatch = (targetMentor?.mentor_code || mentorCodeInput).trim().toUpperCase()
    if (!codeToMatch) {
      showToast('Missing Code', 'Please enter a valid mentor code first.', 'error')
      return
    }

    const foundMentor =
      targetMentor || mentors.find((m) => m.mentor_code.toUpperCase() === codeToMatch)

    if (!foundMentor) {
      showToast(
        'Mentor Not Found',
        `No mentor matches code "${codeToMatch}". Check the code and try again.`,
        'error'
      )
      return
    }

    setSubmittingLink(true)

    try {
      const { data: existingRows } = await supabase
        .from('mentor_students')
        .select('*')
        .eq('student_id', studentUserId)
        .eq('mentor_id', foundMentor.id)
        .order('created_at', { ascending: false })

      const existing = (existingRows || [])[0] as LinkRecord | undefined

      if (existing) {
        if (existing.status === 'accepted') {
          showToast(
            'Already Connected',
            `You are already connected to ${foundMentor.full_name} (${foundMentor.mentor_code}).`
          )
          await fetchMentorsAndLinkState(true)
          return
        }

        const { error: updErr } = await supabase
          .from('mentor_students')
          .update({
            status: 'pending',
            project_id: activeProjectId ?? existing.project_id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase.from('mentor_students').insert({
          student_id: studentUserId,
          mentor_id: foundMentor.id,
          project_id: activeProjectId,
          status: 'pending',
        })

        if (insErr) throw insErr
      }

      setMentorCodeInput(foundMentor.mentor_code)
      showToast(
        'Request Sent',
        `Link request sent to ${foundMentor.full_name} (${foundMentor.mentor_code}). Awaiting mentor approval.`
      )
      await fetchMentorsAndLinkState(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send link request'
      showToast('Request Failed', msg, 'error')
    } finally {
      setSubmittingLink(false)
    }
  }

  async function handleUnlinkMentor() {
    if (!studentUserId || !currentLink || unlinking) return
    setUnlinking(true)

    try {
      if (!currentLink.id.startsWith('profile-link-')) {
        const { error: delErr } = await supabase
          .from('mentor_students')
          .delete()
          .eq('id', currentLink.id)

        if (delErr) throw delErr
      }

      await supabase.from('profiles').update({ mentor_id: null }).eq('id', studentUserId)

      if (activeProjectId) {
        await supabase.from('projects').update({ mentor_id: null }).eq('id', activeProjectId)
      }

      showToast(
        'Mentor Unlinked',
        `Disconnected from ${linkedMentor?.full_name || 'mentor'}.`
      )
      setCurrentLink(null)
      setFeedbackNotes([])
      await fetchMentorsAndLinkState(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unlink mentor'
      showToast('Unlink Failed', msg, 'error')
    } finally {
      setUnlinking(false)
    }
  }

  function handleRequestMentorReviewClick() {
    if (goingToWorkspace) return
    setGoingToWorkspace(true)

    if (navResetTimerRef.current) {
      clearTimeout(navResetTimerRef.current)
    }
    navResetTimerRef.current = setTimeout(() => {
      setGoingToWorkspace(false)
    }, 2500)

    router.push(PROJECT_WORKSPACE_PATH)
  }

  async function handleBottomSendClick() {
    if (!studentUserId || !currentLink || currentLink.status !== 'accepted' || isSendingNote) {
      return
    }

    const rawText = checkInNote.trim()
    if (!rawText) return

    setIsSendingNote(true)

    try {
      const scopedPayloadText = `[LINK:${currentLink.mentor_id}|${studentUserId}|${
        activeProjectId || ''
      }|STUDENT_TO_MENTOR] ${rawText}`
      const todayDate = new Date().toISOString().slice(0, 10)

      const { error: fbErr } = await supabase.from('mentor_feedback').insert({
        mentor_name: linkedMentor?.full_name || 'Mentor',
        comment: scopedPayloadText,
        feedback_text: scopedPayloadText,
        created_at: todayDate,
        is_read: false,
      })

      if (fbErr) throw fbErr

      if (!currentLink.id.startsWith('profile-link-')) {
        await supabase
          .from('mentor_students')
          .update({
            check_in_note: rawText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentLink.id)
      }

      await supabase.from('notifications').insert({
        user_id: currentLink.mentor_id,
        title: `Check-in from ${studentName}`,
        message: rawText,
        is_read: false,
      })

      setCheckInNote('')
      showToast('Sent', 'Your check-in note has been sent to your mentor.')
      await fetchMentorsAndLinkState(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send update'
      showToast('Send Failed', msg, 'error')
    } finally {
      setIsSendingNote(false)
    }
  }

  const isAccepted = currentLink?.status === 'accepted'
  const isPending = currentLink?.status === 'pending'
  const isRejected = currentLink?.status === 'rejected'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Card */}
      <div
        className={`border rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#e6d6c5] text-[#221a12]'
        }`}
      >
        <div>
          <h1 className="text-2xl font-extrabold">Mentor Feedback &amp; Link</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#6b5a49]'}`}>
            Request a mentor connection using their{' '}
            <code className="font-mono font-semibold">mentor_code</code>. Access unlocks once your
            mentor approves.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={refreshing}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-[#fffaf5] border-[#decab4] text-[#221a12] hover:bg-[#fff2e5]'
            }`}
          >
            <i className={`fa-solid fa-rotate-right ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {isAccepted && linkedMentor && (
            <span className="px-3.5 py-2 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold">
              Linked: {linkedMentor.full_name} ({linkedMentor.mentor_code})
            </span>
          )}
          {isPending && linkedMentor && (
            <span className="px-3.5 py-2 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs font-bold">
              Pending Approval: {linkedMentor.full_name} ({linkedMentor.mentor_code})
            </span>
          )}
          {isRejected && linkedMentor && (
            <span className="px-3.5 py-2 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30 text-xs font-bold">
              Denied by {linkedMentor.full_name}
            </span>
          )}
        </div>
      </div>

      {/* Link via Mentor Code Card */}
      <div
        className={`border rounded-2xl p-6 shadow-xs space-y-5 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#e6d6c5] text-[#221a12]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span className="text-amber-500">🔑</span>
            <span>Link via Mentor Code</span>
          </div>
          <p className="text-xs text-slate-400">
            Active Project:{' '}
            <strong className="text-amber-500 font-semibold">{activeProjectTitle}</strong>
          </p>
        </div>

        {!isAccepted && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="Enter Mentor Code (e.g. MTR-759215)..."
              value={mentorCodeInput}
              onChange={(e) => setMentorCodeInput(e.target.value.toUpperCase())}
              className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold uppercase outline-none border ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400'
                  : 'bg-[#fffaf5] border-[#decab4] text-[#221a12]'
              }`}
            />
            <button
              type="button"
              onClick={() => void handleRequestMentorLink()}
              disabled={submittingLink}
              className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {submittingLink ? 'Sending Request...' : 'Request Mentor Link'}
            </button>
          </div>
        )}

        {linkedMentor && currentLink && (
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border ${
              isDarkMode
                ? 'bg-slate-800/60 border-slate-700'
                : 'bg-[#fffaf5] border-[#ece0d3]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-600 font-extrabold text-xs grid place-items-center shrink-0">
                {linkedMentor.full_name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-sm">{linkedMentor.full_name}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 font-mono text-[11px] font-bold">
                    {linkedMentor.mentor_code}
                  </span>
                  {currentLink.status === 'accepted' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[11px] font-bold">
                      Approved
                    </span>
                  )}
                  {currentLink.status === 'pending' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[11px] font-bold">
                      Pending Approval
                    </span>
                  )}
                  {currentLink.status === 'rejected' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 text-[11px] font-bold">
                      Denied
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentLink.status === 'accepted'
                    ? 'mentor'
                    : currentLink.status === 'pending'
                    ? 'Waiting for mentor to accept your link request'
                    : 'Link request was denied by mentor'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {currentLink.status === 'accepted' && (
                <button
                  type="button"
                  onClick={handleRequestMentorReviewClick}
                  disabled={goingToWorkspace}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {goingToWorkspace ? 'Opening Workspace...' : 'Request Mentor Review'}
                </button>
              )}

              {currentLink.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => void handleRequestMentorLink(linkedMentor)}
                  disabled={submittingLink}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submittingLink ? 'Resending...' : 'Resend Request'}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleUnlinkMentor()}
                disabled={unlinking}
                className={`px-4 py-2 rounded-xl border font-semibold text-xs transition cursor-pointer disabled:opacity-50 ${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'border-[#decab4] bg-white hover:bg-[#fff2e5] text-[#221a12]'
                }`}
              >
                {unlinking
                  ? 'Unlinking...'
                  : currentLink.status === 'pending'
                  ? 'Cancel Request'
                  : 'Unlink Mentor'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Two-Column Section: Feedback & Check-In */}
      <div className="grid md:grid-cols-2 gap-6">
        <div
          className={`border rounded-2xl p-6 shadow-xs space-y-4 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-[#e6d6c5] text-[#221a12]'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <h2 className="font-bold text-sm">
              Feedback from {isAccepted && linkedMentor ? linkedMentor.full_name : 'Mentor'}
            </h2>
            <span className="text-xs text-slate-400">{feedbackNotes.length} Notes</span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-8 text-center animate-pulse">
              Loading mentor feedback...
            </p>
          ) : feedbackNotes.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              {isAccepted && linkedMentor
                ? `No feedback entries from ${linkedMentor.full_name} yet. Click Request Mentor Review to open your Project Workspace.`
                : 'Connect with a mentor and wait for approval to receive coaching feedback.'}
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {feedbackNotes.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    isDarkMode
                      ? 'bg-slate-800/60 border-slate-700'
                      : 'bg-[#fffaf5] border-[#ece0d3]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-bold ${
                        item.isStudentNote ? 'text-sky-500' : 'text-amber-500'
                      }`}
                    >
                      {item.senderLabel}
                    </span>
                    {item.createdAt && (
                      <span className="text-[11px] text-slate-400">{item.createdAt}</span>
                    )}
                  </div>
                  <p className="font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`border rounded-2xl p-6 shadow-xs space-y-4 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-[#e6d6c5] text-[#221a12]'
          }`}
        >
          <div className="border-b pb-3 border-inherit">
            <h2 className="font-bold text-sm">Send Check-In Note to Mentor</h2>
          </div>

          <textarea
            rows={4}
            placeholder="Share your latest prototype progress or questions for your mentor..."
            value={checkInNote}
            onChange={(e) => setCheckInNote(e.target.value)}
            disabled={!isAccepted || isSendingNote}
            className={`w-full rounded-xl p-3.5 text-xs outline-none border resize-none disabled:opacity-60 ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-100'
                : 'bg-[#fffaf5] border-[#decab4] text-[#221a12]'
            }`}
          />

          <button
            type="button"
            onClick={() => void handleBottomSendClick()}
            disabled={!isAccepted || isSendingNote || !checkInNote.trim()}
            className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            {isSendingNote
              ? 'Sending Update...'
              : isAccepted
              ? 'Send Update & Request Review'
              : 'Approve Link Required Before Sending'}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span
            className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${
              toast.type === 'error'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <i className={`fa-solid ${toast.type === 'error' ? 'fa-xmark' : 'fa-check'}`}></i>
          </span>
          <div>
            <b className="block text-slate-200">{toast.title}</b>
            <p className="text-slate-400">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}