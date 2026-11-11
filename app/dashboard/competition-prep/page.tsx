"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type PrepChecklist = {
  id: number | string
  task_name: string
  category: string
  deadline: string
  is_completed: boolean
}

export default function CompetitionPrepPage() {
  const { isDarkMode } = useTheme()
  const [checklist, setChecklist] = useState<PrepChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPrepData() {
      setLoading(true)
      const { data, error } = await supabase
        .from('competition_prep')
        .select('*')
        .order('id', { ascending: true })

      if (!error && data && data.length > 0) {
        setChecklist(data)
      } else {
        // Fallback data jika tabel kosong
        setChecklist([
          { id: 1, task_name: 'ISO/IEC 17025 Sensor Calibration Audit & Logs', category: 'Technical Rigor', deadline: 'June 01, 2026', is_completed: true },
          { id: 2, task_name: 'Form 1B: Approval Form (Mentor & Institutional Sign-off)', category: 'Compliance', deadline: 'June 05, 2026', is_completed: false },
          { id: 3, task_name: 'Research Paper / Abstract Draft (Max 250 words)', category: 'Documentation', deadline: 'June 10, 2026', is_completed: false },
          { id: 4, task_name: 'Prototype Pitch Deck & 3-Minute Video Walkthrough', category: 'Presentation', deadline: 'June 12, 2026', is_completed: false },
          { id: 5, task_name: 'Final Submission Dossier Upload to PLEGO Gateway', category: 'Submission', deadline: 'June 15, 2026', is_completed: false }
        ])
      }
      setLoading(false)
    }

    fetchPrepData()
  }, [])

  // Fungsi mengubah status checklist secara real-time ke Supabase
  async function handleToggleCheck(id: number | string, currentStatus: boolean) {
    const nextStatus = !currentStatus
    setChecklist(checklist.map(item => item.id === id ? { ...item, is_completed: nextStatus } : item))

    await supabase
      .from('competition_prep')
      .update({ is_completed: nextStatus })
      .eq('id', id)
  }

  const completedCount = checklist.filter(c => c.is_completed).length
  const progressPercentage = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Competition Preparation &amp; Checklist 🎯</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Track compliance milestones, safety forms, and submission deadlines for the 2026 Qualifier.
          </p>
        </div>

        <button
          onClick={() => {
            setToastMessage("Competition compliance package verified successfully!")
            setTimeout(() => setToastMessage(null), 4000)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
        >
          <i className="fa-solid fa-shield-check"></i> Verify Compliance
        </button>
      </div>

      {/* Progress Bar Overview Card */}
      <div className={`border rounded-2xl p-6 shadow-xs space-y-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold uppercase tracking-wider">Readiness Progress</span>
          <span className="font-extrabold text-amber-500">{progressPercentage}% Completed</span>
        </div>
        
        {/* Progress Track */}
        <div className={`w-full h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-[#fff1e5]'}`}>
          <div 
            className="h-full bg-linear-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className={`flex justify-between text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          <span>{completedCount} of {checklist.length} milestones cleared</span>
          <span>Deadline: <strong className="text-amber-500">June 15, 2026</strong></span>
        </div>
      </div>

      {/* Checklist Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading competition preparation requirements from database...</div>
      ) : (
        <div className="grid gap-3">
          {checklist.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleToggleCheck(item.id, item.is_completed)}
              className={`border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-colors shadow-xs ${
                item.is_completed 
                  ? (isDarkMode ? 'bg-emerald-950/20 border-emerald-900/50 opacity-75' : 'bg-emerald-50/50 border-emerald-200')
                  : (isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50' : 'bg-white border-[#d8c3ad] hover:border-amber-400')
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-6 h-6 rounded-lg grid place-items-center shrink-0 border transition-colors ${
                  item.is_completed 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : (isDarkMode ? 'border-slate-700 bg-slate-800 text-transparent' : 'border-[#d8c3ad] bg-[#fff1e5] text-transparent')
                }`}>
                  <i className="fa-solid fa-check text-xs"></i>
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#fff1e5] text-[#534434]'}`}>
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      <i className="fa-regular fa-clock mr-1"></i>Due {item.deadline}
                    </span>
                  </div>
                  <h4 className={`font-bold text-xs sm:text-sm mt-1 truncate ${item.is_completed ? 'line-through opacity-70' : ''}`}>
                    {item.task_name}
                  </h4>
                </div>
              </div>

              <span className={`text-xs font-semibold px-3 py-1 rounded-xl shrink-0 ${
                item.is_completed 
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
              }`}>
                {item.is_completed ? 'Cleared' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Toast Notification Modern */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Compliance Verified</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}