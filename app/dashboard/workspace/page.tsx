"use client"

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type TaskStatus = 'Backlog' | 'In Progress' | 'Under Review' | 'Completed'

type ProjectTask = {
  id: number | string
  title: string
  description?: string
  status: TaskStatus
  priority?: string
  assignee?: string
  problem_statement?: string | null
  how_it_works?: string | null
  materials_needed?: string | null
  step_by_step_guide?: string | null
}

const KANBAN_COLUMNS: TaskStatus[] = ['Backlog', 'In Progress', 'Under Review', 'Completed']

export default function ProjectWorkspacePage() {
  const { isDarkMode } = useTheme()
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('Desti A.')

  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ProjectTask | null>(null)

  // Form state for new workspace item
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('Backlog')
  const [priority, setPriority] = useState('Medium')

  const fetchProjectTasks = useCallback(async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Desti A.'
      setCurrentUserName(name)
    }

    // Mengambil data dari tabel project_tasks di Supabase
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setTasks(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadInitialData = async () => {
      if (isCancelled) return
      await fetchProjectTasks()
    }

    const timeoutId = setTimeout(() => {
      void loadInitialData()
    }, 0)

    // --- REALTIME SUBSCRIPTION SUPABASE ---
    const channel = supabase
      .channel('realtime-project-tasks-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_tasks' },
        () => {
          void fetchProjectTasks()
        }
      )
      .subscribe()

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [fetchProjectTasks])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const newTask = {
      title,
      description,
      status,
      priority,
      assignee: currentUserName,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .insert([newTask])
      .select()

    if (!error && data) {
      setTasks([data[0], ...tasks])
    } else {
      setTasks([{ id: Date.now(), ...newTask }, ...tasks])
    }

    setShowModal(false)
    setTitle('')
    setDescription('')
    setStatus('Backlog')
    setPriority('Medium')
  }

  // Fungsi Drag and Drop antar kolom Kanban
  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const newStatus = destination.droppableId as TaskStatus

    // Update state lokal secara instan
    const updatedTasks = tasks.map(task => {
      if (String(task.id) === String(draggableId)) {
        return { ...task, status: newStatus }
      }
      return task
    })
    setTasks(updatedTasks)

    // Update database Supabase di tabel project_tasks
    await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', draggableId)
  }

  // Fungsi cadangan dropdown manual
  async function handleMoveStatus(taskId: number | string, newStatus: TaskStatus) {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    
    await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
  }

  return (
    <div className="space-y-6 relative">
      
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Project Workspace Kanban 📋</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Drag and drop cards across columns to manage your innovation build phases.
          </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
        >
          <i className="fa-solid fa-plus"></i> Add Workspace Item
        </button>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading workspace tasks from database...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {KANBAN_COLUMNS.map((colStatus) => {
              const columnTasks = tasks.filter(t => (t.status || 'Backlog') === colStatus)
              
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

                  {/* Droppable Area */}
                  <Droppable droppableId={colStatus}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-105 rounded-xl transition-colors p-1 ${
                          snapshot.isDraggingOver ? (isDarkMode ? 'bg-slate-800/40' : 'bg-amber-100/40') : ''
                        }`}
                      >
                        {columnTasks.length === 0 ? (
                          <div className={`text-center py-12 text-xs border border-dashed rounded-xl ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-[#d8c3ad] text-[#534434]'}`}>
                            Drop items here or promote from Idea Bank
                          </div>
                        ) : (
                          columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                  }}
                                  className={`border rounded-xl p-4 shadow-xs space-y-3 transition-shadow ${
                                    snapshot.isDragging ? 'shadow-xl ring-2 ring-amber-500 rotate-2' : ''
                                  } ${isDarkMode ? 'bg-slate-800/90 border-slate-700 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                      {task.priority || 'Medium'} Priority
                                    </span>
                                    <span className="text-[10px] text-slate-400 cursor-grab active:cursor-grabbing" title="Drag to move">
                                      <i className="fa-solid fa-grip-vertical"></i>
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="font-bold text-xs leading-snug">{task.title}</h4>
                                    {task.description && (
                                      <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{task.description}</p>
                                    )}
                                  </div>

                                  {/* Footer Card: Assignee & Guide & Status Dropdown */}
                                  <div className={`pt-2 border-t space-y-2 text-[11px] ${isDarkMode ? 'border-slate-700/80' : 'border-[#d8c3ad]/40'}`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`font-medium truncate max-w-28 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                                        <i className="fa-regular fa-user mr-1"></i> {task.assignee || currentUserName}
                                      </span>

                                      <button 
                                        onClick={() => setSelectedProjectDetail(task)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${isDarkMode ? 'border-slate-700 hover:bg-slate-700 text-amber-400' : 'border-[#d8c3ad] hover:bg-amber-100 text-[#534434]'}`}
                                      >
                                        <i className="fa-solid fa-circle-info mr-1"></i> Guide
                                      </button>
                                    </div>

                                    {/* Dropdown Cadangan */}
                                    <select
                                      value={task.status || 'Backlog'}
                                      onChange={(e) => handleMoveStatus(task.id, e.target.value as TaskStatus)}
                                      className={`w-full text-[10px] rounded px-1.5 py-1.5 outline-none font-semibold cursor-pointer border transition ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] hover:border-amber-500'}`}
                                    >
                                      <option value="Backlog">Move: Backlog</option>
                                      <option value="In Progress">Move: In Progress</option>
                                      <option value="Under Review">Move: Under Review</option>
                                      <option value="Completed">Move: Completed</option>
                                    </select>
                                  </div>

                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}

      {/* ================= MODAL DETAIL GUIDE 4-PART ================= */}
      {selectedProjectDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 border max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Status: {selectedProjectDetail.status}
                </span>
                <h3 className="font-bold text-lg mt-1">{selectedProjectDetail.title}</h3>
              </div>
              <button onClick={() => setSelectedProjectDetail(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation"></i> 1. The Problem (What issue are we solving?)
                </h4>
                <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                  {selectedProjectDetail.problem_statement || selectedProjectDetail.description || "Everyday challenge or inefficiency encountered by students that requires an innovative prototype solution."}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-gears"></i> 2. How It Works (The Solution)
                </h4>
                <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                  {selectedProjectDetail.how_it_works || "A concise explanation of how the mechanism or software logic operates to solve the defined problem simply."}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-toolbox"></i> 3. Materials Needed (Mini Toolkit)
                </h4>
                <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                  {selectedProjectDetail.materials_needed || "List of accessible tools or components (e.g., used cardboard, tape, sensors, micro:bit, or Scratch/Figma account)."}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1.5 flex items-center gap-2">
                  <i className="fa-solid fa-list-check"></i> 4. Step-by-Step Build Guide
                </h4>
                <p className={`whitespace-pre-line ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                  {selectedProjectDetail.step_by_step_guide || "1. Draft initial sketches or wireframe layouts.\n2. Gather required physical or digital toolkits.\n3. Build the core functional prototype.\n4. Test performance and refine for presentation."}
                </p>
              </div>
            </div>

            <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <span className="text-[11px] text-slate-400">Assigned to: <b>{selectedProjectDetail.assignee || currentUserName}</b></span>
              <button 
                type="button" 
                onClick={() => setSelectedProjectDetail(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer transition"
              >
                Close Guide
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Add Workspace Item */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-lg">Add New Workspace Item 📝</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Task Title *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IoT Soil Moisture Sensor Prototype" 
                  required
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Short Description *</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide brief objective of this build phase..." 
                  rows={2}
                  required
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                ></textarea>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Priority</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Initial Kanban Column</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                >
                  <option value="Backlog">Backlog</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 font-semibold rounded-xl cursor-pointer transition ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer"
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