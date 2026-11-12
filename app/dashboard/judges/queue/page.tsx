"use client"

import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

const queue = [
  {
    code: 'GEO-2025-081',
    team: 'Team GeoPoly',
    project: 'Eco-Friendly Plastic Bricks',
    track: 'Materials Science',
    category: 'Sustainable Materials',
    files: 'Prototype Demo • Technical Brief',
    status: 'Pending',
    progress: '0/3 reviewed'
  },
  {
    code: 'BIO-2025-104',
    team: 'Bio-Spark Team',
    project: 'Banana-Fiber Bioplastic Film',
    track: 'Biotechnology',
    category: 'Agricultural Biotech',
    files: 'Experiment Log • Final Poster',
    status: 'Scored',
    progress: '3/3 reviewed'
  },
  {
    code: 'IOT-2025-033',
    team: 'AgriSense Lab',
    project: 'Solar-Powered Soil Sensor',
    track: 'Computer Science',
    category: 'Environmental IoT',
    files: 'Board Video • Dataset Summary',
    status: 'Pending',
    progress: '1/3 reviewed'
  },
  {
    code: 'AGR-2025-219',
    team: 'GreenPath Collective',
    project: 'Precision Hydroponic Biometrics',
    track: 'Agricultural Innovation',
    category: 'Food Systems',
    files: 'Field Report • Prototype Photos',
    status: 'Scored',
    progress: '3/3 reviewed'
  }
]

export default function JudgeQueuePage() {
  const { isDarkMode } = useTheme()

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Judge workflow</p>
            <h1 className="mt-2 text-2xl font-extrabold">Assigned Evaluation Queue</h1>
          </div>
          <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-600">
            4 teams assigned
          </span>
        </div>
      </div>

      <section className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className={isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-[#fffaf6] text-[#534434]'}>
              <tr>
                <th className="px-4 py-3 font-semibold">Team</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Submission Files</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((team, index) => (
                <tr key={index} className={isDarkMode ? 'border-t border-slate-800' : 'border-t border-[#f1e2d7]'}>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-mono font-bold text-amber-700 dark:bg-slate-800 dark:text-amber-300">{team.code}</span>
                    </div>
                    <div className="mt-2 font-semibold">{team.team}</div>
                    <div className="text-[11px] text-slate-400">{team.track}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-semibold">{team.project}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{team.progress}</div>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-500">{team.category}</td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500">{team.files}</td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${team.status === 'Scored' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                      {team.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-right">
                    <Link href="/dashboard/judges" className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-amber-400">
                      Start Evaluation
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
