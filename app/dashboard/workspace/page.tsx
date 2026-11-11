"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type TaskStatus = 'Backlog' | 'In Progress' | 'Under Review' | 'Completed'
type TaskPriority = 'Low' | 'Medium' | 'High'

type Task = {
  id: number | string
  title: string
  description?: string
  status: TaskStatus
  priority?: TaskPriority
  assignee?: string
}

export default function ProjectWorkspacePage() {
  const { isDarkMode } = useTheme()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('Desti A.')

  // Form state for new task
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('Backlog')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [assignee, setAssignee] = useState('')

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true)

      // Get active user from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.lead_name || session.user.email?.split('@')[0] || 'Desti A.'
        setCurrentUserName(name)
        if (!assignee) setAssignee(name)
      }

      // Fetch real data from Supabase database
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data && data.length > 0) {
        setTasks(data)
      } else {
        // Fallback demo data if the table hasn't been created yet
        setTasks([
          { id: 1, title: 'Sensor Calibration & Baseline Testing', description: 'Ensure ISO/IEC 17025 tolerance limits on moisture probes.', status: 'In Progress', priority: 'High', assignee: 'Desti A.' },
          { id: 2, title: 'Next.js Frontend Routing Optimization', description: 'Refactor app router layouts and clean up TypeScript warnings.', status: 'Backlog', priority: 'Medium', assignee: 'Team Lead' },
          { id: 3, title: 'Faculty Mentor Approval Dossier', description: 'Submit preliminary telemetry logs for 48-hour verification window.', status: 'Under Review', priority: 'High', assignee: 'Faculty Mentor' },
          { id: 4, title: 'Supabase Auth & Database Schema Setup', description: 'Configure RLS policies and table triggers for user profiles.', status: 'Completed', priority: 'High', assignee: 'Desti A.' }
        ])
      }
      setLoading(false)
    }

    fetchTasks()
  }, [assignee])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const newTask = {
      title,
      description,
      status,
      priority,
      assignee: assignee || currentUserName
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .insert([newTask])
      .select()

    if (!error && data) {
      setTasks([data[0], ...tasks])
    } else {
      // Fallback local insertion if database table is unavailable
      setTasks([{ id: Date.now(), ...newTask }, ...tasks])
    }

    setShowModal(false)
    setTitle('')
    setDescription('')
    setAssignee('')
  }

  // Function to move task status directly from the card (Kanban flow)
  async function handleMoveStatus(taskId: number | string, newStatus: TaskStatus) {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    
    await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
  }

  async function handleDeleteTask(taskId: number | string) {
    if (!confirm('Are you sure you want to delete this task?')) return

    setTasks(tasks.filter(t => t.id !== taskId))
    await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId)
  }

  const columns: TaskStatus[] = [
    'Backlog', 'In Progress', 'Under Review', 'Completed'
  ]

  return (
    <div className="space-y-6">
      
      {/* Header & Add Task Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Project Workspace Kanban 📋</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Manage sprint backlog, engineering milestones, and prototype tasks.</p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
        >
          <i className="fa-solid fa-plus"></i> Add New Task
        </button>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading workspace tasks from database...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((colStatus) => {
            const columnTasks = tasks.filter(t => t.status === colStatus)
            
            return (
              <div key={colStatus} className={`border rounded-2xl p-4 space-y-3 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#fff1e5]/60 border-[#d8c3ad]'}`}>
                
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      colStatus === 'Backlog' ? 'bg-slate-400' :
                      colStatus === 'In Progress' ? 'bg-amber-500' :
                      colStatus === 'Under Review' ? 'bg-blue-500' :
                      'bg-emerald-500'
                    }`}></span>
                    <h3 className="font-bold text-xs uppercase tracking-wider">{colStatus}</h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-[#d8c3ad] text-[#534434]'}`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks Container */}
                <div className="space-y-3 min-h-75">
                  {columnTasks.length === 0 ? (
                    <div className={`text-center py-8 text-xs border border-dashed rounded-xl ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-[#d8c3ad] text-[#534434]'}`}>
                      No tasks in {colStatus}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div key={task.id} className={`border rounded-xl p-4 shadow-xs space-y-3 group transition-colors ${isDarkMode ? 'bg-slate-800/40 border-slate-700/80 text-slate-100 hover:border-amber-500/50' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:border-amber-400'}`}>
                        
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            task.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                            task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                            (isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-50 text-slate-600 border border-slate-200')
                          }`}>
                            {task.priority || 'Medium'} Priority
                          </span>

                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete Task"
                            className="text-slate-400 hover:text-rose-500 text-xs transition cursor-pointer"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs leading-snug">{task.title}</h4>
                          {task.description && (
                            <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{task.description}</p>
                          )}
                        </div>

                        {/* Footer Card: Assignee & Quick Status Shift */}
                        <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${isDarkMode ? 'border-slate-700/80' : 'border-[#d8c3ad]/40'}`}>
                          <span className={`font-medium truncate max-w-25 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                            <i className="fa-regular fa-user mr-1"></i> {task.assignee || currentUserName}
                          </span>

                          {/* Dropdown to move task between columns */}
                          <select
                            value={task.status}
                            onChange={(e) => handleMoveStatus(task.id, e.target.value as TaskStatus)}
                            className={`text-[10px] rounded px-1.5 py-1 outline-none font-semibold cursor-pointer border transition ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] hover:border-amber-500'}`}
                          >
                            <option value="Backlog">Backlog</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Modal New Task */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-lg">Add New Project Task 📝</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Task Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Integrate ESP32 Wi-Fi telemetry module" 
                  required
                  className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide technical implementation details..." 
                  rows={3}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Initial Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Assignee</label>
                  <input 
                    type="text" 
                    value={assignee} 
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder={currentUserName} 
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}