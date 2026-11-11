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

export default function StudentSubmissionsPage() {
  const { isDarkMode } = useTheme()
  const [submissions, setSubmissions] = useState<StudentIdea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    const loadSubmissions = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .order('id', { ascending: false })

      if (isCancelled) return

      if (!error && data) {
        setSubmissions(data)
      }

      setLoading(false)
    }

    void loadSubmissions()

    return () => {
      isCancelled = true
    }
  }, [])

  // Fungsi mentor untuk mengubah status (Approved / Needs Revision / Prototype) & Feasibility Score
  async function handleUpdateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from('ideas')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status: newStatus } : s))
    } else {
      alert("Failed to update status: " + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Student Submissions &amp; Review 📋</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Review, validate, and update innovation submissions coming from student Idea Banks.
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
            Students have not submitted any ideas yet.
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
                    {(Array.isArray(item.tags) ? item.tags : [item.tags]).map((tag, idx) => (
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
                    onClick={() => handleUpdateStatus(item.id, 'Approved')}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition cursor-pointer"
                  >
                    Approve
                  </button>
                  <button 
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
    </div>
  )
}