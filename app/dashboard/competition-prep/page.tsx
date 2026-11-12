"use client"

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type CompetitionSubmission = {
  id: number
  team_name: string
  pitch_deck_url: string
  demo_video_url: string
  mentor_directive: string
  status: string
  team_score_innovation?: number | null
  team_score_technical?: number | null
  team_score_presentation?: number | null
  grading_status?: string | null
}

type ChecklistItem = {
  id: number
  team_name: string
  task_title: string
  is_completed: boolean
}

export default function CompetitionPrepPage() {
  const { isDarkMode } = useTheme()
  const [submission, setSubmission] = useState<CompetitionSubmission | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pitchDeck, setPitchDeck] = useState('')
  const [demoVideo, setDemoVideo] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchCompetitionData = useCallback(async function fetchCompetitionDataInternal() {
    setLoading(true)

    try {
      // Fetch competition prep data safely
      const { data: compData } = await supabase
        .from('competition_prep')
        .select('*')
        .limit(1)
        .maybeSingle()

      // Fetch teams data safely
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .limit(1)
        .maybeSingle()

      const teamName = teamData?.team_name || 'Team AlBot'

      // Fetch checklist data
      const { data: checkData, error: checkError } = await supabase
        .from('competition_checklists')
        .select('*')
        .eq('team_name', teamName)
        .order('id', { ascending: true })

      // If the checklist is empty or the table doesn't exist yet, use default local data
      let finalChecklist: ChecklistItem[] = Array.isArray(checkData) ? checkData : []
      if (!checkData || checkData.length === 0 || checkError) {
        finalChecklist = [
          { id: 1, team_name: teamName, task_title: 'Problem Statement & Target Audience Defined', is_completed: true },
          { id: 2, team_name: teamName, task_title: 'Prototype Architecture & Database Schema Setup', is_completed: true },
          { id: 3, team_name: teamName, task_title: 'Testing & Bug Fixing Logs Recorded', is_completed: false },
          { id: 4, team_name: teamName, task_title: 'Pitch Deck Presentation File Uploaded', is_completed: false },
        ]

        // Attempt to insert into database in the background (non-blocking if it fails)
        supabase.from('competition_checklists').insert(finalChecklist).then(() => {})
      }

      const combined = {
        ...(compData || { id: 1, team_name: teamName, pitch_deck_url: '', demo_video_url: '', mentor_directive: '', status: 'Pending Submission' }),
        team_score_innovation: teamData?.team_score_innovation ?? null,
        team_score_technical: teamData?.team_score_technical ?? null,
        team_score_presentation: teamData?.team_score_presentation ?? null,
        grading_status: teamData?.grading_status ?? 'Pending Review'
      }

      setSubmission(combined)
      setPitchDeck(combined.pitch_deck_url || '')
      setDemoVideo(combined.demo_video_url || '')
      setChecklist(finalChecklist)
    } catch (err) {
      console.warn('Failed to fetch competition data from Supabase, using local fallback:', err)
      // Absolute fallback to ensure UI doesn't remain stuck in loading on total failure
      setSubmission({
        id: 1,
        team_name: 'Team AlBot',
        pitch_deck_url: '',
        demo_video_url: '',
        mentor_directive: 'Complete prototype testing documentation.',
        status: 'Pending Submission',
        team_score_innovation: null,
        team_score_technical: null,
        team_score_presentation: null,
        grading_status: 'Pending Review'
      })
      setChecklist([
        { id: 1, team_name: 'Team AlBot', task_title: 'Problem Statement & Target Audience Defined', is_completed: true },
        { id: 2, team_name: 'Team AlBot', task_title: 'Prototype Architecture & Database Schema Setup', is_completed: true }
      ])
    } finally {
      // THIS IS THE KEY: Ensure loading is always turned off under any condition (success/failure)
      setLoading(false)
    }
  }, [])
  async function toggleChecklist(id: number, currentStatus: boolean) {
    const updatedStatus = !currentStatus
    setChecklist(checklist.map(item => item.id === id ? { ...item, is_completed: updatedStatus } : item))

    await supabase
      .from('competition_checklists')
      .update({ is_completed: updatedStatus })
      .eq('id', id)
  }

  async function handleSaveDeliverables(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (submission && submission.id) {
      const { error } = await supabase
        .from('competition_prep')
        .update({
          pitch_deck_url: pitchDeck,
          demo_video_url: demoVideo,
          status: 'Under Mentor Review'
        })
        .eq('id', submission.id)

      if (!error) {
        alert("Competition deliverables submitted for mentor final sign-off!")
        fetchCompetitionData()
      } else {
        alert("Error: " + error.message)
      }
    } else {
      const { error } = await supabase
        .from('competition_prep')
        .insert([{
          team_name: 'Team AlBot',
          pitch_deck_url: pitchDeck,
          demo_video_url: demoVideo,
          mentor_directive: 'Lengkapi slide validasi pasar dan pastikan durasi video demo di bawah 3 menit.',
          status: 'Under Mentor Review'
        }])

      if (!error) {
        alert("Competition deliverables successfully created!")
        fetchCompetitionData()
      } else {
        alert("Error: " + error.message)
      }
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <i className="fa-solid fa-trophy text-amber-500"></i> Competition Prep &amp; Deliverables 🏆
        </h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Prepare your final competition assets, track dynamic checklists, and review faculty rubric evaluations.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-xs">Loading competition workspace...</div>
      ) : (
        <div className="space-y-6">
          {/* KARTU REKAP NILAI RUBRIK DARI MENTOR (GRADING & RUBRICS) */}
          <div className={`border rounded-2xl p-6 shadow-xs space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                  Official Scoring Rubrics
                </span>
                <h3 className="font-bold text-lg mt-1">{submission?.team_name || 'My Team'} Assessment</h3>
              </div>
              <div>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                  submission?.grading_status === 'Graded' 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse'
                }`}>
                  {submission?.grading_status || 'Pending Review'}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className={`p-4 rounded-xl border text-center space-y-1 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <span className="text-[11px] font-semibold text-slate-400 block">Innovation (35%)</span>
                <b className="text-xl font-extrabold text-amber-500">
                  {submission?.team_score_innovation ?? '-'}
                </b>
              </div>

              <div className={`p-4 rounded-xl border text-center space-y-1 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <span className="text-[11px] font-semibold text-slate-400 block">Technical Execution (45%)</span>
                <b className="text-xl font-extrabold text-amber-500">
                  {submission?.team_score_technical ?? '-'}
                </b>
              </div>

              <div className={`p-4 rounded-xl border text-center space-y-1 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <span className="text-[11px] font-semibold text-slate-400 block">Presentation (20%)</span>
                <b className="text-xl font-extrabold text-amber-500">
                  {submission?.team_score_presentation ?? '-'}
                </b>
              </div>
            </div>
          </div>

          {/* CHECKLIST PERSIAPAN LOMBA (SUPABASE DATABASE) */}
          <div className={`border rounded-2xl p-6 shadow-xs space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-list-check text-amber-500"></i> Milestone &amp; Submission Checklist
              </h3>
              <span className="text-xs font-semibold text-amber-500">
                {checklist.filter(i => i.is_completed).length} of {checklist.length} Completed
              </span>
            </div>
            
            <div className="space-y-2.5 text-xs">
              {checklist.map((item) => (
                <label 
                  key={item.id} 
                  onClick={() => toggleChecklist(item.id, item.is_completed)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    item.is_completed 
                      ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800') 
                      : (isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-[#fff8f4] border-[#d8c3ad] hover:bg-[#fbebdd]')
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={item.is_completed} 
                    onChange={() => {}} 
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer" 
                  />
                  <span className={`font-medium ${item.is_completed ? 'line-through opacity-80' : ''}`}>
                    {item.task_title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Kotak Arahan Mentor (Mentor Directives Box) */}
          <div className={`border rounded-2xl p-6 shadow-xs relative overflow-hidden ${isDarkMode ? 'bg-slate-900/90 border-amber-500/40 text-slate-100' : 'bg-amber-50/70 border-amber-300 text-[#221a12]'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-[#0F172A] grid place-items-center font-bold shrink-0 shadow-md">
                <i className="fa-solid fa-bullhorn text-sm"></i>
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Active Mentor Directive</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-500/30">
                    {submission?.status || 'Pending Submission'}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                  {submission?.mentor_directive || 'Mentor has not posted a specific directive yet. Focus on refining your slide deck and core prototype demo.'}
                </p>
              </div>
            </div>
          </div>

          {/* Form Upload / Submit Link Deliverables */}
          <div className={`border rounded-2xl p-6 shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
            <h3 className="font-bold text-base mb-4">Upload Competition Assets</h3>

            <form onSubmit={handleSaveDeliverables} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Pitch Deck Link (Google Slides / Canva / PDF)</label>
                <input 
                  type="url"
                  required
                  placeholder="https://canva.com/design/..."
                  value={pitchDeck}
                  onChange={(e) => setPitchDeck(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 outline-none border transition ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Demo Video Link (YouTube / Google Drive)</label>
                <input 
                  type="url"
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  value={demoVideo}
                  onChange={(e) => setDemoVideo(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 outline-none border transition ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Submitting to Mentor...' : 'Submit for Final Mentor Sign-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}