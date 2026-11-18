"use client"

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

type TaskStatus = 'Backlog' | 'In Progress' | 'Under Review' | 'Completed'

type MemberTask = {
  id: number | string
  title: string
  description?: string
  status: TaskStatus
  priority?: string
  assignee?: string
  user_id?: string
}

type TeamMember = {
  id: string | number
  name: string
  role: string
  avatarColor: string
}

const KANBAN_COLUMNS: TaskStatus[] = ['Backlog', 'In Progress', 'Under Review', 'Completed']

export default function ProjectWorkspacePage() {
  const { isDarkMode } = useTheme()
  const [tasks, setTasks] = useState<MemberTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('Desti Andhini')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // State Proyek Utama
  const [activeProject, setActiveProject] = useState({
    id: null as number | string | null,
    title: '',
    subtitle: '',
    sprintName: 'Sprint Active',
    progressPercentage: 0,
    approvalStatus: 'in_progress', 
    teamName: 'Solo Project',
    teamMembers: [] as TeamMember[]
  })

  // Form state untuk task baru di Kanban
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('Backlog')
  const [priority, setPriority] = useState('Medium')
  const [assignee, setAssignee] = useState('Desti Andhini')
  const [submittingMentor, setSubmittingMentor] = useState(false)

  // --- FETCH DATA WORKSPACE DENGAN FLEKSIBILITAS IDEA BANK ---
  const fetchWorkspaceData = useCallback(async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const userId = session.user.id
      setCurrentUserId(userId)
      
      const activeProfileName = localStorage.getItem('active_profile_name')
      const authDefaultName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Desti Andhini'
      const finalUserName = activeProfileName || authDefaultName
      
      setCurrentUserName(finalUserName)
      setAssignee(finalUserName)

      // 1. Cek Tim User Berdasarkan Auth
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .eq('user_id', userId)
        .maybeSingle()

      const currentTeamId = memberData?.team_id || null
      let foundProject = false

      // 2. Ambil Anggota Tim Terlebih Dahulu untuk Setup List Team Members
      let mappedMembers: TeamMember[] = [{ id: userId, name: finalUserName, role: 'leader', avatarColor: 'bg-amber-500 text-slate-950' }]
      
      if (currentTeamId) {
        const { data: allTeamUsers } = await supabase
          .from('team_members')
          .select('id, name, role')
          .eq('team_id', currentTeamId)

        if (allTeamUsers && allTeamUsers.length > 0) {
          const colors = ['bg-amber-500 text-slate-950', 'bg-emerald-500 text-slate-950', 'bg-blue-500 text-slate-950', 'bg-purple-500 text-slate-950']
          mappedMembers = allTeamUsers.map((m: { id: string | number; name: string; role: string }, idx: number) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            avatarColor: colors[idx % colors.length]
          }))
        }
      }

      // 3. CARI PROYEK DARI TABEL `projects`
      const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!projError && projectData && projectData.length > 0) {
        const proj = projectData[0]
        setActiveProject({
          id: proj.id,
          title: proj.title || '',
          subtitle: proj.subtitle || proj.project_code || 'Innovation Project Workspace',
          sprintName: 'Sprint Active',
          progressPercentage: proj.progress_percentage || 0,
          approvalStatus: proj.approval_status || 'in_progress',
          teamName: memberData?.teams ? (memberData.teams as { name?: string }).name || 'Assigned Team' : 'Solo Project',
          teamMembers: mappedMembers
        })
        foundProject = true
      }

      // 4. FALLBACK: AMBIL IDE TERBARU DARI TABEL `ideas` (Idea Bank)
      if (!foundProject) {
        const { data: userIdeas, error: ideaErr } = await supabase
          .from('ideas')
          .select('*')
          .in('status', ['Prototype', 'prototype', 'Approved', 'approved', 'Promoted', 'promoted'])
          .order('id', { ascending: false })
          .limit(1)

        if (!ideaErr && userIdeas && userIdeas.length > 0) {
          const idea = userIdeas[0]
          setActiveProject({
            id: idea.id,
            title: idea.title || '',
            subtitle: idea.problem_statement || idea.description || 'Promoted Innovation Prototype from Idea Bank',
            sprintName: 'Sprint Active',
            progressPercentage: 0,
            approvalStatus: 'in_progress',
            teamName: memberData?.teams ? (memberData.teams as { name?: string }).name || 'Solo Project' : 'Solo Project',
            teamMembers: mappedMembers
          })
          foundProject = true
        }
      }

      if (!foundProject) {
        setActiveProject({
          id: null,
          title: '',
          subtitle: '',
          sprintName: 'Sprint Active',
          progressPercentage: 0,
          approvalStatus: 'in_progress',
          teamName: memberData?.teams ? (memberData.teams as { name?: string }).name || 'Solo Project' : 'Solo Project',
          teamMembers: mappedMembers
        })
      }

      // 5. Ambil Task Kanban
      const { data: taskData, error: taskError } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: false })

      if (!taskError && taskData) {
        setTasks(taskData)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadInitialData = async () => {
      if (isCancelled) return
      await fetchWorkspaceData()
    }

    const timeoutId = setTimeout(() => {
      void loadInitialData()
    }, 0)

    const channel = supabase
      .channel('realtime-workspace-db')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => { void fetchWorkspaceData() }
      )
      .subscribe()

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [fetchWorkspaceData])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !currentUserId) return

    const newTask = {
      title,
      description,
      status,
      priority,
      assignee,
      user_id: currentUserId,
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

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const newStatus = destination.droppableId as TaskStatus

    const updatedTasks = tasks.map(task => {
      if (String(task.id) === String(draggableId)) {
        return { ...task, status: newStatus }
      }
      return task
    })
    setTasks(updatedTasks)

    await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', draggableId)
  }

  async function handleMoveStatus(taskId: number | string, newStatus: TaskStatus) {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    
    await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'Completed').length
  const isAllCompleted = totalTasks > 0 && completedTasks === totalTasks

  async function handleSendToMentor() {
    if (!activeProject.id) return
    setSubmittingMentor(true)

    try {
      await supabase
        .from('projects')
        .update({ approval_status: 'pending_review' })
        .eq('id', activeProject.id)

      setActiveProject(prev => ({ ...prev, approvalStatus: 'pending_review' }))
      alert('Project successfully sent to mentor for validation!')
    } catch (err) {
      console.error(err)
      alert('Failed to send project to mentor.')
    } finally {
      setSubmittingMentor(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      
      {/* ================= HEADER UTAMA: JUDUL PROYEK ================= */}
      <div className={`p-6 rounded-2xl border shadow-xs space-y-5 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
        {!activeProject.title ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 grid place-items-center text-lg border border-amber-500/30">
              <i className="fa-solid fa-lightbulb"></i>
            </div>
            <h2 className="text-xl font-bold">No Promoted Idea Found</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven&apos;t promoted any idea from the Idea Bank yet. Go to Idea Bank to pick an innovation concept.
            </p>
            <div className="pt-2">
              <Link href="/dashboard/idea-bank" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm inline-flex items-center gap-2">
                <span>Go to Idea Bank</span>
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-outline-variant/30">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600">
                    <i className="fa-solid fa-users mr-1.5"></i> {activeProject.teamName} (Owner: {currentUserName})
                  </span>
                  {activeProject.approvalStatus === 'approved' && (
                    <span className="inline-block rounded-md px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                      <i className="fa-solid fa-circle-check mr-1"></i> Approved &amp; Portfolio Unlocked
                    </span>
                  )}
                  {activeProject.approvalStatus === 'pending_review' && (
                    <span className="inline-block rounded-md px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-500">
                      <i className="fa-solid fa-clock mr-1"></i> Under Mentor Review
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight">
                  {activeProject.title}
                </h1>
                <p className={`text-xs sm:text-sm mt-1 max-w-3xl ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                  {activeProject.subtitle}
                </p>
              </div>

              {/* Avatar Member Tim & Tombol Tambah Milestone */}
              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Team Members:</span>
                  <div className="flex -space-x-2 overflow-hidden">
                    {activeProject.teamMembers.map((member, idx) => (
                    <div 
                      key={idx}
                      title={`${member.name} (${member.role})`}
                      className={`inline-flex w-8 h-8 rounded-full ring-2 ${isDarkMode ? 'ring-slate-900' : 'ring-white'} ${member.avatarColor} font-bold text-xs items-center justify-center shadow-xs cursor-pointer`}
                    >
                      {member.name.charAt(0)}
                    </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
                >
                  <i className="fa-solid fa-plus"></i> Add Team Milestone
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= KANBAN KOTAK-KOTAK TIM ================= */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm tracking-tight">Team Execution Milestones &amp; Sub-tasks</h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Collaborate with your team members and move all tasks to Completed before requesting mentor validation.
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#534434]'}`}>
            Progress: {completedTasks} / {totalTasks} Completed
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading workspace...</div>
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
                          className={`space-y-3 min-h-96 rounded-xl transition-colors p-1 ${
                            snapshot.isDraggingOver ? (isDarkMode ? 'bg-slate-800/40' : 'bg-amber-100/40') : ''
                          }`}
                        >
                          {columnTasks.length === 0 ? (
                            <div className={`text-center py-12 text-xs border border-dashed rounded-xl ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-[#d8c3ad] text-[#534434]'}`}>
                              No tasks assigned yet
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
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                        task.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                                        task.priority === 'Low' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                                        'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                      }`}>
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

                                    <div className={`pt-2 border-t space-y-2 text-[11px] ${isDarkMode ? 'border-slate-700/80' : 'border-[#d8c3ad]/40'}`}>
                                      <div className="flex items-center justify-between">
                                        <span className={`font-medium truncate max-w-36 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                                          <i className="fa-regular fa-user mr-1"></i> {task.assignee || currentUserName}
                                        </span>
                                      </div>

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
      </div>

      {/* ================= TOMBOL SEND TO MENTOR ================= */}
      {isAllCompleted && activeProject.approvalStatus === 'in_progress' && activeProject.title && (
        <div className={`p-6 rounded-2xl border text-center space-y-3 animate-fade-in ${isDarkMode ? 'bg-slate-900 border-amber-500/40 text-slate-100' : 'bg-[#fff8f4] border-amber-500/50 text-[#221a12]'}`}>
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 text-amber-500 grid place-items-center text-lg">
            <i className="fa-solid fa-flag-checkered"></i>
          </div>
          <h3 className="font-extrabold text-base">All Team Milestones Completed!</h3>
          <p className={`text-xs max-w-lg mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Your team has finished all sub-tasks. Submit your project to the mentor for validation to unlock team portfolios.
          </p>
          <button
            onClick={handleSendToMentor}
            disabled={submittingMentor}
            className="px-6 py-3 rounded-xl bg-[#F59E0B] text-[#0F172A] font-extrabold text-xs hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {submittingMentor ? 'Submitting...' : 'Send Project to Mentor for Validation'}
          </button>
        </div>
      )}

      {/* ================= MODAL TAMBAH TASK MEMBER ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-lg">Add Team Milestone / Task</h3>
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
                  placeholder="e.g. Test acoustic output..." 
                  required
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Assigned Member *</label>
                <select 
                  value={assignee} 
                  onChange={(e) => setAssignee(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                >
                  {activeProject.teamMembers.map((m, idx) => (
                    <option key={idx} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Description *</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide brief objective..." 
                  rows={2}
                  required
                  className={`w-full rounded-xl px-3 py-2.5 outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Initial Column</label>
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
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}