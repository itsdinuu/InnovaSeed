"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type PrepMilestone = {
  id: string
  stepNumber: number
  title: string
  description: string
  category: 'Research' | 'Documentation' | 'Pitch Deck' | 'Prototype'
  defaultCompleted: boolean
}

type CompetitionTeamGoal = {
  id: string
  competition_title: string
  target_date: string
  status: 'Drafting' | 'In Progress' | 'Submitted'
}

const DEFAULT_PREP_MILESTONES: PrepMilestone[] = [
  {
    id: 'm-1',
    stepNumber: 1,
    title: 'Research & Novelty Problem Statement',
    description: 'Define the core socio-technical problem, identify existing limitations, and articulate your unique research novelty or innovation angle.',
    category: 'Research',
    defaultCompleted: true
  },
  {
    id: 'm-2',
    stepNumber: 2,
    title: 'Abstract & Executive Summary (EN/ID)',
    description: 'Draft a concise 250-word abstract outlining background, methodology, key findings, and expected societal impact in professional English.',
    category: 'Documentation',
    defaultCompleted: true
  },
  {
    id: 'm-3',
    stepNumber: 3,
    title: 'Interactive Prototype & System Architecture',
    description: 'Finalize your software build, UI/UX wireframes, database schemas, or IoT circuit diagrams with clean, documented source code.',
    category: 'Prototype',
    defaultCompleted: false
  },
  {
    id: 'm-4',
    stepNumber: 4,
    title: 'Pitch Deck & 5-Minute Video Pitch',
    description: 'Create a compelling 10-slide presentation deck covering problem, solution, market validation, live demo, and scalability.',
    category: 'Pitch Deck',
    defaultCompleted: false
  },
  {
    id: 'm-5',
    stepNumber: 5,
    title: 'Ethics, Plagiarism Check & Submission Finalization',
    description: 'Verify document formatting against official rulebooks, conduct AI/plagiarism checks, and upload final files prior to deadline.',
    category: 'Documentation',
    defaultCompleted: false
  }
]

const JURY_SIMULATION_QUESTIONS = [
  {
    q: "What is the primary novelty (kebaruan) of your innovation compared to existing market solutions?",
    tip: "Highlight your unique technical stack, proprietary workflow, or distinct target demographic."
  },
  {
    q: "How did you validate your prototype or research findings with real users or benchmark data?",
    tip: "Mention user testing metrics, trial feedback, or empirical accuracy testing results."
  },
  {
    q: "What are the main scalability challenges and commercialization roadmap for this project?",
    tip: "Discuss cloud deployment, API monetization, or school/community partnership potential."
  }
]

