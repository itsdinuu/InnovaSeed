"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type TeamRecord = {
  id: string | number
  team_name: string
  lead_id: string | null
  institution: string | null
  research_field: string | null
  team_size: string | null
  mentor_code: string | null
  created_at?: string
}

export default function TeamManagementClient() {
  const { isDarkMode } = useTheme()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filter berdasarkan mentor_code
  const [filterMentorCode, setFilterMentorCode] = useState('MAYA-2026')

  // State untuk modal edit tim oleh mentor
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editResearchField, setEditResearchField] = useState('')
  const [editTeamSize, setEditTeamSize] = useState('')
  const [editMentorCode, setEditMentorCode] = useState('')

  const [toast, setToast] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('teams').select('*').order('created_at', { ascending: false })

    if (filterMentorCode.trim()) {
      query = query.ilike('mentor_code', `%${filterMentorCode.trim()}%`)
    }

    const { data, error } = await query

    if (!error && data) {
      setTeams(data)
    }
    setLoading(false)
  }, [filterMentorCode])

  useEffect(() => {
    const triggerFetch = () => {
      queueMicrotask(() => {
        void fetchTeams()
      })
    }

    triggerFetch()

    // Realtime subscription Supabase untuk tabel teams
    const channel = supabase
      .channel('realtime-mentor-teams-schema')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          triggerFetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTeams])

  function handleOpenModal(team: TeamRecord) {
    setSelectedTeam(team)
    setEditTeamName(team.team_name || '')
    setEditInstitution(team.institution || '')
    setEditResearchField(team.research_field || '')
    setEditTeamSize(team.team_size || '')
    setEditMentorCode(team.mentor_code || '')
  }

  async function handleSaveTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam) return

    const { error } = await supabase
      .from('teams')
      .update({
        team_name: editTeamName,
        institution: editInstitution,
        research_field: editResearchField,
        team_size: editTeamSize,
        mentor_code: editMentorCode
      })
      .eq('id', selectedTeam.id)

    if (!error) {
      setToast(`Team "${editTeamName}" updated successfully!`)
      setSelectedTeam(null)
      fetchTeams()
      setTimeout(() => setToast(null), 3000)
    } else {
      alert("Failed to update team: " + error.message)
    }
  }

  async function handleDeleteTeam(id: string | number) {
    if (!confirm("Are you sure you want to delete this team registration?")) return

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (!error) {
      setToast("Team deleted successfully.")
      fetchTeams()
      setTimeout(() => setToast(null), 3000)
    } else {
      alert("Error: " + error.message)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Faculty Team Control Panel 👥</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Monitor and manage student teams linked via mentor pairing codes in real-time.
          </p>
        </div>

        {/* Filter berdasarkan Kode Mentor */}
        <div className="flex items-center gap-2">
          <input 
            type="text"
            placeholder="Filter by Mentor Code..."
            value={filterMentorCode}
            onChange={(e) => setFilterMentorCode(e.target.value)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase outline-none border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-[#d8c3ad] text-amber-700'}`}
          />
          <button 
            onClick={fetchTeams}
            className="px-4 py-2 bg-[#F59E0B] text-[#0F172A] text-xs font-bold rounded-xl hover:bg-[#D97706] transition cursor-pointer"
          >
            Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-xs">Loading live team data from database...</div>
      ) : teams.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-users-slash"></i>
          </div>
          <h3 className="font-bold">No Teams Found for Code &quot;{filterMentorCode}&quot;</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            No student teams have registered or linked this mentor code yet. Share your code with students to establish connection.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {teams.map((team) => (
            <div 
              key={team.id} 
              className={`border rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                    Code: {team.mentor_code || 'Unlinked'}
                  </span>
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                    Size: <strong className="text-amber-500">{team.team_size || '1'} Members</strong>
                  </span>
                </div>

                <h3 className="font-bold text-lg">{team.team_name}</h3>

                <div className="space-y-1.5 text-xs">
                  <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                    <strong>Institution:</strong> {team.institution || 'SMKN 8 Jakarta'}
                  </p>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                    <strong>Research Field:</strong> <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">{team.research_field || 'EcoTech & IoT'}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
                <button 
                  onClick={() => handleDeleteTeam(team.id)}
                  className="px-3 py-2 text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition cursor-pointer"
                >
                  <i className="fa-solid fa-trash mr-1"></i> Delete
                </button>
                <button 
                  onClick={() => handleOpenModal(team)}
                  className="px-4 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square mr-1"></i> Edit Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Admin Mentor */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="font-bold text-base">Faculty Team Administration 🛠️</h3>
              <button onClick={() => setSelectedTeam(null)} className="w-7 h-7 rounded-full bg-slate-500/15 hover:bg-slate-500/25 grid place-items-center text-xs font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Team Name</label>
                <input type="text" required value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Institution</label>
                  <input type="text" required value={editInstitution} onChange={(e) => setEditInstitution(e.target.value)} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mentor Code</label>
                  <input type="text" required value={editMentorCode} onChange={(e) => setEditMentorCode(e.target.value.toUpperCase())} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border uppercase font-bold text-amber-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Research Field / Category</label>
                  <input type="text" required value={editResearchField} onChange={(e) => setEditResearchField(e.target.value)} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Team Size</label>
                  <input type="text" required value={editTeamSize} onChange={(e) => setEditTeamSize(e.target.value)} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-inherit">
                <button type="button" onClick={() => setSelectedTeam(null)} className="px-4 py-2 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{toast}</p>
          </div>
        </div>
      )}
    </div>
  )
}