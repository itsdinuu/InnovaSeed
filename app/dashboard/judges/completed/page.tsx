"use client"

import { useEffect, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { getJudgeRecords, saveJudgeRecords, type JudgeTeamRecord } from '@/lib/judgePortalData'

export default function JudgeCompletedPage() {
  const { isDarkMode } = useTheme()
  const [records, setRecords] = useState<JudgeTeamRecord[]>([])

  useEffect(() => {
    setRecords(getJudgeRecords())
  }, [])

  const handleToggleStatus = (teamId: string) => {
    const updated: JudgeTeamRecord[] = records.map((team) =>
      team.id === teamId
        ? { ...team, status: team.status === 'Scored' ? 'Draft' : 'Scored', updatedAt: new Date().toISOString() }
        : team
    )
    setRecords(updated)
    saveJudgeRecords(updated)
  }

  const lockedCount = records.filter((entry) => entry.status === 'Scored').length

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Score archive</p>
            <h1 className="mt-2 text-2xl font-extrabold">Completed Evaluations</h1>
          </div>
          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-600">
            {lockedCount} locked submissions
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
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className={isDarkMode ? 'border-t border-slate-800' : 'border-t border-[#f1e2d7]'}>
                  <td className="px-4 py-4">
                    <div className="font-semibold">{item.team}</div>
                    <div className="text-[11px] text-slate-400">{item.code}</div>
                  </td>
                  <td className="px-4 py-4">{item.project}</td>
                  <td className="px-4 py-4 font-bold text-amber-500">{item.score ?? 0}</td>
                  <td className="px-4 py-4 text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${item.status === 'Scored' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {item.status === 'Scored' ? 'Review / Unlock' : 'Save as Scored'}
                    </button>
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