export default function CompetitionPrepPage() {
  const { isDarkMode } = useTheme()

  const [milestones, setMilestones] = useState<PrepMilestone[]>(DEFAULT_PREP_MILESTONES)
  const [activeTab, setActiveTab] = useState<'roadmap' | 'pitch' | 'jury' | 'templates'>('roadmap')
  const [notesInput, setNotesInput] = useState('')
  const [savedNotes, setSavedNotes] = useState<string[]>([
    "Focus on highlighting the n8n automation pipeline and Supabase real-time sync during the 3-minute jury pitch.",
    "Ensure English grammar in the abstract is proofread using Grammarly or AI assistant."
  ])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleToggleMilestone = (id: string) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, defaultCompleted: !m.defaultCompleted } : m))
    setToastMessage("Milestone progress updated successfully!")
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!notesInput.trim()) return
    setSavedNotes([notesInput.trim(), ...savedNotes])
    setNotesInput('')
    setToastMessage("Preparation note added to your workspace!")
    setTimeout(() => setToastMessage(null), 3000)
  }

  const completedCount = milestones.filter(m => m.defaultCompleted).length
  const progressPercentage = Math.round((completedCount / milestones.length) * 100)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-500">
            <i className="fa-solid fa-rocket"></i> InnovaSeed Accelerator • Theme 4: Competition Prep
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">Competition Preparation Hub</h1>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            English-first strategic roadmap, pitch deck blueprints, and jury simulation training for young innovators.
          </p>
        </div>

        {/* Progress Overview Pill */}
        <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" className="text-slate-700/20 fill-none" />
              <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" strokeDasharray={100} strokeDashoffset={100 - progressPercentage} className="text-amber-500 fill-none transition-all duration-500" />
            </svg>
            <span className="absolute text-[10px] font-extrabold">{progressPercentage}%</span>
          </div>
          <div>
            <div className="text-xs font-extrabold">Readiness Score</div>
            <div className="text-[10px] text-slate-400">{completedCount} of {milestones.length} milestones complete</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b pb-3 border-inherit overflow-x-auto text-xs">
        {[
          { id: 'roadmap', label: 'Preparation Roadmap', icon: 'fa-map-location-dot' },
          { id: 'pitch', label: 'Pitch Deck & Blueprint', icon: 'fa-presentation-screen' },
          { id: 'jury', label: 'Jury Q&A Simulation', icon: 'fa-comments' },
          { id: 'templates', label: 'Templates & Notes', icon: 'fa-file-lines' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer border whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]')
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-2xl border p-6 shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fa-solid fa-list-check text-amber-500"></i> Step-by-Step Innovation Submission Checklist
            </h3>
            <div className="space-y-3">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMilestone(m.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 ${
                    m.defaultCompleted
                      ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-900')
                      : (isDarkMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12]')
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    m.defaultCompleted ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-400 bg-transparent'
                  }`}>
                    {m.defaultCompleted && <i className="fa-solid fa-check text-xs"></i>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">Phase {m.stepNumber}: {m.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        m.category === 'Research' ? 'bg-blue-500/20 text-blue-400' :
                        m.category === 'Prototype' ? 'bg-purple-500/20 text-purple-400' :
                        m.category === 'Pitch Deck' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {m.category}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1 opacity-90 ${m.defaultCompleted ? 'line-through opacity-75' : ''}`}>
                      {m.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Notes & Strategy Sidebar */}
          <div className={`rounded-2xl border p-6 shadow-sm flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
            <div className="space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <i className="fa-solid fa-lightbulb text-amber-500"></i> Strategic Mentor Tips
              </h3>
              <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-[#FEF3C7] border-amber-300 text-[#855300]'}`}>
                <p className="font-bold">English-First Rule:</p>
                <p className="text-[11px] leading-relaxed">
                  International competitions like IYSA and global science fairs require bilingual readiness. Keep your abstract, slides, and technical glossary in professional English.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2">Saved Preparation Notes:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {savedNotes.map((note, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border text-[11px] ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-[#fffcf9] border-[#d8c3ad] text-[#534434]'}`}>
                      <i className="fa-solid fa-circle-dot text-[8px] text-amber-500 mr-1.5"></i> {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleAddNote} className="mt-4 pt-4 border-t border-inherit flex gap-2">
              <input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Add quick strategy note..."
                className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-[#d8c3ad] text-slate-900'}`}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Pitch Deck */}
      {activeTab === 'pitch' && (
        <div className={`rounded-2xl border p-6 shadow-sm space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <i className="fa-solid fa-file-powerpoint text-amber-500"></i> Standard 10-Slide Pitch Deck Structure
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Recommended format for STEM & Young Innovator exhibitions.</p>
            </div>
            <a
              href="https://canva.com"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition flex items-center gap-1.5 shadow-sm"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Open Canva Template
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { slide: 'Slide 1', title: 'Hook & Project Title', desc: 'Catchy tagline, team name, and high-impact visual representation.' },
              { slide: 'Slide 2', title: 'The Problem Statement', desc: 'Real-world pain point with statistical backing or direct observation.' },
              { slide: 'Slide 3', title: 'Proposed Solution / Innovation', desc: 'Your core application, software architecture, or hardware device.' },
              { slide: 'Slide 4', title: 'Core Novelty & Technology', desc: 'Technical stack (Next.js, Supabase, AI, IoT) and unique advantages.' },
              { slide: 'Slide 5', title: 'Live Prototype Demo', desc: 'Screenshots, system workflow diagram, or embedded video demo.' },
              { slide: 'Slide 6', title: 'Market Impact & Target User', desc: 'Who benefits from this? (Students, mentors, schools, or industries).' },
              { slide: 'Slide 7', title: 'Development Roadmap', desc: 'Past milestones, current MVP status, and future expansion plans.' },
              { slide: 'Slide 8', title: 'Team Introduction', desc: 'Roles of team members (Lead Developer, UI/UX Designer, Researcher).' },
              { slide: 'Slide 9', title: 'Conclusion & Call to Action', desc: 'Summary of societal value and invitation for further collaboration.' },
              { slide: 'Slide 10', title: 'Q&A & Contact Info', desc: 'Email, GitHub repository link, official website, and QR code.' },
            ].map((s, idx) => (
              <div key={idx} className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-[#fffcf9] border-[#d8c3ad]'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-500">{s.slide}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">Required</span>
                </div>
                <div className="font-extrabold text-sm">{s.title}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Jury Q&A Simulation */}
      {activeTab === 'jury' && (
        <div className={`rounded-2xl border p-6 shadow-sm space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fa-solid fa-headset text-amber-500"></i> Interactive Jury Q&amp;A Simulation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Practice answering these high-frequency questions before your presentation.</p>
          </div>

          <div className="space-y-4">
            {JURY_SIMULATION_QUESTIONS.map((item, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'}`}>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                    Q{idx + 1}
                  </span>
                  <div className="flex-1 font-extrabold text-sm pt-1">{item.q}</div>
                </div>
                <div className={`p-3 rounded-xl border text-xs ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-[#FEF3C7] border-amber-300 text-[#855300]'}`}>
                  <strong className="font-bold">Mentor Tip:</strong> {item.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Templates & Notes */}
      {activeTab === 'templates' && (
        <div className={`rounded-2xl border p-6 shadow-sm space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fa-solid fa-download text-amber-500"></i> Official Document Templates &amp; Checklists
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Download ready-to-use boilerplate documentation for your innovation project.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              { title: 'Research Abstract Template (EN/ID)', type: 'DOCX / Markdown', size: '245 KB', desc: 'Standard structured research abstract template with background, methods, and results placeholders.' },
              { title: 'Project Budget & Timeline Matrix', type: 'XLSX / Google Sheets', size: '180 KB', desc: 'Financial planning worksheet for R&D costs, component acquisition, and event milestones.' },
              { title: 'Technical Documentation & API Spec', type: 'PDF / Markdown', size: '1.2 MB', desc: 'System architecture, database schema, and endpoint documentation for software projects.' },
              { title: 'Team Task Distribution Log', type: 'Notion / CSV', size: '95 KB', desc: 'Agile sprint backlog for tracking team tasks across research, coding, and design.' },
            ].map((doc, idx) => (
              <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-[#fffcf9] border-[#d8c3ad]'}`}>
                <div className="space-y-1">
                  <div className="font-extrabold text-sm">{doc.title}</div>
                  <div className="text-[11px] text-slate-400">{doc.desc}</div>
                  <div className="text-[10px] font-bold text-amber-500">{doc.type} • {doc.size}</div>
                </div>
                <button
                  onClick={() => {
                    setToastMessage(`Downloading "${doc.title}"...`)
                    setTimeout(() => setToastMessage(null), 3000)
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-download"></i> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
