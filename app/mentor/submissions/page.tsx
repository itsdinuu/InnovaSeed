"use client"

import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

type StudentSubmission = {
  id: number
  teamName: string
  projectTitle: string
  submissionType: 'Prototype Link' | 'Pitch Deck PDF' | 'GitHub Repository'
  submittedAt: string
  fileUrl: string
  status: 'Reviewed' | 'Needs Review'
}

export default function StudentSubmissionsPage() {
  const { isDarkMode } = useTheme()

  const [submissions, setSubmissions] = useState<StudentSubmission[]>([
    {
      id: 1,
      teamName: 'EcoGuardians (SMPN 3 Jakarta)',
      projectTitle: 'Landslide Early Warning System',
      submissionType: 'GitHub Repository',
      submittedAt: '2026-11-10',
      fileUrl: 'https://github.com/plego/landslide-bot',
      status: 'Reviewed'
    },
    {
      id: 2,
      teamName: 'SmartAlpha (SDIT Al-Ikhlas)',
      projectTitle: 'English-First LMS Accelerator',
      submissionType: 'Pitch Deck PDF',
      submittedAt: '2026-11-11',
      fileUrl: '#',
      status: 'Needs Review'
    }
  ])

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleToggleStatus = (id: number) => {
    setSubmissions(submissions.map(sub => {
      if (sub.id === id) {
        const newStatus = sub.status === 'Needs Review' ? 'Reviewed' : 'Needs Review'
        setToastMessage(`Submission status updated to: ${newStatus}`)
        setTimeout(() => setToastMessage(null), 3000)
        return { ...sub, status: newStatus }
      }
      return sub
    }))
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Student Submissions 📁</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Review project deliverables, pitch decks, and source code repositories submitted by student teams.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 whitespace-nowrap">
          Faculty Review Portal
        </span>
      </div>

      {/* Submissions Table */}
      <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <h2 className="font-bold text-base">Incoming Team Deliverables</h2>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
            {submissions.length} Total Submissions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-[#d8c3ad] text-[#534434]'}`}>
                <th className="py-3 px-4 min-w-45">Team Name</th>
                <th className="py-3 px-4 min-w-50">Project Title</th>
                <th className="py-3 px-4 min-w-36">Type</th>
                <th className="py-3 px-4 min-w-30">Submitted Date</th>
                <th className="py-3 px-4 text-center min-w-30">Status</th>
                <th className="py-3 px-4 text-right min-w-45">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {submissions.map((sub) => (
                <tr key={sub.id} className={`transition ${isDarkMode ? 'hover:bg-slate-800/40 divide-slate-800' : 'hover:bg-[#fff8f4] divide-[#d8c3ad]'}`}>
                  <td className="py-4 px-4 font-bold">{sub.teamName}</td>
                  <td className="py-4 px-4 text-amber-500 font-medium">{sub.projectTitle}</td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-500/10 border border-slate-500/20 whitespace-nowrap">
                      {sub.submissionType}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-mono whitespace-nowrap">{sub.submittedAt}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                      sub.status === 'Reviewed' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                    <a 
                      href={sub.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 font-bold transition inline-block text-xs"
                    >
                      View File
                    </a>
                    <button 
                      onClick={() => handleToggleStatus(sub.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0F172A] font-bold hover:bg-[#D97706] transition cursor-pointer shadow-xs text-xs"
                    >
                      Toggle Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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