"use client"

import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type Idea = {
  id: number
  title?: string
  description?: string
  status?: string
  tags?: string[] | string | null
  author_name?: string
  author_id?: string
  sketch_image_url?: string | null
  problem_statement?: string | null
  how_it_works?: string | null
  materials_needed?: string | null
  step_by_step_guide?: string | null
}

export default function IdeaBankPage() {
  const { isDarkMode } = useTheme()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('All Ideas')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<'student' | 'mentor'>('student')

  const [selectedIdeaDetail, setSelectedIdeaDetail] = useState<Idea | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Raw Concept')
  const [tags, setTags] = useState('')
  const [sketchImageUrl, setSketchImageUrl] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [howItWorks, setHowItWorks] = useState('')
  const [materialsNeeded, setMaterialsNeeded] = useState('')
  const [stepByStepGuide, setStepByStepGuide] = useState('')

  const fetchIdeas = useCallback(async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || ''
    if (email.includes('mentor') || email === 'plego@gmail.com') {
      setCurrentUserRole('mentor')
    } else {
      setCurrentUserRole('student')
    }

    const { data } = await supabase
      .from('ideas')
      .select('*')
      .order('title', { ascending: true })

    if (data) {
      setIdeas(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadInitialData = async () => {
      if (isCancelled) return
      await fetchIdeas()
    }

    const timeoutId = setTimeout(() => {
      void loadInitialData()
    }, 0)

    const channel = supabase
      .channel('realtime-idea-bank-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ideas' },
        () => {
          void fetchIdeas()
        }
      )
      .subscribe()

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [fetchIdeas])

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  function handleOpenCreateModal() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setStatus('Raw Concept')
    setTags('')
    setSketchImageUrl('')
    setProblemStatement('')
    setHowItWorks('')
    setMaterialsNeeded('')
    setStepByStepGuide('')
    setShowModal(true)
  }

  function handleOpenEditModal(item: Idea) {
    setEditingId(item.id)
    setTitle(item.title || '')
    setDescription(item.description || '')
    setStatus(item.status || 'Raw Concept')
    setTags(Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''))
    setSketchImageUrl(item.sketch_image_url || '')
    setProblemStatement(item.problem_statement || '')
    setHowItWorks(item.how_it_works || '')
    setMaterialsNeeded(item.materials_needed || '')
    setStepByStepGuide(item.step_by_step_guide || '')
    setShowModal(true)
  }

  async function handleSaveIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const formattedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null
    const studentName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'Student Innovator'

    let finalStatus = status
    if (currentUserRole === 'student') {
      if (finalStatus !== 'Under Validation') {
        finalStatus = 'Raw Concept'
      }
    }

    const payload = {
      title,
      description,
      status: finalStatus,
      tags: formattedTags,
      sketch_image_url: sketchImageUrl.trim() || null,
      problem_statement: problemStatement.trim() || null,
      how_it_works: howItWorks.trim() || null,
      materials_needed: materialsNeeded.trim() || null,
      step_by_step_guide: stepByStepGuide.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('ideas')
        .update(payload)
        .eq('id', editingId)

      if (!error) {
        setShowModal(false)
        showToast('Innovation idea successfully updated!')
        fetchIdeas()
      } else {
        showToast('Failed to update idea: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('ideas')
        .insert([
          {
            ...payload,
            author_id: userId,
            author_name: studentName
          }
        ])

      if (!error) {
        setShowModal(false)
        showToast('New innovation idea captured successfully!')
        fetchIdeas()
      } else {
        showToast('Failed to save idea: ' + error.message)
      }
    }
  }

  function handleDeleteIdea(id: number) {
    setDeleteConfirmId(id)
  }

  async function executeDelete() {
    if (!deleteConfirmId) return

    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', deleteConfirmId)

    if (!error) {
      showToast('Idea deleted successfully!')
      setDeleteConfirmId(null)
      fetchIdeas()
    } else {
      showToast('Failed to delete idea: ' + error.message)
    }
  }

  async function handlePromoteIdea(item: Idea) {
    if (item.status !== 'Approved') {
      showToast('Only approved ideas can be promoted to the project workspace!')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const currentUserId = session?.user?.id || null
    const currentName = session?.user?.user_metadata?.full_name || item.author_name || 'Desti A.'

    const projectPayload = {
      title: item.title,
      description: item.description || item.problem_statement || "Promoted from Idea Bank",
      status: 'Backlog',
      priority: 'Medium',
      assignee: currentName,
      user_id: currentUserId,
      created_at: new Date().toISOString()
    }

    const { error: insertError } = await supabase
      .from('project_tasks')
      .insert([projectPayload])

    if (insertError) {
      showToast('Failed to promote idea: ' + insertError.message)
      return
    }

    await supabase
      .from('ideas')
      .update({ status: 'Prototype' })
      .eq('id', item.id)

    showToast(`Successfully promoted "${item.title}" to Project Workspace! 🚀`)
    fetchIdeas()
  }

  const totalIdeasCount = ideas.length
  const rawConceptCount = ideas.filter(i => i.status === 'Raw Concept').length
  const underValidationCount = ideas.filter(i => i.status === 'Under Validation').length
  const approvedCount = ideas.filter(i => i.status === 'Approved').length
  const prototypeCount = ideas.filter(i => i.status === 'Prototype').length

  const filteredIdeas = ideas.filter(item => {
    const matchesTab = activeTab === 'All Ideas' || item.status === activeTab
    const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas, tags, authors..." 
            className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs outline-none transition border shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500' : 'bg-white border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
          />
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
        >
          <i className="fa-solid fa-plus"></i> Capture New Idea
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold">Idea Bank 💡</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Capture and validate concepts before they become prototypes.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Total Ideas</div>
          <div className="text-2xl font-black">{totalIdeasCount}</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Raw Concepts</div>
          <div className="text-2xl font-black">{rawConceptCount}</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Under Validation</div>
          <div className="text-2xl font-black">{underValidationCount}</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Approved</div>
          <div className="text-2xl font-black">{approvedCount}</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Prototypes</div>
          <div className="text-2xl font-black">{prototypeCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#fff1e5] border-[#d8c3ad]'}`}>
          {['All Ideas', 'Raw Concept', 'Under Validation', 'Approved', 'Prototype'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === tab 
                  ? (isDarkMode ? 'bg-slate-800 text-amber-400 shadow-xs' : 'bg-white text-slate-900 shadow-xs') 
                  : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-[#534434] hover:text-slate-900')
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading ideas from database...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div 
            onClick={handleOpenCreateModal}
            className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition space-y-3 group min-h-60 ${isDarkMode ? 'border-amber-500/40 bg-slate-900/50 hover:bg-slate-900' : 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/80'}`}
          >
            <div className="w-12 h-12 bg-[#F59E0B] text-[#0F172A] rounded-2xl grid place-items-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
              <i className="fa-solid fa-lightbulb text-lg"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm">Have a new idea?</h3>
              <p className={`text-[11px] mt-1 max-w-xs px-2 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                Describe the problem, your hypothesis and the impact.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] shadow-sm">
              <i className="fa-solid fa-plus"></i> Capture New Idea
            </span>
          </div>

          {filteredIdeas.map((item) => {
            const isUserCreated = item.author_name !== 'InnovaSeed';

            return (
              <div key={item.id} className={`border rounded-2xl p-6 shadow-xs space-y-4 relative group flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
                {isUserCreated && (
                  <div className="absolute top-5 right-5 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                    <button 
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit Idea"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600'}`}
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button 
                      onClick={() => handleDeleteIdea(item.id)}
                      title="Delete Idea"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400' : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'}`}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between pr-14">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${
                      item.status === 'Prototype' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30' :
                      item.status === 'Approved' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30' :
                      item.status === 'Under Validation' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                      (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                    }`}>
                      {item.status || 'Raw Concept'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base">{item.title}</h3>
                    <p className={`text-xs mt-1 leading-relaxed line-clamp-3 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{item.description}</p>
                  </div>

                  {item.sketch_image_url && (
                    <div className="h-32 w-full rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950/20 relative">
                      <Image
                        src={item.sketch_image_url}
                        alt="Sketch preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3">
                  {item.tags && (Array.isArray(item.tags) ? item.tags.length > 0 : String(item.tags).trim() !== '') ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(item.tags) ? item.tags : String(item.tags).replace(/[{}]/g, '').split(',')).map((tag: string, idx: number) => (
                        <span key={idx} className={`text-[10px] px-2 py-0.5 rounded font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#fff1e5] text-[#534434]'}`}>
                          #{tag.trim().replace(/"/g, '')}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      onClick={() => setSelectedIdeaDetail(item)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-[#d8c3ad] hover:bg-[#fff1e5] text-[#534434]'}`}
                    >
                      <i className="fa-solid fa-circle-info text-amber-500"></i> Detail &amp; Guide
                    </button>

                    {item.status === 'Approved' && (
                      <button 
                        onClick={() => handlePromoteIdea(item)}
                        className="py-2 px-3 rounded-xl text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Promote to Project Workspace"
                      >
                        <i className="fa-solid fa-rocket"></i> Promote
                      </button>
                    )}
                  </div>

                  <div className={`flex items-center justify-between pt-3 border-t text-xs ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center text-[10px]">
                        {(item.author_name || 'I').charAt(0).toUpperCase()}
                      </span>
                      <span className={`font-medium truncate max-w-40 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{item.author_name || 'InnovaSeed'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail & Guide */}
      {selectedIdeaDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 border max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {selectedIdeaDetail.status}
                </span>
                <h3 className="font-bold text-lg mt-1">{selectedIdeaDetail.title}</h3>
              </div>
              <button onClick={() => setSelectedIdeaDetail(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            {selectedIdeaDetail.sketch_image_url && (
              <div className="relative h-48 rounded-xl overflow-hidden border border-slate-700/50">
                <Image
                  src={selectedIdeaDetail.sketch_image_url}
                  alt="Project Sketch"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation"></i> 1. The Problem (What issue are we solving?)
                </h4>
                <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                  {selectedIdeaDetail.problem_statement || selectedIdeaDetail.description || "Everyday challenge or inefficiency encountered by students that requires an innovative prototype solution."}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-gears"></i> 2. How It Works (The Solution)
                </h4>
                <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                  {selectedIdeaDetail.how_it_works || "A concise explanation of how the mechanism or software logic operates to solve the defined problem simply."}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-toolbox"></i> 3. Materials Needed (Mini Toolkit)
                </h4>
                <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                  {selectedIdeaDetail.materials_needed || "List of accessible tools or components (e.g., used cardboard, tape, sensors, micro:bit, or Scratch/Figma account)."}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}>
                <h4 className="font-bold text-amber-500 mb-1.5 flex items-center gap-2">
                  <i className="fa-solid fa-list-check"></i> 4. Step-by-Step Build Guide
                </h4>
                <p className={`whitespace-pre-line ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                  {selectedIdeaDetail.step_by_step_guide || "1. Draft initial sketches or wireframe layouts.\n2. Gather required physical or digital toolkits.\n3. Build the core functional prototype.\n4. Test performance and refine for presentation."}
                </p>
              </div>
            </div>

            <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <button 
                type="button" 
                onClick={() => setSelectedIdeaDetail(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>

              {selectedIdeaDetail.status === 'Approved' && (
                <button 
                  type="button" 
                  onClick={() => {
                    const targetItem = selectedIdeaDetail;
                    setSelectedIdeaDetail(null);
                    handlePromoteIdea(targetItem);
                  }}
                  className="px-5 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-rocket"></i> Promote to Project Workspace
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Create & Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 border max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-lg text-amber-500">
                {editingId ? 'Edit Innovation Idea ✏️' : 'Capture New Innovation Idea 💡'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveIdea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Idea Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Solar-Powered Pencil Sharpener"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Short Summary (2–3 sentences) *</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Explain what your invention does and how it helps people..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Category Tags (comma separated, max 3)</label>
                <input 
                  type="text" 
                  placeholder="IoT, Clean Tech, Education"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Sketch / Image Link (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/my-sketch.png"
                  value={sketchImageUrl}
                  onChange={(e) => setSketchImageUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">1. The Problem Statement (Optional Guide)</label>
                <textarea 
                  rows={2}
                  placeholder="What issue are we solving?"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">2. How It Works (Optional Guide)</label>
                <textarea 
                  rows={2}
                  placeholder="Explain the solution mechanism..."
                  value={howItWorks}
                  onChange={(e) => setHowItWorks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">3. Materials Needed (Optional Guide)</label>
                <input 
                  type="text"
                  placeholder="e.g., Cardboard, sensors, micro:bit"
                  value={materialsNeeded}
                  onChange={(e) => setMaterialsNeeded(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">4. Step-by-Step Build Guide (Optional Guide)</label>
                <textarea 
                  rows={3}
                  placeholder="1. Draft initial sketches... 2. Build core..."
                  value={stepByStepGuide}
                  onChange={(e) => setStepByStepGuide(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}
                >
                  {currentUserRole === 'student' ? (
                    <>
                      <option value="Raw Concept">Raw Concept</option>
                      <option value="Under Validation">Under Validation</option>
                    </>
                  ) : (
                    <>
                      <option value="Raw Concept">Raw Concept</option>
                      <option value="Under Validation">Under Validation</option>
                      <option value="Approved">Approved</option>
                      <option value="Prototype">Prototype</option>
                    </>
                  )}
                </select>
                {currentUserRole === 'student' && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    *Students can set status to Raw Concept or submit for Under Validation. Mentor approval is required for Approved / Prototype states.
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 font-bold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 cursor-pointer shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Save Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 grid place-items-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 className="font-bold text-sm">Delete Innovation Idea</h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Are you sure you want to delete this idea? This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={executeDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check text-[10px]"></i>
          </span>
          <div>
            <b className="block text-slate-100 font-bold">InnovaSeed Notification</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}