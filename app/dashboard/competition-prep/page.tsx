"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type CompetitionSubmission = {
  id: number
  team_name: string
  pitch_deck_url: string
  demo_video_url: string
  mentor_directive: string
  status: string
}

export default function CompetitionPrepPage() {
  const { isDarkMode } = useTheme()
  const [submission, setSubmission] = useState<CompetitionSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [pitchDeck, setPitchDeck] = useState('')
  const [demoVideo, setDemoVideo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCompetitionData()
  }, [])

  async function fetchCompetitionData() {
    setLoading(true)
    const { data } = await supabase
      .from('competition_prep')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setSubmission(data)
      setPitchDeck(data.pitch_deck_url || '')
      setDemoVideo(data.demo_video_url || '')
    }
    setLoading(false)
  }

  async function handleSaveDeliverables(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (submission) {
      // Update existing
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
      // Insert new
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
        <h1 className="text-2xl font-extrabold">Competition Prep &amp; Deliverables 🏆</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Prepare your final competition assets following direct guidelines and directives from your faculty mentor.
        </p>
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

        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse text-xs">Loading competition workspace...</div>
        ) : (
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
        )}
      </div>
    </div>
  )
}