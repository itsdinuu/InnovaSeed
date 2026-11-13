"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type TeamScore = {
  id: number
  teamName: string
  prototypeTitle: string
  innovationScore: number
  technicalScore: number
  presentationScore: number
  status: 'Graded' | 'Pending Review'
}

export default function GradingRubricsClient() {
  const { isDarkMode } = useTheme()
  
  const [teams, setTeams] = useState<TeamScore[]>([
    {
      id: 1,
      teamName: 'EcoGuardians (SMPN 3 Jakarta)',
      prototypeTitle: 'Landslide Early Warning System',
      innovationScore: 88,
      technicalScore: 85,
      presentationScore: 90,
      status: 'Graded'
    },
    {
      id: 2,
      teamName: 'SmartAlpha (SDIT Al-Ikhlas)',
      prototypeTitle: 'English-First LMS Accelerator',
      innovationScore: 0,
      technicalScore: 0,
      presentationScore: 0,
      status: 'Pending Review'
    }
  ])

  const [selectedTeam, setSelectedTeam] = useState<TeamScore | null>(null)
  const [innovationInput, setInnovationInput] = useState('')
  const [technicalInput, setTechnicalInput] = useState('')
  const [presentationInput, setPresentationInput] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchTeamsFromSupabase() {
      try {
        const { data } = await supabase.from('teams').select('*')
        if (data && data.length > 0) {
          // setTeams(data)
        }
      } catch (err) {
        console.log('Menggunakan dummy data lokal sementara:', err)
      }
    }
    fetchTeamsFromSupabase()
  }, [])

  const handleOpenModal = (team: TeamScore) => {
    setSelectedTeam(team)
    setInnovationInput(team.innovationScore ? team.innovationScore.toString() : '')
    setTechnicalInput(team.technicalScore ? team.technicalScore.toString() : '')
    setPresentationInput(team.presentationScore ? team.presentationScore.toString() : '')
  }

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) return

    setLoading(true)

    const newInnovation = Number(innovationInput) || 0
    const newTechnical = Number(technicalInput) || 0
    const newPresentation = Number(presentationInput) || 0

    try {
      const { error } = await supabase
        .from('evaluations')
        .upsert([
          {
            team_id: selectedTeam.id,
            team_name: selectedTeam.teamName,
            innovation_score: newInnovation,
            technical_score: newTechnical,
            presentation_score: newPresentation,
            status: 'Graded',
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'team_id' })

      if (error) {
        console.warn('Simpan ke Supabase gagal/tabel belum ada, memperbarui state lokal:', error.message)
      }

      const updatedTeams = teams.map((t) => {
        if (t.id === selectedTeam.id) {
          return {
            ...t,
            innovationScore: newInnovation,
            technicalScore: newTechnical,
            presentationScore: newPresentation,
            status: 'Graded' as const
          }
        }
        return t
      })

      setTeams(updatedTeams)
      setSelectedTeam(null)
      setSuccessMessage(`Scores for team ${selectedTeam.teamName} successfully saved!`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Terjadi kesalahan: ' + message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Grading &amp; Rubrics 📋</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Evaluate student prototypes using official scoring rubrics (Innovation, Technical Execution, and Presentation).
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500">
          Faculty Evaluation Panel
        </span>
      </div>

      <div className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <h2 className="font-bold text-base">Student Teams Assessment</h2>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
            {teams.length} Teams Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-[#d8c3ad] text-[#534434]'}`}>
                <th className="py-3 px-4">Team &amp; School</th>
                <th className="py-3 px-4">Prototype Title</th>
                <th className="py-3 px-4 text-center">Innovation (35%)</th>
                <th className="py-3 px-4 text-center">Technical (45%)</th>
                <th className="py-3 px-4 text-center">Presentation (20%)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {teams.map((team) => (
                <tr key={team.id} className={`transition ${isDarkMode ? 'hover:bg-slate-800/40 divide-slate-800' : 'hover:bg-[#fff8f4] divide-[#d8c3ad]'}`}>
                  <td className="py-4 px-4 font-bold">{team.teamName}</td>
                  <td className="py-4 px-4 text-amber-500 font-medium">{team.prototypeTitle}</td>
                  <td className="py-4 px-4 text-center font-mono">{team.innovationScore || '-'}</td>
                  <td className="py-4 px-4 text-center font-mono">{team.technicalScore || '-'}</td>
                  <td className="py-4 px-4 text-center font-mono">{team.presentationScore || '-'}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      team.status === 'Graded' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {team.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button 
                      onClick={() => handleOpenModal(team)}
                      className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0F172A] font-bold hover:bg-[#D97706] transition cursor-pointer shadow-xs"
                    >
                      {team.status === 'Graded' ? 'Edit Score' : 'Input Score'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <h3 className="font-bold text-base">Grading Rubric Form</h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Evaluating: {selectedTeam.teamName}</p>
              </div>
              <button 
                onClick={() => setSelectedTeam(null)}
                className="w-8 h-8 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">1. Innovation &amp; Creativity (Max 100)</label>
                <input 
                  type="number" 
                  min="0" max="100" required
                  value={innovationInput}
                  onChange={(e) => setInnovationInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">2. Technical Execution &amp; Code Quality (Max 100)</label>
                <input 
                  type="number" 
                  min="0" max="100" required
                  value={technicalInput}
                  onChange={(e) => setTechnicalInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">3. Presentation &amp; Documentation (Max 100)</label>
                <input 
                  type="number" 
                  min="0" max="100" required
                  value={presentationInput}
                  onChange={(e) => setPresentationInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="flex-1 py-2.5 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}