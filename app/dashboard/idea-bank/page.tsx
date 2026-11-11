"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type Idea = {
  id: number
  title?: string
  description?: string
  status?: string
  tags?: string[] | string | null
  feasibility_score?: number | string | null
  votes?: number
  author_name?: string
}

export default function IdeaBankPage() {
  const { isDarkMode } = useTheme()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('All Ideas')
  const [searchQuery, setSearchQuery] = useState('')
  
  // State untuk mode Edit
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Raw Concept')
  const [tags, setTags] = useState('')
  const [feasibilityScore, setFeasibilityScore] = useState('7.5')

  useEffect(() => {
    fetchIdeas()
  }, [])

  async function fetchIdeas() {
    setLoading(true)
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .order('id', { ascending: false })

    if (data) {
      setIdeas(data)
    }
    setLoading(false)
  }

  // Fungsi Buka Modal
  function handleOpenCreateModal() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setStatus('Raw Concept')
    setTags('')
    setFeasibilityScore('7.5')
    setShowModal(true)
  }

  function handleOpenEditModal(item: Idea) {
    setEditingId(item.id)
    setTitle(item.title || '')
    setDescription(item.description || '')
    setStatus(item.status || 'Raw Concept')
    setTags(Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''))
    setFeasibilityScore(item.feasibility_score?.toString() || '7.5')
    setShowModal(true)
  }

  async function handleSaveIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const formattedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const parsedScore = parseFloat(feasibilityScore) || 0

    if (editingId) {
      const { error } = await supabase
        .from('ideas')
        .update({
          title,
          description,
          status,
          tags: formattedTags,
          feasibility_score: parsedScore
        })
        .eq('id', editingId)

      if (!error) {
        setShowModal(false)
        fetchIdeas()
      } else {
        alert('Failed to update idea: ' + error.message)
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null
      const leadName = session?.user?.user_metadata?.lead_name || 'Innovator'

      const { error } = await supabase.from('ideas').insert([
        {
          title,
          description,
          status,
          tags: formattedTags,
          author_id: userId,
          author_name: leadName,
          votes: 0,
          feasibility_score: parsedScore
        }
      ])

      if (!error) {
        setShowModal(false)
        fetchIdeas()
      } else {
        alert('Failed to save idea: ' + error.message)
      }
    }
  }

  async function handleDeleteIdea(id: number) {
    if (!confirm('Are you sure you want to delete this idea?')) return

    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchIdeas()
    } else {
      alert('Failed to delete idea: ' + error.message)
    }
  }

  async function handleVote(item: Idea) {
    const newVotes = (item.votes || 0) + 1
    const { error } = await supabase
      .from('ideas')
      .update({ votes: newVotes })
      .eq('id', item.id)

    if (!error) {
      setIdeas(ideas.map(i => i.id === item.id ? { ...i, votes: newVotes } : i))
    }
  }

  // Statistik Dinamis
  const totalIdeasCount = ideas.length
  const underValidationCount = ideas.filter(i => i.status === 'Under Validation').length
  const prototypeCount = ideas.filter(i => i.status === 'Prototype').length
  const avgScore = ideas.length > 0 
    ? (ideas.reduce((acc, curr) => acc + Number(curr.feasibility_score || 0), 0) / ideas.length).toFixed(1) 
    : '0.0'

  // Filter & Search Logic
  const filteredIdeas = ideas.filter(item => {
    const matchesTab = activeTab === 'All Ideas' || item.status === activeTab
    const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search Bar */}
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

      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-extrabold">Idea Bank</h1>
        <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Capture, vote and validate concepts before they become prototypes.</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Total Ideas</div>
          <div className="text-2xl font-black">{totalIdeasCount}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">+ active cohort</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Under Validation</div>
          <div className="text-2xl font-black">{underValidationCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold">Awaiting mentor input</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Promoted to Prototype</div>
          <div className="text-2xl font-black">{prototypeCount}</div>
          <div className="text-[11px] text-indigo-500 font-semibold">Active build phase</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-xs space-y-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Avg. Self-Assessed Score</div>
          <div className="text-2xl font-black">{avgScore} <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-500' : 'text-[#534434]'}`}>/10</span></div>
          <div className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Student evaluated</div>
        </div>
      </div>

      {/* Filter Tabs & Sort Bar */}
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

        <div className={`text-xs font-semibold flex items-center gap-1 border px-3 py-1.5 rounded-xl shadow-xs transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-[#d8c3ad] text-[#534434]'}`}>
          <i className="fa-solid fa-arrow-down-wide-short text-amber-500"></i> Most Voted
        </div>
      </div>

      {/* Ideas Grid List */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading ideas from database...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {filteredIdeas.map((item) => (
            <div key={item.id} className={`border rounded-2xl p-6 shadow-xs space-y-4 relative group flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
              
              {/* Tombol Edit & Delete di Kanan Atas */}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between pr-14">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${
                    item.status === 'Prototype' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' :
                    item.status === 'Under Validation' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                    item.status === 'Approved' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30' :
                    (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                  }`}>
                    {item.status || 'Raw Concept'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base">{item.title}</h3>
                  <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{item.description}</p>
                </div>
              </div>

              <div className="space-y-3 pt-3">
                {/* Tags */}
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(item.tags) ? item.tags : [item.tags]).map((tag: string, idx: number) => (
                      <span key={idx} className={`text-[10px] px-2 py-0.5 rounded font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#fff1e5] text-[#534434]'}`}>
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Footer Card: Author, Votes & Score */}
                <div className={`flex items-center justify-between pt-3 border-t text-xs ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center text-[10px]">
                      {(item.author_name || 'I').charAt(0).toUpperCase()}
                    </span>
                    <span className={`font-medium truncate max-w-25 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{item.author_name || 'Innovator'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleVote(item)}
                      className="flex items-center gap-1 font-semibold hover:text-amber-500 transition cursor-pointer"
                      title="Click to Upvote"
                    >
                      <i className="fa-solid fa-caret-up text-amber-500 text-sm"></i> {item.votes || 0} votes
                    </button>
                    <span className={`font-bold px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-[#fff1e5] border-[#d8c3ad]'}`}>{item.feasibility_score ?? '0.0'}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}

          {/* Kotak CTA "Have a new idea?" */}
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
                Describe the problem, your hypothesis and the impact. Submit your self-assessment.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-[#F59E0B] text-[#0F172A] shadow-sm">
              <i className="fa-solid fa-plus"></i> Capture New Idea
            </span>

          </div>

        </div>
      )}

      {/* Modal / Form Input (Create & Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-lg">
                {editingId ? 'Edit Innovation Idea ✏️' : 'Capture New Innovation Idea 💡'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveIdea} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Idea Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Smart IoT Composting Bin" 
                  required
                  className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Description &amp; Concept</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the problem, hypothesis and impact..." 
                  rows={3}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                  >
                    <option value="Raw Concept">Raw Concept</option>
                    <option value="Under Validation">Under Validation</option>
                    <option value="Approved">Approved</option>
                    <option value="Prototype">Prototype</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Self-Assessment Feasibility (0 - 10)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="10"
                    value={feasibilityScore} 
                    onChange={(e) => setFeasibilityScore(e.target.value)}
                    placeholder="8.5" 
                    className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="circular-economy, materials, iot" 
                  className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
                />
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
                  {editingId ? 'Save Changes' : 'Save Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}