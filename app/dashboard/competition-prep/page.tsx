"use client"

import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

type ChecklistItem = {
  id: number
  task: string
  category: string
  completed: boolean
}

export default function CompetitionPrepPage() {
  const { isDarkMode } = useTheme()

  // State untuk checklist item persiapan lomba
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 1, task: 'Finalize English-first LMS prototype and core features', category: 'Technical', completed: true },
    { id: 2, task: 'Complete research telemetry and experimental lab notes', category: 'Documentation', completed: true },
    { id: 3, task: 'Draft executive summary and innovation pitch deck', category: 'Presentation', completed: false },
    { id: 4, task: 'Record 3-minute video walkthrough / live demo preview', category: 'Media', completed: false },
    { id: 5, task: 'Verify school institutional approval & ethics compliance', category: 'Administrative', completed: true },
  ])

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Fungsi toggle centang checklist
  const toggleCheck = (id: number) => {
    setChecklist(prev => 
      prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item)
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Competition Preparation Hub 🏆</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Track your submission milestones, administrative checklists, and evaluation rubrics.
          </p>
        </div>

        <button
          onClick={() => {
            setToastMessage("Competition preparation progress synced successfully!")
            setTimeout(() => setToastMessage(null), 4000)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
        >
          <i className="fa-solid fa-sync"></i> Sync Submission Status
        </button>
      </div>

      {/* Grid Utama: Countdown & Ringkasan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Countdown Deadline */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-xs transition-colors flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-[#fff1e5] text-[#855300]'}`}>
                <i className="fa-solid fa-hourglass-half mr-1.5"></i> National Qualifier Deadline
              </span>
              <span className="text-[11px] font-semibold text-rose-500 animate-pulse">June 15, 2026</span>
            </div>

            <h2 className="text-xl font-bold">PLEGO 2026 National Innovation Showcase</h2>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Ensure all preliminary prototype telemetry, lab notebooks, and English-first documentation files are fully compiled before final evaluation locking.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-inherit">
            <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
              <b className="text-lg font-extrabold text-amber-500 block">31</b>
              <span className="text-[10px] uppercase text-slate-400">Days Left</span>
            </div>
            <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
              <b className="text-lg font-extrabold text-amber-500 block">12</b>
              <span className="text-[10px] uppercase text-slate-400">Hours</span>
            </div>
            <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
              <b className="text-lg font-extrabold text-amber-500 block">45</b>
              <span className="text-[10px] uppercase text-slate-400">Minutes</span>
            </div>
          </div>
        </div>

        {/* Card Quick Stats */}
        <div className={`p-6 rounded-2xl border shadow-xs flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}>
          <div>
            <h3 className="font-bold text-sm mb-1">Readiness Score</h3>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Based on completed administrative tasks.</p>
          </div>

          <div className="my-6 text-center">
            <div className="text-4xl font-extrabold text-emerald-500">
              {Math.round((checklist.filter(i => i.completed).length / checklist.length) * 100)}%
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {checklist.filter(i => i.completed).length} of {checklist.length} Milestones Cleared
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-500" 
              style={{ width: `${(checklist.filter(i => i.completed).length / checklist.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Bagian Checklist Persyaratan Lomba */}
      <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <div>
            <h3 className="font-bold text-base">Administrative &amp; Technical Checklist</h3>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Check off items as you complete them for submission.</p>
          </div>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
            Interactive
          </span>
        </div>

        <div className="space-y-2.5">
          {checklist.map((item) => (
            <div 
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                item.completed 
                  ? (isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40 opacity-75' : 'bg-emerald-50/60 border-emerald-200')
                  : (isDarkMode ? 'bg-slate-800/40 border-slate-700 hover:border-amber-500/50' : 'bg-[#fff8f4]/60 border-[#d8c3ad] hover:border-amber-400')
              }`}
            >
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={item.completed}
                  onChange={() => {}} // Ditangani oleh onClick container
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <b className={`text-xs block ${item.completed ? 'line-through text-slate-400' : ''}`}>
                    {item.task}
                  </b>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Category: {item.category}</span>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                item.completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {item.completed ? 'Completed' : 'Pending'}
              </span>
            </div>
          ))}
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