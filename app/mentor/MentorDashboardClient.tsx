"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'
import Link from 'next/link'

type TeamSummary = {
  id: string
  team_name: string
  lead_name: string
  cohort_batch?: string
  status?: string
}

export default function MentorDashboardClient() {
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [mentorName, setMentorName] = useState('Mentor')

  const loadMentorDashboard = useCallback(async () => {
    setLoading(true)
    const mentorCode = localStorage.getItem('mentor_code_active') || 'AX7H6J'

    // 1. Ambil data profil mentor yang sedang login (jika ada)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      if (profile?.full_name) {
        setMentorName(profile.full_name)
      }
    }

    // 2. Ambil daftar tim siswa yang terhubung dengan mentor_code aktif
    const { data: teamsData, error } = await supabase
      .from('teams')
      .select('*')
      .eq('mentor_code', mentorCode)

    if (!error && teamsData) {
      setTeams(teamsData)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
  }, [loadMentorDashboard])

  return (
    <div className="space-y-6">
      {/* Header Sambutan */}
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
        <h1 className="text-2xl font-extrabold">Welcome back, {mentorName}! 👋</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Here is the live oversight of your supervised student teams and innovation progress in InnovaSeed.
        </p>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="text-xs font-semibold text-slate-400">Supervised Teams</div>
          <div className="text-2xl font-extrabold mt-1 text-amber-500">{teams.length}</div>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="text-xs font-semibold text-slate-400">Pending Reviews</div>
          <div className="text-2xl font-extrabold mt-1 text-amber-500">
            {teams.filter(t => t.status !== 'Graded').length}
          </div>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="text-xs font-semibold text-slate-400">Graded Teams</div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-500">
            {teams.filter(t => t.status === 'Graded').length}
          </div>
        </div>
      </div>

      {/* Daftar Tim Bimbingan */}
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Your Supervised Teams Overview</h3>
          <Link href="/mentor/evaluation" className="text-xs font-bold text-amber-500 hover:underline">
            View All Grading &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading dashboard data from Supabase...</div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-3">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl grid place-items-center mx-auto text-lg">
              <i className="fa-solid fa-users-slash"></i>
            </div>
            <p className="font-bold text-sm">No teams are joined yet.</p>
            <p>Student teams must link your mentor code to appear on your dashboard.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {teams.map((team) => (
              <div 
                key={team.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-[#fff8f4] border-[#ebdcd0]'}`}
              >
                <div>
                  <h4 className="font-bold text-sm">{team.team_name}</h4>
                  <p className="text-[11px] text-slate-400">Lead: {team.lead_name} • {team.cohort_batch || 'National Science Fair Track'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${team.status === 'Graded' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                  {team.status || 'Pending Review'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}