"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TaskStatus = 'Backlog' | 'In Progress' | 'Under Review' | 'Completed'
type TaskPriority = 'Low' | 'Medium' | 'High'

type Task = {
  id: number
  title: string
  description?: string
  status: TaskStatus
  priority?: TaskPriority
  assignee?: string
}

export default function ProjectWorkspacePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state untuk tugas baru
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('Backlog')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [assignee, setAssignee] = useState('')

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true)
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        setTasks(data)
      } else {
        // Fallback data demo jika tabel belum dibuat di Supabase
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
  }, [])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const newTask = {
      title,
      description,
      status,
      priority,
      assignee: assignee || 'Innovator'
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .insert([newTask])
      .select()

    if (!error && data) {
      setTasks([data[0], ...tasks])
    } else {
      // Jika tabel database belum ada, masukkan secara lokal agar UI tetap responsif
      setTasks([{ id: Date.now(), ...newTask }, ...tasks])
    }

    setShowModal(false)
    setTitle('')
    setDescription('')
    setAssignee('')
  }

  // Fungsi untuk mengubah status tugas langsung dari kartu (Kanban flow)
  async function handleMoveStatus(taskId: number, newStatus: 'Backlog' | 'In Progress' | 'Under Review' | 'Completed') {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    
    await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
  }

  async function handleDeleteTask(taskId: number) {
    if (!confirm('Are you sure you want to delete this task?')) return

    setTasks(tasks.filter(t => t.id !== taskId))
    await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId)
  }

  const columns: ('Backlog' | 'In Progress' | 'Under Review' | 'Completed')[] = [
    'Backlog', 'In Progress', 'Under Review', 'Completed'
  ]

  return (
    <div className="space-y-6">
      
      {/* Header & Tombol Tambah Tugas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Project Workspace Kanban 📋</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage sprint backlog, engineering milestones, and prototype tasks.</p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
        >
          <i className="fa-solid fa-plus"></i> Add New Task
        </button>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading workspace tasks...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((colStatus) => {
            const columnTasks = tasks.filter(t => t.status === colStatus)
            
            return (
              <div key={colStatus} className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      colStatus === 'Backlog' ? 'bg-slate-400' :
                      colStatus === 'In Progress' ? 'bg-amber-500' :
                      colStatus === 'Under Review' ? 'bg-blue-500' :
                      'bg-emerald-500'
                    }`}></span>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">{colStatus}</h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks Container */}
                <div className="space-y-3 min-h-75">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No tasks in {colStatus}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 group hover:border-amber-300 transition">
                        
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            task.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {task.priority || 'Medium'} Priority
                          </span>

                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete Task"
                            className="text-slate-300 hover:text-rose-600 text-xs transition"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-slate-900 leading-snug">{task.title}</h4>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{task.description}</p>
                          )}
                        </div>

                        {/* Footer Card: Assignee & Quick Status Shift */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium truncate max-w-25">
                            <i className="fa-regular fa-user mr-1"></i> {task.assignee || 'Innovator'}
                          </span>

                          {/* Dropdown kecil untuk memindahkan status antar kolom */}
                          <select
                            value={task.status}
                            onChange={(e) => handleMoveStatus(task.id, e.target.value as TaskStatus)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] rounded px-1.5 py-1 outline-none font-semibold cursor-pointer hover:border-amber-500"
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

      {/* Modal Tambah Tugas Baru */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg">Add New Project Task 📝</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Integrate ESP32 Wi-Fi telemetry module" 
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide technical implementation details..." 
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-amber-500"
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-amber-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
                  <input 
                    type="text" 
                    value={assignee} 
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Desti A." 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow-sm"
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