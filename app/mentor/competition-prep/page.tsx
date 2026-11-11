"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type CompetitionSubmission = {
  id: number
  team_name: string
  pitch_deck_url?: string
  demo_video_url?: string
  mentor_directive?: string
  status?: string
}

export default function MentorCompetitionPrepPage() {
  const { isDarkMode } = useTheme()
  const [submissions, setSubmissions] = useState<CompetitionSubmission[]>([])
  const [loading, setLoading] = useState(true)

  // State untuk modal edit directive & sign-off
  const [selectedSub, setSelectedSub] = useState<CompetitionSubmission | null>(null)
  const [directiveText, setDirectiveText] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  async function fetchSubmissions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('competition_prep')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setSubmissions(data)
    }
    setLoading(false)
  }

  function handleOpenModal(item: CompetitionSubmission) {
    setSelectedSub(item)
    setDirectiveText(item.mentor_directive || '')
  }

  async function handleSaveDirective(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSub) return
    setSaving(true)

    const { error } = await supabase
      .from('competition_prep')
      .update({
        mentor_directive: directiveText,
        status: 'Directive Updated by Mentor'
      })
      .eq('id', selectedSub.id)

    if (!error) {
      setToast('Mentor directive successfully published to student workspace!')
      setSelectedSub(null)
      fetchSubmissions()
      setTimeout(() => setToast(null), 4000)
    } else {
      alert('Error updating directive: ' + error.message)
    }
    setSaving(false)
  }

  async function handleFinalSignOff(id: number) {
    if (!confirm('Are you sure you want to give final sign-off for this team?')) return

    const { error } = await supabase
      .from('competition_prep')
      .update({ status: 'Approved / Ready for Competition' })
      .eq('id', id)

    if (!error) {
      setToast('Final sign-off granted! Team is ready for competition.')
      fetchSubmissions()
      setTimeout(() => setToast(null), 4000)
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold">Faculty Competition Control Panel 🎯</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Issue directives, review pitch decks and demo videos, and grant final sign-offs for student teams.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-xs">Loading competition submissions...</div>
      ) : submissions.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <h3 className="font-bold">No Competition Entries Yet</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Student teams have not submitted their competition deliverables.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {submissions.map((item) => (
            <div 
              key={item.id} 
              className={`border rounded-2xl p-6 shadow-xs space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
              }`}
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                    item.status === 'Approved / Ready for Competition' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' :
                    'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                  }`}>
                    {item.status || 'Pending Submission'}
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                    Team: <strong className={isDarkMode ? 'text-slate-200' : 'text-[#221a12]'}>{item.team_name}</strong>
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <span className={`block font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Pitch Deck Asset:</span>
                    {item.pitch_deck_url ? (
                      <a href={item.pitch_deck_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline truncate block">
                        <i className="fa-solid fa-link mr-1"></i> {item.pitch_deck_url}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not uploaded yet</span>
                    )}
                  </div>
                  <div>
                    <span className={`block font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Demo Video Asset:</span>
                    {item.demo_video_url ? (
                      <a href={item.demo_video_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline truncate block">
                        <i className="fa-solid fa-link mr-1"></i> {item.demo_video_url}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not uploaded yet</span>
                    )}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50/50 border-amber-200'}`}>
                  <span className="font-bold block mb-0.5 text-amber-500">Current Mentor Directive:</span>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                    {item.mentor_directive || 'No directive issued yet.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Faculty */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <button 
                  onClick={() => handleOpenModal(item)}
                  className="px-4 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square mr-1.5"></i> Edit Directive
                </button>
                <button 
                  onClick={() => handleFinalSignOff(item.id)}
                  className="px-4 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer text-center"
                >
                  <i className="fa-solid fa-check-circle mr-1.5"></i> Grant Final Sign-Off
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Edit Directive */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="font-bold text-base">Write Competition Directive 📢</h3>
              <button 
                onClick={() => setSelectedSub(null)}
                className="w-7 h-7 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDirective} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Directive / Instructions for {selectedSub.team_name}</label>
                <textarea 
                  rows={5}
                  required
                  placeholder="Provide precise guidelines for pitch deck polish or video demo requirements..."
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Publishing...' : 'Publish Directive'}
                </button>
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