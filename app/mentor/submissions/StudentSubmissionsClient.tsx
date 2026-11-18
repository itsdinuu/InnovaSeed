"use client"

import { useEffect, useState, useCallback } from 'react'
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
  team_id?: number
}

export default function StudentSubmissionsPage() {
  const { isDarkMode } = useTheme()
  const [submissions, setSubmissions] = useState<StudentIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const loadSubmissions = useCallback(async () => {
    setLoading(true)

    // Ambil kode mentor aktif (Default: AX7H6J)
    const mentorCode = localStorage.getItem('mentor_code_active') || 'AX7H6J'

    // 1. Ambil ID tim yang dibimbing oleh mentor_code ini
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, team_name')
      .eq('mentor_code', mentorCode)

    if (teamsError) {
      console.error('Error fetching supervised teams:', teamsError)
      setLoading(false)
      return
    }

    const teamIds = teamsData?.map(t => t.id) || []

    if (teamIds.length === 0) {
      setSubmissions([])
      setLoading(false)
      return
    }

    // 2. Ambil ide/submission dari siswa yang tim_id-nya ada di daftar tim bimbingan
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .in('team_id', teamIds)
      .order('id', { ascending: false })

    if (!error && data) {
      setSubmissions(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
  }, [loadSubmissions])

  // Fungsi mentor untuk mengubah status submission (Approved / Prototype / dll)
  async function handleUpdateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from('ideas')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status: newStatus } : s))
      setToast(`Submission status updated to ${newStatus}!`)
    } else {
      setToast("Failed to update status: " + error.message)
    }

    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Student Submissions &amp; Review 📋</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Review, validate, and update innovation submissions coming from your supervised student teams.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading student submissions from Supabase...</div>
      ) : submissions.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <h3 className="font-bold">No Submissions Found</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            No student submissions are linked to your mentor code yet. Once students submit their project ideas, they will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((item) => (
            <div 
              key={item.id} 
              className={`border rounded-2xl p-6 shadow-xs space-y-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
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
                    By <strong className={isDarkMode ? 'text-slate-200' : 'text-[#221a12]'}>{item.author_name || 'Innovator'}</strong>
                  </span>
                </div>

                <h3 className="font-bold text-base">{item.title}</h3>
                <p className={`text-xs leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                  {item.description}
                </p>

                {item.tags && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(Array.isArray(item.tags) ? item.tags : [String(item.tags)]).map((tag, idx) => (
                      <span key={idx} className={`text-[10px] px-2 py-0.5 rounded font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#fff1e5] text-[#534434]'}`}>
                        #{String(tag).trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Aksi / Tombol Validasi untuk Mentor */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-center md:text-right">
                  Feasibility: <strong className="text-amber-500">{item.feasibility_score ?? '7.5'}/10</strong>
                </span>
                
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => handleUpdateStatus(item.id, 'Approved')}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition cursor-pointer"
                  >
                    Approve
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleUpdateStatus(item.id, 'Prototype')}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    Set Prototype
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}