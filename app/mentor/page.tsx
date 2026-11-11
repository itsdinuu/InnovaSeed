"use client"

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type ReplyItem = {
  id: number | string
  feedback_id: number | string
  sender_name: string
  message: string
  created_at: string
}

type MentorFeedback = {
  id: number | string
  mentor_name: string
  comment: string
  created_at: string
  is_read: boolean
  replies?: ReplyItem[]
}

export default function MentorDashboardPage() {
  const { isDarkMode } = useTheme()
  const [feedbacks, setFeedbacks] = useState<MentorFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [mentorName] = useState('Dr. Maya (Faculty Lead)')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fetchFeedbacksAndReplies = useCallback(async () => {
    setLoading(true)

    // 1. Ambil data feedback mentor
    const { data: fbData, error: fbError } = await supabase
      .from('mentor_feedback')
      .select('*')
      .order('id', { ascending: false })

    if (!fbError && fbData) {
      // 2. Ambil data replies siswa
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
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFeedbacksAndReplies()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchFeedbacksAndReplies])

  // Fungsi mentor mengirim catatan baru ke database
  async function handleAddFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return

    const newFeedbackData = {
      mentor_name: mentorName,
      comment: newComment,
      created_at: new Date().toISOString().split('T')[0],
      is_read: false
    }

    const { data, error } = await supabase
      .from('mentor_feedback')
      .insert([newFeedbackData])
      .select()

    if (!error && data) {
      setFeedbacks([{ ...data[0], replies: [] }, ...feedbacks])
      setNewComment('')
      setToastMessage("Mentor evaluation note successfully posted!")
      setTimeout(() => setToastMessage(null), 4000)
    } else {
      alert("Failed to post feedback: " + error?.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Mentor &amp; Evaluator Dashboard 👨‍🏫</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Faculty review panel for tracking project milestones, grading rubrics, and discussion history.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#613b00] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Evaluator Portal Active
        </span>
      </div>

      {/* Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Catatan Mentor */}
        <div className={`lg:col-span-1 p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}>
          <div className="flex items-center gap-3 border-b pb-3 border-inherit">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 grid place-items-center text-sm">
              <i className="fa-solid fa-pen-nib"></i>
            </span>
            <div>
              <h2 className="font-bold text-sm">Post Evaluation Note</h2>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Leave feedback for the student team.</p>
            </div>
          </div>

          <form onSubmit={handleAddFeedback} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Evaluator / Mentor Name</label>
              <input 
                type="text" 
                value={mentorName}
                readOnly
                className={`w-full rounded-xl px-3 py-2 outline-none border opacity-80 cursor-not-allowed ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Evaluation Comment &amp; Recommendations</label>
              <textarea 
                rows={4}
                required
                placeholder="Write constructive notes for prototype refinement..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
              />
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
            >
              Broadcast Feedback
            </button>
          </form>
        </div>

        {/* Daftar Feedbacks & Discussion History */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <div>
              <h2 className="font-bold text-base">Mentor Evaluation Stream &amp; Discussions</h2>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Real-time synchronized feedback records and student replies.</p>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
              {feedbacks.length} Notes Recorded
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 animate-pulse text-xs">Loading mentor logs from database...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">Belum ada catatan evaluasi di database.</div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <div 
                  key={fb.id}
                  className={`p-4 rounded-xl border flex flex-col gap-3 transition ${
                    isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4]/60 border-[#d8c3ad]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-amber-500">
                      <i className="fa-solid fa-user-tie"></i> {fb.mentor_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{fb.created_at}</span>
                  </div>

                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                    &ldquo;{fb.comment}&rdquo;
                  </p>

                  {/* History Balasan dari Siswa */}
                  {fb.replies && fb.replies.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-inherit">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Student Discussion History ({fb.replies.length})</h4>
                      <div className="space-y-2">
                        {fb.replies.map((reply) => (
                          <div 
                            key={reply.id} 
                            className={`p-3 rounded-xl border text-xs space-y-1 ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-white border-[#d8c3ad]'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-600 dark:text-amber-400"><i className="fa-solid fa-reply mr-1.5 text-[10px]"></i>{reply.sender_name}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{reply.created_at ? reply.created_at.split('T')[0] : ''}</span>
                            </div>
                            <p className={`text-xs pl-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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