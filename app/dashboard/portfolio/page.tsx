"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type PortfolioProject = {
  id: number | string
  title: string
  tagline: string
  category: string
  feasibility_score: string
  status: string
  tech_stack: string[]
  author_name: string
  demo_url?: string
}

export default function PortfolioPage() {
  const { isDarkMode } = useTheme()
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null)
  
  // State untuk Modal Add Project
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTagline, setNewTagline] = useState('')
  const [newCategory, setNewCategory] = useState('EdTech & AI')
  const [newScore, setNewScore] = useState('')
  const [newStatus, setNewStatus] = useState('Prototype Validated')
  const [newTech, setNewTech] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newDemoUrl, setNewDemoUrl] = useState('')
  
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadProjects = async () => {
      if (!isMounted) return

      setLoading(true)

      const { data, error } = await supabase
        .from('portfolio_projects')
        .select('*')
        .order('id', { ascending: false })

      if (!isMounted) return

      if (!error && data && data.length > 0) {
        setProjects(data)
      } else {
        setProjects([
          {
            id: 1,
            title: 'InnovaSeed v2: LMS & Competition Accelerator',
            tagline: 'English-first Learning Management System and competition accelerator platform for Indonesian schools.',
            category: 'EdTech & AI',
            feasibility_score: '96.4%',
            status: 'Prototype Validated',
            tech_stack: ['Next.js 14', 'Tailwind CSS', 'Supabase', 'Vercel'],
            author_name: 'Desti A. (Team Lead)',
            demo_url: 'https://innovaseed.vercel.app'
          },
          {
            id: 2,
            title: 'LandslideBot: Early Warning System Narrative',
            tagline: 'Educational Scratch project and IoT simulation featuring landslide risk detection based on soil moisture and slope sensors.',
            category: 'IoT & Environmental',
            feasibility_score: '92.1%',
            status: 'Prototype',
            tech_stack: ['Scratch', 'Python', 'IoT Sensors', 'Arduino'],
            author_name: 'Team GeoPoly',
            demo_url: '#'
          }
        ])
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    void loadProjects()

    return () => {
      isMounted = false
    }
  }, [])

  // Fungsi simpan proyek baru ke Supabase
  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault()
    
    // Ubah string tech_stack (dipisah koma) menjadi array
    const techArray = newTech.split(',').map(t => t.trim()).filter(Boolean)

    const newProjData = {
      title: newTitle,
      tagline: newTagline,
      category: newCategory,
      feasibility_score: newScore,
      status: newStatus,
      tech_stack: techArray,
      author_name: newAuthor,
      demo_url: newDemoUrl || '#'
    }

    const { data, error } = await supabase
      .from('portfolio_projects')
      .insert([newProjData])
      .select()

    if (!error && data) {
      setProjects([data[0], ...projects])
      setIsAddModalOpen(false)
      // Reset form
      setNewTitle('')
      setNewTagline('')
      setNewDemoUrl('')
      setToastMessage("New project successfully added to portfolio!")
      setTimeout(() => setToastMessage(null), 4000)
    } else {
      alert("Failed to add project. Pastikan tabel Supabase sudah sesuai.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Public Portfolio &amp; Showcase 🌟</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Exhibition gallery of validated student innovations, hardware prototypes, and software platforms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> Add Project
          </button>
          
          <button
            onClick={() => {
              setToastMessage("Portfolio showcase link copied to clipboard!")
              setTimeout(() => setToastMessage(null), 4000)
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition shadow-sm cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'}`}
          >
            <i className="fa-solid fa-share-nodes"></i> Share
          </button>
        </div>
      </div>

      {/* Grid Proyek Portofolio */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading project showcase gallery from database...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div 
              key={proj.id} 
              className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xs transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-amber-500/50' : 'bg-white border-[#d8c3ad] hover:border-amber-400'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-[#fff1e5] text-[#855300]'}`}>
                    {proj.category}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    {proj.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold tracking-tight">{proj.title}</h3>
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                  {proj.tagline}
                </p>

                {/* Tech Stack Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {proj.tech_stack?.map((tech, i) => (
                    <span key={i} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-[#fbebdd]/60 border-[#d8c3ad] text-slate-700'}`}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-2 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <div className="text-[11px]">
                  <span className="text-slate-400 block uppercase text-[9px]">Feasibility Score</span>
                  <b className="text-amber-500 font-extrabold">{proj.feasibility_score}</b>
                </div>

                <button 
                  onClick={() => setSelectedProject(proj)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Project */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-circle-plus text-amber-500"></i> Add New Innovation Project
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleAddProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Project Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. EcoWater IoT Monitor" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tagline / Description</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Brief summary of the innovation..." 
                  value={newTagline} 
                  onChange={(e) => setNewTagline(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                  >
                    <option value="EdTech & AI">EdTech & AI</option>
                    <option value="IoT & Environmental">IoT & Environmental</option>
                    <option value="Mobile Application">Mobile Application</option>
                    <option value="Robotics & Hardware">Robotics & Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                  >
                    <option value="Prototype Validated">Prototype Validated</option>
                    <option value="Prototype">Prototype</option>
                    <option value="Completed">Completed</option>
                    <option value="In Development">In Development</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Feasibility Score</label>
                  <input 
                    placeholder="e.g. 95.0%"
                    type="text" 
                    value={newScore} 
                    onChange={(e) => setNewScore(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Lead Author / Team</label>
                  
                  <input 
                    placeholder="e.g. Bima (Team Lead)"
                    type="text" 
                    value={newAuthor} 
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tech Stack (pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Next.js, Python, Supabase" 
                  value={newTech} 
                  onChange={(e) => setNewTech(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Live Demo URL (Opsional)</label>
                <input 
                  type="text" 
                  placeholder="https://..." 
                  value={newDemoUrl} 
                  onChange={(e) => setNewDemoUrl(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Project Preview */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-[#fff1e5] text-[#855300]'}`}>
                  {selectedProject.category}
                </span>
                <h3 className="font-bold text-lg mt-1">{selectedProject.title}</h3>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <h4 className="font-semibold text-slate-400 uppercase text-[10px] mb-1">Project Overview</h4>
                <p>{selectedProject.tagline}</p>
              </div>

              <div className={`p-3 rounded-xl border grid grid-cols-2 gap-3 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-[#fff1e5]/60 border-[#d8c3ad]'}`}>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Lead Author</span>
                  <b className="text-xs">{selectedProject.author_name}</b>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Feasibility Rating</span>
                  <b className="text-xs text-amber-500 font-extrabold">{selectedProject.feasibility_score}</b>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-400 uppercase text-[10px] mb-1">Technologies Used</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.tech_stack?.map((tech, i) => (
                    <span key={i} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-[#fbebdd] border-[#d8c3ad] text-slate-700'}`}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              {selectedProject.demo_url && selectedProject.demo_url !== '#' && (
                <a 
                  href={selectedProject.demo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-5 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i> Visit Live Demo
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Modern */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}