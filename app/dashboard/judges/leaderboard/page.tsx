"use client"

import { useEffect, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { getLeaderboardRecords } from '@/lib/judgePortalData'

export default function JudgeLeaderboardPage() {
  const { isDarkMode } = useTheme()
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  useEffect(() => {
    setLeaderboard(getLeaderboardRecords())
  }, [])

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Cohort threshold review</p>
        <h1 className="mt-2 text-2xl font-extrabold">Grand Finalist Leaderboard</h1>
      </div>

      <section className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="space-y-4">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className={isDarkMode ? 'rounded-xl border border-slate-800 bg-slate-950/40 p-4' : 'rounded-xl border border-[#d8c3ad] bg-[#fffaf6] p-4'}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-lg font-extrabold text-[#0F172A]">
                    #{entry.rank}
                  </div>
                  <div>
                    <div className="font-bold">{entry.team}</div>
                    <div className="text-[11px] text-slate-400">{entry.cohort}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Overall score</div>
                    <div className="text-xl font-extrabold text-amber-500">{entry.score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Trend</div>
                    <div className="text-sm font-semibold text-emerald-600">{entry.trend}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2.5 rounded-full bg-amber-500" style={{ width: `${Math.min(entry.score, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
