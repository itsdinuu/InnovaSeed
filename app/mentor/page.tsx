"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type StudentIdea = {
  id: number
  title: string
  description: string
  status: string
  tags?: string[] | string | null
  feasibility_score?: number | string | null
  author_name?: string
}

export default function MentorDashboardPage() {
  const { isDarkMode } = useTheme()
  const [ideas, setIdeas] = useState<StudentIdea[]>([])
  const [loading, setLoading] = useState(true)

  // State untuk Modal Kirim Feedback Mentor
  const [selectedIdea, setSelectedIdea] = useState<StudentIdea | null>(null)
  const [mentorComment, setMentorComment] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudentIdeas = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        setIdeas(data)
      }
      setLoading(false)
    }

    fetchStudentIdeas()
  }, [])

  // Fungsi Mentor Mengubah Status Ide Siswa
  async function handleUpdateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from('ideas')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setIdeas(ideas.map(i => i.id === id ? { ...i, status: newStatus } : i))
      setToast(`Idea status updated to ${newStatus}!`)
      setTimeout(() => setToast(null), 3000)
    } else {
      alert("Failed to update status: " + error.message)
    }
  }

  // Fungsi Mentor Mengirim Feedback ke Siswa
  async function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIdea || !mentorComment.trim()) return

    const feedbackPayload = {
      mentor_name: 'Dr. Faculty Advisor', // Bisa disesuaikan dengan nama akun login mentor
      comment: mentorComment,
      feedback_text: mentorComment,
      is_read: false, // Memicu badge "New" di sisi siswa
    }

    const { error } = await supabase
      .from('mentor_feedback')
      .insert([feedbackPayload])

    if (!error) {
      setToast(`Feedback successfully sent to ${selectedIdea.author_name || 'Student'}!`)
      setSelectedIdea(null)
      setMentorComment('')
      setTimeout(() => setToast(null), 4000)
    } else {
      alert("Failed to send feedback: " + error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Mentor */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Faculty Mentor Portal 👨‍🏫</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Evaluate student project submissions, review self-assessments, and issue advisory feedback.
          </p>
        </div>
      </div>

      {/* Daftar Ide / Submission dari Siswa */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading student innovations from Supabase...</div>
      ) : ideas.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-inbox"></i>
          </div>
          <h3 className="font-bold">No Submissions Yet</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            No student ideas have been submitted from the Idea Bank.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {ideas.map((item) => (
            <div 
              key={item.id} 
              className={`border rounded-2xl p-6 shadow-xs space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                    item.status === 'Prototype' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' :
                    item.status === 'Approved' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30' :
                    item.status === 'Under Validation' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                    'bg-slate-500/10 text-slate-500 border border-slate-500/30'
                  }`}>
                    {item.status || 'Raw Concept'}
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                    Student: <strong className={isDarkMode ? 'text-slate-200' : 'text-[#221a12]'}>{item.author_name || 'Innovator'}</strong>
                  </span>
                </div>

                <h3 className="font-bold text-base">{item.title}</h3>
                <p className={`text-xs leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                  {item.description}
                </p>

                <div className="flex items-center gap-3 pt-1 text-xs font-semibold">
                  <span>Student Self-Score: <strong className="text-amber-500">{item.feasibility_score ?? '0.0'}/10</strong></span>
                </div>
              </div>

              {/* Tombol Aksi Mentor */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(item.id, 'Approved')}
                    className="px-3.5 py-2 text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition cursor-pointer"
                  >
                    Approve Idea
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(item.id, 'Prototype')}
                    className="px-3.5 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    Promote to Prototype
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedIdea(item)}
                  className="px-3.5 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer text-center"
                >
                  <i className="fa-solid fa-comment-dots mr-1.5"></i> Send Feedback
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Kirim Feedback ke Siswa */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <h3 className="font-bold text-sm">Send Faculty Feedback</h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>To: {selectedIdea.author_name} ({selectedIdea.title})</p>
              </div>
              <button 
                onClick={() => setSelectedIdea(null)}
                className="w-7 h-7 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Advisory Comment / Review Notes</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Provide constructive feedback or revision notes..."
                  value={mentorComment}
                  onChange={(e) => setMentorComment(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setSelectedIdea(null)}
                  className="flex-1 py-2.5 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  Submit &amp; Notify Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
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