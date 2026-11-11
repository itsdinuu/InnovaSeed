"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type ReplyItem = {
  id: number | string
  feedback_id: number | string
  sender_name: string
  message: string
  created_at: string
}

type Feedback = {
  id: number | string
  mentor_name: string
  mentor_role?: string
  comment: string
  feedback_text?: string
  category?: string
  status?: string
  is_read?: boolean
  created_at?: string
  replies?: ReplyItem[]
}

export default function MentorFeedbackPage() {
  const { isDarkMode } = useTheme()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  
  // State untuk modal Reply
  const [replyingFeedback, setReplyingFeedback] = useState<Feedback | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  async function fetchFeedbacksAndReplies() {
    setLoading(true)

    const { data: fbData, error: fbError } = await supabase
      .from('mentor_feedback')
      .select('*')
      .order('id', { ascending: false })

    if (!fbError && fbData) {
      const { data: replyData, error: replyError } = await supabase
        .from('mentor_replies')
        .select('*')
        .order('id', { ascending: true })

      if (!replyError && replyData) {
        const combined = fbData.map(fb => ({
          ...fb,
          replies: replyData.filter(r => Number(r.feedback_id) === Number(fb.id))
        }))
        setFeedbacks(combined)
      } else {
        setFeedbacks(fbData)
      }

      // Tandai semua sebagai terbaca di database secara latar belakang
      await supabase
        .from('mentor_feedback')
        .update({ is_read: true })
        .eq('is_read', false)
    }

    setLoading(false)
  }

  useEffect(() => {
    const initialFetchTimer = window.setTimeout(() => {
      void fetchFeedbacksAndReplies()
    }, 0)

    // --- REALTIME SUBSCRIPTION SUPABASE (WEBSOCKET) ---
    const channel = supabase
      .channel('realtime-student-mentor-feedback')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_feedback' },
        () => {
          void fetchFeedbacksAndReplies()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_replies' },
        () => {
          void fetchFeedbacksAndReplies()
        }
      )
      .subscribe()

    return () => {
      window.clearTimeout(initialFetchTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleFeedbackRead(id: number | string) {
    // 1. Ubah state lokal seketika agar UI langsung merespons
    setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, is_read: true } : f))
    
    // 2. Update database
    await supabase.from('mentor_feedback').update({ is_read: true }).eq('id', id)
    
    setToastMessage("Feedback acknowledged successfully!")
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyingFeedback || !replyMessage.trim()) return

    const newReply = {
      feedback_id: replyingFeedback.id,
      sender_name: 'Team AlBot (Student)',
      message: replyMessage,
    }

    // 1. Kirim balasan ke tabel mentor_replies
    const { data, error } = await supabase
      .from('mentor_replies')
      .insert([newReply])
      .select()

    if (!error && data) {
      // 2. Update is_read jadi true di database untuk feedback ini
      await supabase
        .from('mentor_feedback')
        .update({ is_read: true })
        .eq('id', replyingFeedback.id)

      // 3. Perbarui state lokal
      setFeedbacks(feedbacks.map(fb => {
        if (fb.id === replyingFeedback.id) {
          return {
            ...fb,
            is_read: true,
            replies: [...(fb.replies || []), data[0]]
          }
        }
        return fb
      }))

      setToastMessage(`Reply successfully sent to ${replyingFeedback.mentor_name || 'Faculty Mentor'}!`)
      setReplyingFeedback(null)
      setReplyMessage('')
      
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } else {
      alert("Failed to send reply: " + error?.message)
    }
  }

  return (
    <div className="space-y-6 relative max-w-4xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <i className="fa-solid fa-comments text-amber-500"></i> Mentor Feedback &amp; Review 💬
          </h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Review real evaluations from faculty advisors and track discussion history.
          </p>
        </div>
      </div>

      {/* Daftar Feedback & History Balasan */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading feedback history from Supabase...</div>
      ) : feedbacks.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-envelope-open-text"></i>
          </div>
          <h3 className="font-bold">No Mentor Feedback Recorded</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Your Supabase table mentor_feedback is currently empty.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {feedbacks.map((fb) => (
            <div 
              key={fb.id} 
              className={`border rounded-2xl p-6 shadow-xs space-y-4 transition-colors ${
                fb.is_read 
                  ? (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]') 
                  : (isDarkMode ? 'bg-slate-900 border-amber-500/50 ring-2 ring-amber-500/20 text-slate-100' : 'bg-white border-amber-300 ring-2 ring-amber-400/20')
              }`}
            >
              {/* Header Kartu Feedback */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center text-sm">
                    {fb.mentor_name ? fb.mentor_name.charAt(0) : 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{fb.mentor_name || 'Faculty Mentor'}</h3>
                      {!fb.is_read && (
                        <span className="text-[9px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          New
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                      Faculty Reviewer • <span className="font-mono text-[10px]">{fb.created_at ? new Date(fb.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Recent'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Isi Komentar Mentor */}
              <div className={`border rounded-xl p-4 text-xs sm:text-sm leading-relaxed font-medium ${isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-[#fff1e5]/50 border-[#d8c3ad]/50 text-[#221a12]'}`}>
                &ldquo;{fb.comment || fb.feedback_text || 'No comment provided.'}&rdquo;
              </div>

              {/* TAMPILAN HISTORY REPLY / BALASAN */}
              {fb.replies && fb.replies.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-inherit">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Discussion History ({fb.replies.length})</h4>
                  <div className="space-y-2">
                    {fb.replies.map((reply) => (
                      <div 
                        key={reply.id} 
                        className={`p-3 rounded-xl border text-xs space-y-1 ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            <i className="fa-solid fa-reply mr-1.5 text-[10px]"></i>{reply.sender_name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{reply.created_at ? reply.created_at.split('T')[0] : ''}</span>
                        </div>
                        <p className={`text-xs pl-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setReplyingFeedback(fb)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'}`}
                >
                  Reply to Mentor
                </button>
                <button 
                  onClick={() => handleFeedbackRead(fb.id)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition cursor-pointer shadow-sm"
                >
                  {fb.is_read ? 'Acknowledged' : 'Acknowledge Feedback'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Reply */}
      {replyingFeedback && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <h3 className="font-bold text-sm">Reply to {replyingFeedback.mentor_name || 'Faculty Mentor'}</h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Send clarification or progress update.</p>
              </div>
              <button 
                onClick={() => setReplyingFeedback(null)}
                className="w-7 h-7 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Your Response / Clarification</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Type your message to the evaluator..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setReplyingFeedback(null)}
                  className="flex-1 py-2.5 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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