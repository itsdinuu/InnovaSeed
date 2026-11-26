"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

export type MessengerSenderRole = 'student' | 'mentor'

type MessengerProps = {
  studentId: string
  mentorId: string
  projectId?: string | null
  currentUserId: string
  currentUserName?: string
  senderRole: MessengerSenderRole
  partnerName?: string
  disabled?: boolean
  disabledReason?: string
}

type FeedbackRow = {
  id: number | string
  student_id?: string | null
  mentor_id?: string | null
  project_id?: string | null
  mentor_name?: string | null
  comment?: string | null
  feedback_text?: string | null
  is_read?: boolean | null
  created_at?: string | null
  inserted_at?: string | null
}

type ReplyRow = {
  id: number | string
  feedback_id?: number | string | null
  sender_name?: string | null
  message?: string | null
  created_at?: string | null
}

type ChatItem = {
  id: string
  senderName: string
  body: string
  createdAt?: string
  isReply: boolean
}

export default function Messenger({
  studentId,
  mentorId,
  projectId = null,
  currentUserId,
  currentUserName = 'User',
  senderRole,
  partnerName = 'Mentor',
  disabled = false,
  disabledReason = 'Approve link required before sending.',
}: MessengerProps) {
  const { isDarkMode } = useTheme()

  const [activeFeedbackId, setActiveFeedbackId] = useState<number | string | null>(null)
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const fetchConversation = useCallback(async () => {
    setStatusError(null)

    const { data: fbData, error: fbError } = await supabase
      .from('mentor_feedback')
      .select('*')
      .order('id', { ascending: true })

    if (fbError) {
      setStatusError(fbError.message)
      setLoading(false)
      return
    }

    const allFeedbacks = (fbData || []) as FeedbackRow[]

    const scopedFeedbacks = allFeedbacks.filter((fb) => {
      const matchesProject =
        projectId && fb.project_id ? String(fb.project_id) === String(projectId) : false
      const matchesStudent =
        studentId && fb.student_id ? String(fb.student_id) === String(studentId) : false
      const matchesMentor =
        mentorId && fb.mentor_id ? String(fb.mentor_id) === String(mentorId) : false

      if (fb.project_id || fb.student_id || fb.mentor_id) {
        return matchesProject || matchesStudent || matchesMentor
      }
      return true
    })

    const activePool = scopedFeedbacks.length > 0 ? scopedFeedbacks : allFeedbacks
    const latestFeedback = activePool.length > 0 ? activePool[activePool.length - 1] : null
    const resolvedFeedbackId = latestFeedback?.id ?? null
    setActiveFeedbackId(resolvedFeedbackId)

    const { data: repData, error: repError } = await supabase
      .from('mentor_replies')
      .select('id, feedback_id, sender_name, message, created_at')
      .order('created_at', { ascending: true })

    if (repError) {
      setStatusError(repError.message)
      setLoading(false)
      return
    }

    const replies = (repData || []) as ReplyRow[]
    const combined: ChatItem[] = []

    for (const fb of activePool) {
      const initialText = (fb.feedback_text || fb.comment || '').trim()
      if (initialText) {
        combined.push({
          id: `fb-${fb.id}`,
          senderName: (fb.mentor_name || partnerName || 'Mentor').trim(),
          body: initialText,
          createdAt: fb.created_at || fb.inserted_at || undefined,
          isReply: false,
        })
      }
    }

    const scopedReplies = resolvedFeedbackId
      ? replies.filter((r) => String(r.feedback_id) === String(resolvedFeedbackId))
      : replies

    for (const rep of scopedReplies) {
      const msgText = (rep.message || '').trim()
      if (msgText) {
        combined.push({
          id: `rep-${rep.id}`,
          senderName: (
            rep.sender_name || (senderRole === 'student' ? 'Student' : partnerName)
          ).trim(),
          body: msgText,
          createdAt: rep.created_at || undefined,
          isReply: true,
        })
      }
    }

    setMessages(combined)
    setLoading(false)
  }, [mentorId, partnerName, projectId, senderRole, studentId])

  useEffect(() => {
    const triggerFetch = () => {
      queueMicrotask(() => {
        void fetchConversation()
      })
    }

    triggerFetch()

    const channel = supabase
      .channel(`realtime-feedback-replies-${projectId ?? studentId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_feedback',
        },
        () => {
          triggerFetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_replies',
        },
        () => {
          triggerFetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchConversation, projectId, studentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function ensureFeedbackThread(): Promise<number | string | null> {
    if (activeFeedbackId !== null && activeFeedbackId !== undefined) {
      return activeFeedbackId
    }

    const todayDate = new Date().toISOString().slice(0, 10)
    const payloadWithMeta: Record<string, unknown> = {
      student_id: studentId || null,
      mentor_id: mentorId || null,
      project_id: projectId || null,
      mentor_name: partnerName || 'Mentor',
      comment: 'Initial innovation check-in thread',
      feedback_text: 'Initial innovation check-in thread',
      created_at: todayDate,
      is_read: false,
    }

    let { data, error } = await supabase
      .from('mentor_feedback')
      .insert(payloadWithMeta)
      .select('id')
      .single()

    if (error || !data) {
      const fallbackPayload = {
        mentor_name: partnerName || 'Mentor',
        comment: 'Initial innovation check-in thread',
        feedback_text: 'Initial innovation check-in thread',
        created_at: todayDate,
        is_read: false,
      }
      const retry = await supabase
        .from('mentor_feedback')
        .insert(fallbackPayload)
        .select('id')
        .single()
      data = retry.data
      error = retry.error
    }

    if (error || !data) {
      setStatusError(error?.message || 'Unable to create mentor_feedback thread.')
      return null
    }

    setActiveFeedbackId(data.id)
    return data.id
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (disabled || sending) return

    const text = draft.trim()
    if (!text) return

    setSending(true)
    setStatusError(null)

    try {
      const targetFeedbackId = await ensureFeedbackThread()
      if (!targetFeedbackId) {
        setSending(false)
        return
      }

      const displaySender =
        currentUserName && currentUserName.trim().length > 0
          ? currentUserName.trim()
          : senderRole === 'student'
          ? `Student (${currentUserId.slice(0, 6)})`
          : partnerName || 'Mentor'

      const { error: repErr } = await supabase.from('mentor_replies').insert({
        feedback_id: targetFeedbackId,
        sender_name: displaySender,
        message: text,
      })

      if (repErr) {
        setStatusError(repErr.message)
      } else {
        setDraft('')
        await fetchConversation()
      }
    } finally {
      setSending(false)
    }
  }

  function isMine(item: ChatItem): boolean {
    if (currentUserName && item.senderName.toLowerCase() === currentUserName.trim().toLowerCase()) {
      return true
    }
    if (senderRole === 'student') {
      return item.isReply && item.senderName.toLowerCase() !== (partnerName || 'mentor').toLowerCase()
    }
    return !item.isReply || item.senderName.toLowerCase() === (partnerName || 'mentor').toLowerCase()
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div
        className={`border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#e6d6c5] text-[#221a12]'
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm">Feedback &amp; Updates with {partnerName}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            </div>
            <span className="text-xs text-slate-400">{messages.length} Messages</span>
          </div>

          {statusError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs">
              {statusError}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400 py-8 text-center animate-pulse">
              Loading real-time conversation...
            </p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              No messages with {partnerName} yet. Send a progress update or feedback to start the
              thread.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg) => {
                const mine = isMine(msg)
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs space-y-1 border ${
                        mine
                          ? 'bg-[#F59E0B] text-[#0F172A] border-[#D97706] font-medium rounded-br-sm'
                          : isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-100 rounded-bl-sm'
                          : 'bg-[#fffaf5] border-[#ece0d3] text-[#221a12] rounded-bl-sm'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold ${
                          mine ? 'text-[#0F172A]/80' : 'text-amber-600'
                        }`}
                      >
                        {msg.senderName}
                      </p>
                      <p className="whitespace-pre-wrap wrap-break-words">{msg.body}</p>
                      {msg.createdAt && (
                        <p
                          className={`text-[10px] ${
                            mine ? 'text-[#0F172A]/75' : 'text-slate-400'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSend(e)}
        className={`border rounded-2xl p-6 shadow-xs space-y-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#e6d6c5] text-[#221a12]'
        }`}
      >
        <div className="border-b pb-3 border-inherit flex items-center justify-between">
          <h2 className="font-bold text-sm">
            {senderRole === 'student'
              ? 'Send Check-In Note to Mentor'
              : `Send Feedback to ${partnerName}`}
          </h2>
          <span className="text-[11px] text-slate-400 capitalize">{senderRole}</span>
        </div>

        <textarea
          rows={4}
          placeholder={
            senderRole === 'student'
              ? 'Share your latest prototype progress or questions for your mentor...'
              : 'Write actionable feedback or next steps for your student...'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled || sending}
          className={`w-full rounded-xl p-3.5 text-xs outline-none border resize-none disabled:opacity-60 ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700 text-slate-100'
              : 'bg-[#fffaf5] border-[#decab4] text-[#221a12]'
          }`}
        />

        <button
          type="submit"
          disabled={disabled || sending || !draft.trim()}
          className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold text-xs transition cursor-pointer disabled:opacity-50"
        >
          {sending
            ? 'Sending...'
            : disabled
            ? disabledReason
            : senderRole === 'student'
            ? 'Send Update'
            : 'Send Feedback'}
        </button>
      </form>
    </div>
  )
}