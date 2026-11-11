"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Idea = {
  id?: number
  title?: string
  description?: string
  status?: string
  tags?: string[] | string
  author_id?: string | null
  votes?: number
  feasibility_score?: number | string
}

export default function IdeaBankPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Raw Concept')
  const [tags, setTags] = useState('')
  const [feasibilityScore, setFeasibilityScore] = useState('7.5')

  useEffect(() => {
    fetchIdeas()
  }, [])

  // 1. Ambil data langsung dari tabel ideas secara bersih tanpa relasi rumit
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

  async function handleCreateIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null

    const formattedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

    const { error } = await supabase.from('ideas').insert([
      {
        title,
        description,
        status,
        tags: formattedTags,
        author_id: userId,
        votes: 0,
        feasibility_score: parseFloat(feasibilityScore) || 0
      }
    ])

    if (!error) {
      setTitle('')
      setDescription('')
      setStatus('Raw Concept')
      setTags('')
      setFeasibilityScore('7.5')
      setShowModal(false)
      fetchIdeas() // Otomatis refresh daftar ide setelah berhasil simpan
    } else {
      alert('Failed to save idea: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Idea Bank 💡</h1>
          <p className="text-sm text-slate-500 mt-1">Capture, vote and validate concepts before they become prototypes.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
        >
          <i className="fa-solid fa-plus"></i> Capture New Idea
        </button>
      </div>

      {/* Ideas List Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse text-sm">Loading ideas from database...</div>
      ) : ideas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm max-w-xl mx-auto">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl grid place-items-center mx-auto mb-3 text-lg">
            <i className="fa-solid fa-lightbulb"></i>
          </div>
          <h3 className="font-bold text-slate-900">No Ideas Captured Yet</h3>
          <p className="text-sm text-slate-500 mt-1">Be the first to submit your brilliant concept to the bank.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {ideas.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                  {item.status || 'Raw Concept'}
                </span>
                <span className="text-xs font-bold text-amber-600">Score: {item.feasibility_score ?? 0}/10</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(item.tags) ? item.tags : [item.tags]).map((tag: string, idx: number) => (
                      <span key={idx} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                ) : <span>No tags</span>}
                <span className="flex items-center gap-1 font-semibold text-slate-700 ml-auto">
                  <i className="fa-solid fa-caret-up text-amber-500"></i> {item.votes || 0} votes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Form Input */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg">Capture New Innovation Idea</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Idea Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Smart IoT Composting Bin" 
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description &amp; Concept</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how this concept works..." 
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  >
                    <option value="Raw Concept">Raw Concept</option>
                    <option value="Under Validation">Under Validation</option>
                    <option value="Prototype">Prototype</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Feasibility Score (0 - 10)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="10"
                    value={feasibilityScore} 
                    onChange={(e) => setFeasibilityScore(e.target.value)}
                    placeholder="8.5" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={tags} 
                  onChange={(e) => tags && setTags(e.target.value)}
                  onChangeCapture={(e) => setTags(e.target.value)}
                  placeholder="iot, agritech, materials" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                />
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
                  Save Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}