"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type TeamRecord = {
  id: number
  team_name: string
  lead_name: string
  members: string[] | null
  cohort_batch: string
  mentor_code: string | null
}

export default function MentorTeamsPage() {
  const { isDarkMode } = useTheme()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filter berdasarkan kode mentor faculty
  const [filterMentorCode, setFilterMentorCode] = useState('MAYA-2026')

  // State untuk modal edit/utak-atik tim oleh mentor
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editLeadName, setEditLeadName] = useState('')
  const [editMentorCode, setEditMentorCode] = useState('')
  const [editMembers, setEditMembers] = useState<string[]>([])
  const [newMemberInput, setNewMemberInput] = useState('')

  const [toast, setToast] = useState<string | null>(null)

  // Gunakan useCallback agar referensi fungsi stabil antar render
  const fetchTeams = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('teams').select('*').order('id', { ascending: false })

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

    // --- REALTIME SUBSCRIPTION SUPABASE (WEBSOCKET) ---
    const channel = supabase
      .channel('realtime-mentor-teams')
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
    setEditTeamName(team.team_name)
    setEditLeadName(team.lead_name)
    setEditMentorCode(team.mentor_code || '')
    setEditMembers(team.members || [])
  }

  const handleAddMemberByMentor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberInput.trim()) return
    setEditMembers([...editMembers, newMemberInput.trim()])
    setNewMemberInput('')
  }

  const handleRemoveMemberByMentor = (indexToRemove: number) => {
    setEditMembers(editMembers.filter((_, idx) => idx !== indexToRemove))
  }

  async function handleSaveTeamByMentor(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam) return

    const { error } = await supabase
      .from('teams')
      .update({
        team_name: editTeamName,
        lead_name: editLeadName,
        mentor_code: editMentorCode,
        members: editMembers
      })
      .eq('id', selectedTeam.id)

    if (!error) {
      setToast(`Team "${editTeamName}" successfully updated!`)
      setSelectedTeam(null)
      fetchTeams()
      setTimeout(() => setToast(null), 4000)
    } else {
      alert("Failed to update team: " + error.message)
    }
  }

  async function handleDeleteTeam(id: number) {
    if (!confirm("Are you sure you want to delete this student team?")) return

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
            Monitor student-formed teams using your mentor code in real-time.
          </p>
        </div>

        {/* Kotak Filter Berdasarkan Kode Mentor */}
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
        <div className="text-center py-16 text-slate-500 animate-pulse text-xs">Loading live team data...</div>
      ) : teams.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-users-slash"></i>
          </div>
          <h3 className="font-bold">No Teams Found for Code &quot;{filterMentorCode}&quot;</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            No student teams have registered or linked this mentor code yet.
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
                    Lead: <strong className="text-amber-500">{team.lead_name}</strong>
                  </span>
                </div>

                <h3 className="font-bold text-lg">{team.team_name}</h3>

                {/* Daftar Anggota Tim */}
                <div className="space-y-1.5">
                  <span className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Members ({ (team.members?.length || 0) + 1 } total):</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2.5 py-1 rounded-lg border font-medium bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <i className="fa-solid fa-crown text-[10px] mr-1"></i> {team.lead_name} (Lead)
                    </span>
                    {team.members && team.members.length > 0 ? (
                      team.members.map((member, idx) => (
                        <span key={idx} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#534434]'}`}>
                          <i className="fa-solid fa-user text-[10px] mr-1 text-amber-500"></i> {member}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No extra members added.</span>
                    )}
                  </div>
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
                  <i className="fa-solid fa-pen-to-square mr-1"></i> Edit &amp; Manage
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

            <form onSubmit={handleSaveTeamByMentor} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Team Name</label>
                <input type="text" required value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Team Lead Name</label>
                  <input type="text" required value={editLeadName} onChange={(e) => setEditLeadName(e.target.value)} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mentor Code</label>
                  <input type="text" required value={editMentorCode} onChange={(e) => setEditMentorCode(e.target.value.toUpperCase())} className={`w-full rounded-xl px-3.5 py-2.5 outline-none border uppercase font-bold text-amber-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                </div>
              </div>

              {/* Kelola Member */}
              <div className="space-y-2 pt-2 border-t border-inherit">
                <label className="block font-semibold">Manage Members</label>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-inherit bg-amber-500/5">
                  {editMembers.map((m, idx) => (
                    <span key={idx} className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-[#d8c3ad] text-[#534434]'}`}>
                      <i className="fa-solid fa-user text-[10px] text-amber-500"></i> {m}
                      <button type="button" onClick={() => handleRemoveMemberByMentor(idx)} className="ml-1 text-red-500 hover:text-red-700 font-bold cursor-pointer">&times;</button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input type="text" placeholder="Add member name..." value={newMemberInput} onChange={(e) => setNewMemberInput(e.target.value)} className={`flex-1 rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`} />
                  <button type="button" onClick={handleAddMemberByMentor} className="px-4 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition cursor-pointer">Add</button>
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

      {/* Toast Notification */}
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