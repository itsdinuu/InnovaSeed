"use client"

import { useEffect, useState, useCallback } from 'react'
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

type ChecklistItem = {
  id: number
  team_name: string
  task_title: string
  is_completed: boolean
}

export default function MentorCompetitionControlPage() {
  const { isDarkMode } = useTheme()
  const [submissions, setSubmissions] = useState<CompetitionSubmission[]>([])
  const [checklists, setChecklists] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  // State modal edit directive
  const [selectedSub, setSelectedSub] = useState<CompetitionSubmission | null>(null)
  const [directiveText, setDirectiveText] = useState('')
  
  // State modal tambah checklist task
  const [selectedTeamForTask, setSelectedTeamForTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    
    const { data: compData } = await supabase
      .from('competition_prep')
      .select('*')
      .order('id', { ascending: false })

    const { data: checkData } = await supabase
      .from('competition_checklists')
      .select('*')
      .order('id', { ascending: true })

    if (compData) setSubmissions(compData)
    if (checkData) setChecklists(checkData)
    
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData()
    }, 0)

    const channel = supabase
      .channel('realtime-mentor-competition-control')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_prep' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_checklists' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  function handleOpenDirectiveModal(item: CompetitionSubmission) {
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
      setToast('Mentor directive successfully published!')
      setSelectedSub(null)
      fetchData()
      setTimeout(() => setToast(null), 4000)
    } else {
      alert('Error updating directive: ' + error.message)
    }
    setSaving(false)
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeamForTask || !newTaskTitle.trim()) return
    setSaving(true)

    const { error } = await supabase
      .from('competition_checklists')
      .insert([{
        team_name: selectedTeamForTask,
        task_title: newTaskTitle.trim(),
        is_completed: false
      }])

    if (!error) {
      setToast('New checklist task added successfully!')
      setSelectedTeamForTask(null)
      setNewTaskTitle('')
      fetchData()
      setTimeout(() => setToast(null), 4000)
    } else {
      alert('Error adding task: ' + error.message)
    }
    setSaving(false)
  }

  async function handleDeleteTask(taskId: number) {
    const { error } = await supabase
      .from('competition_checklists')
      .delete()
      .eq('id', taskId)

    if (!error) {
      fetchData()
    } else {
      alert('Error deleting task: ' + error.message)
    }
  }

  async function handleFinalSignOff(id: number) {
    if (!confirm('Are you sure you want to give final sign-off for this team?')) return

    const { error } = await supabase
      .from('competition_prep')
      .update({ status: 'Approved / Ready for Competition' })
      .eq('id', id)

    if (!error) {
      setToast('Final sign-off granted!')
      fetchData()
      setTimeout(() => setToast(null), 4000)
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <i className="fa-solid fa-trophy text-amber-500"></i> Faculty Competition Control Panel 🎯
        </h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Monitor team deliverables, manage dynamic milestones/checklists, issue directives, and grant final sign-offs.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-xs">Loading competition control data...</div>
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
        <div className="grid gap-6">
          {submissions.map((item) => {
            const teamTasks = checklists.filter(c => c.team_name === item.team_name)

            return (
              <div 
                key={item.id} 
                className={`border rounded-2xl p-6 shadow-xs space-y-5 transition-colors ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-inherit">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                        item.status === 'Approved / Ready for Competition' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' :
                        'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                      }`}>
                        {item.status || 'Pending Submission'}
                      </span>
                      <h3 className="font-bold text-base">{item.team_name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => handleOpenDirectiveModal(item)}
                      className="px-3.5 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                    >
                      <i className="fa-solid fa-pen-to-square mr-1"></i> Edit Directive
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleFinalSignOff(item.id)}
                      className="px-3.5 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-check-circle mr-1"></i> Final Sign-Off
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div>
                      <span className={`block font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Pitch Deck Asset:</span>
                      {item.pitch_deck_url ? (
                        <a href={item.pitch_deck_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline truncate block font-medium">
                          <i className="fa-solid fa-link mr-1"></i> {item.pitch_deck_url}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not uploaded yet</span>
                      )}
                    </div>
                    <div>
                      <span className={`block font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Demo Video Asset:</span>
                      {item.demo_video_url ? (
                        <a href={item.demo_video_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline truncate block font-medium">
                          <i className="fa-solid fa-link mr-1"></i> {item.demo_video_url}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not uploaded yet</span>
                      )}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50/50 border-amber-200'}`}>
                    <div>
                      <span className="font-bold block mb-1 text-amber-500">Current Mentor Directive:</span>
                      <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                        {item.mentor_directive || 'No directive issued yet.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* MANAJEMEN CHECKLIST SISWA OLEH MENTOR */}
                <div className="pt-3 border-t border-inherit space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <i className="fa-solid fa-list-check"></i> Team Milestones &amp; Checklist ({teamTasks.filter(t => t.is_completed).length}/{teamTasks.length} Done)
                    </h4>
                    <button 
                      type="button"
                      onClick={() => {
                        console.log("Tombol Add Task diklik untuk tim:", item.team_name)
                        setSelectedTeamForTask(item.team_name)
                      }}
                      className="text-[11px] font-bold px-3 py-1.5 bg-amber-500 text-[#0F172A] rounded-lg hover:bg-amber-400 transition cursor-pointer shadow-xs"
                    >
                      + Add Task
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    {teamTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          task.is_completed 
                            ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800') 
                            : (isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-300' : 'bg-[#fff8f4] border-[#d8c3ad]')
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <i className={`fa-solid ${task.is_completed ? 'fa-circle-check text-emerald-500' : 'fa-clock text-amber-500'}`}></i>
                          <span className={`truncate font-medium ${task.is_completed ? 'line-through opacity-80' : ''}`}>{task.task_title}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-500 hover:text-red-700 ml-2 font-bold px-1.5 py-0.5 cursor-pointer"
                          title="Delete Task"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {teamTasks.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No custom checklist tasks assigned yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- MODAL EDIT DIRECTIVE --- */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="font-bold text-base">Write Competition Directive 📢</h3>
              <button type="button" onClick={() => setSelectedSub(null)} className="w-7 h-7 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer">✕</button>
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
                <button type="button" onClick={() => setSelectedSub(null)} className="px-4 py-2 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50">Publish Directive</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH TASK CHECKLIST OLEH MENTOR --- */}
      {selectedTeamForTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <h3 className="font-bold text-base">Add Checklist Task for {selectedTeamForTask} 📝</h3>
              <button type="button" onClick={() => setSelectedTeamForTask(null)} className="w-7 h-7 rounded-full bg-slate-500/10 hover:bg-slate-500/20 grid place-items-center text-xs font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Task Title / Milestone</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Upload Market Validation PDF..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedTeamForTask(null)} className="px-4 py-2 font-bold border border-slate-500/30 rounded-xl hover:bg-slate-500/10 transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50">Add Task</button>
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