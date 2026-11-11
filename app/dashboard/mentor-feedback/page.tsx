"use client"

import Link from 'next/link'

export default function StudentMentorFeedbackPage() {
  const feedbacks = [
    {
      id: 'FB-041',
      mentor: 'Dr. Raden Hartono',
      role: 'Senior Advisor, Material Physics Lab',
      project: 'Eco-Friendly Plastic Bricks (Milestone 3 Data Log)',
      time: '2 hours ago',
      status: 'Action Required',
      message: 'Excellent compressive test readings on sample #B4. Ensure you document moisture absorption variance before Tuesday\'s rehearsal. Bring the tensile strain curves as well.',
      tag: 'Lab Testing Review'
    },
    {
      id: 'FB-038',
      mentor: 'Prof. Ir. Siti Aminah, M.T.',
      role: 'Ethics & Safety Committee Chair',
      project: 'Eco-Friendly Plastic Bricks (Safety Clearance)',
      time: '3 days ago',
      status: 'Approved',
      message: 'Institutional safety clearance has been provisionally verified. Ensure all thermal extrusion ventilation protocols are strictly maintained during school lab hours.',
      tag: 'Compliance'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mentor Feedback &amp; Advisor Notes 💬</h1>
          <p className="text-sm text-slate-500 mt-1">Direct evaluations, sign-off notes, and improvement directives from your faculty advisors.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600">
          <i className="fa-solid fa-calendar-days"></i> Schedule 1-on-1 Office Hour
        </button>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbacks.map((fb, idx) => (
          <div key={idx} className={`bg-white border rounded-xl p-6 shadow-sm space-y-4 ${fb.status === 'Action Required' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold grid place-items-center text-sm">
                  {fb.mentor.split(' ').slice(1, 2).join('')[0] || 'D'}
                </span>
                <div>
                  <b className="text-sm text-slate-900 block">{fb.mentor}</b>
                  <p className="text-xs text-slate-500">{fb.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600">{fb.tag}</span>
                <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${fb.status === 'Action Required' ? 'bg-amber-500 text-white' : 'bg-green-100 text-green-700'}`}>
                  {fb.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{fb.project} • <span className="text-slate-400 font-normal">{fb.time}</span></p>
              <blockquote className="border-l-4 border-amber-500 bg-white italic text-sm text-slate-700 px-4 py-3 rounded-r-lg mt-2 shadow-xs">
                &ldquo;{fb.message}&rdquo;
              </blockquote>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition">
                <i className="fa-solid fa-reply"></i> Reply to Mentor
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition">
                <i className="fa-solid fa-file-lines"></i> View Associated Lab Dossier
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}