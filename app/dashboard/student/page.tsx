"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

type ProjectData = {
  id?: string
  title: string
  description: string
}

type TelemetryLog = {
  id?: number | string
  title: string
  status: string
  date: string
}

export default function StudentDashboardPage() {
  const { isDarkMode } = useTheme()
  const [userName, setUserName] = useState('Innovator')
  const [researchField, setResearchField] = useState('Computer Science & IoT')
  const [mentorEmail, setMentorEmail] = useState('Pending Verification')
  const [institution, setInstitution] = useState('Plego Indonesia')
  const [teamSize, setTeamSize] = useState('3 members')
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // State untuk menyimpan data real dari Supabase
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([])
  const [newLogTitle, setNewLogTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showDossierModal, setShowDossierModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      try {
        const mockStorage = localStorage.getItem('innovaseed_mock_session')
        if (mockStorage) {
          try {
            const mockSession = JSON.parse(mockStorage)
            if (mockSession?.role === 'student' || mockSession?.route === '/dashboard/student') {
              const name = mockSession.name || 'Student Innovator'
              if (!cancelled) {
                setUserName(name)
                setResearchField('STEM RESEARCH TRACK')
                setMentorEmail('mentor.maya@innovaseed.sch.id')
                setInstitution('Plego Indonesia')
                setTeamSize('3 members')
                setTelemetryLogs([
                  { id: 'mock-telemetry-1', title: 'Prototype vibration stress check', status: 'Pending Review', date: '2026-11-12' },
                  { id: 'mock-telemetry-2', title: 'Thermal efficiency optimization', status: 'Verified', date: '2026-11-11' }
                ])
                setProjectData({ title: 'Adaptive Sensor Mesh Prototype', description: 'AI-assisted rapid monitoring system for field deployment.' })
                setCurrentUserId('mock-student-user')
                setLoading(false)
              }
              return
            }
          } catch {
            // Ignore malformed mock session, continue with real auth check
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (!cancelled) setLoading(false)
          return
        }

        const user = session.user
        setCurrentUserId(user.id)

        const { data: profileDataResult } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${user.id},uuid.eq.${user.id}`)
          .maybeSingle()

        if (profileDataResult) {
          if (profileDataResult.full_name) setUserName(profileDataResult.full_name)
          if (profileDataResult.institution) setInstitution(profileDataResult.institution)
          if (profileDataResult.role) setResearchField(profileDataResult.role.toUpperCase() + ' TRACK')
        } else if (user.user_metadata) {
          const meta = user.user_metadata as Record<string, string>
          if (meta.lead_name) setUserName(meta.lead_name)
          if (meta.research_field) setResearchField(meta.research_field)
          if (meta.mentor_email) setMentorEmail(meta.mentor_email)
          if (meta.institution) setInstitution(meta.institution)
          if (meta.team_size) setTeamSize(meta.team_size)
        }

        const currentDate = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
        .from('research_logs')
        .insert([{
          user_id: user.id || currentUserId || 'default-user',
          title: newLogTitle,
          status: 'Pending Review',
          date: currentDate
        }])
        .select()

      if (error) throw error

      if (data) {
        // Gabungkan data terbaru dari database ke state
        setTelemetryLogs([data[0], ...telemetryLogs])
      }
      setNewLogTitle('')

        const { data: projectDataResult } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (projectDataResult) {
          setProjectData(projectDataResult)
        }
      } catch {
        if (!cancelled) setLoading(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 400)

    fetchDashboardData()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [currentUserId, newLogTitle, telemetryLogs])

const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLogTitle.trim()) return

    setSubmitting(true)
    try {
      const currentDate = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('research_logs')
        .insert([{
          title: newLogTitle,
          status: 'Pending Review',
          date: currentDate
        }])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setTelemetryLogs([data[0], ...telemetryLogs])
      }
      
      setNewLogTitle('')
      
      // Panggil fungsi showToast di sini supaya garis kuningnya hilang & notifikasinya muncul!
      showToast("Telemetry log successfully recorded to cloud!")
      
    } catch (err: unknown) {
      console.error(err)
      
      const fallbackEntry = {
        id: Date.now(),
        title: newLogTitle,
        status: 'Pending Review',
        date: new Date().toISOString().split('T')[0]
      }
      
      setTelemetryLogs([fallbackEntry, ...telemetryLogs])
      setNewLogTitle('')
      
      // Panggil juga di sini kalau mau munculin toast saat fallback
      showToast("Log added locally (Database sync pending).")
      
    } finally {
      setSubmitting(false)
    }
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-slate-500 animate-pulse">Loading innovation data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Header */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
        <div>
          <span className="inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 mb-2">
            <i className="fa-solid fa-circle-check mr-1.5"></i> Active Cohort Session · 2026 Qualifier
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {userName} 👋
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Your research workspace is synchronized under <span className="font-semibold">{researchField}</span> track.
          </p>
        </div>

        <div className={`border px-4 py-3 rounded-xl text-xs space-y-0.5 transition-colors ${isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-[#fff1e5] border-[#d8c3ad]/60'}`}>
          <div className="text-slate-400 text-[10px] uppercase font-semibold">Assigned Mentor</div>
          <div className="font-bold">{mentorEmail}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <i className="fa-solid fa-shield-halved"></i> Faculty Verified
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Kiri: Real Telemetry & Lab Notebooks */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-2xl border p-6 shadow-xs transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-base font-bold">Research Telemetry &amp; Lab Notebooks</h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Record your daily trial results and experimental parameters.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/30">
                {telemetryLogs.length} Logs Recorded
              </span>
            </div>

            <form onSubmit={handleAddLog} className="flex gap-2 mb-6">
              <input
                type="text"
                required
                value={newLogTitle}
                onChange={(e) => setNewLogTitle(e.target.value)}
                placeholder="Enter trial description or telemetry milestone..."
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'}`}
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-[#F59E0B] text-[#0F172A] font-semibold text-xs hover:bg-[#D97706] transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {submitting ? 'Saving...' : '+ Add Log'}
              </button>
            </form>

            <div className="space-y-3">
              {telemetryLogs.length === 0 ? (
                <p className={`text-xs text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-[#534434]'}`}>No telemetry logs recorded yet. Add your first milestone above!</p>
              ) : (
                telemetryLogs.map((log, idx) => (
                  <div key={log.id || idx} className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-[#fff1e5]/40 border-[#d8c3ad]/50'}`}>
                    <div>
                      <b className="text-xs font-semibold block">{log.title}</b>
                      <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}><i className="fa-regular fa-clock mr-1"></i> {log.date}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${log.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'}`}>
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Project Status Section */}
          {!projectData ? (
            <div className={`border rounded-2xl p-8 text-center shadow-xs transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto mb-3 text-lg">
                <i className="fa-solid fa-lightbulb"></i>
              </div>
              <h2 className="text-base font-bold">No Innovation Projects Registered</h2>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                You haven&apos;t submitted any innovation data to the database yet. Start capturing ideas or register your first prototype now!
              </p>
              <div className="mt-5 flex justify-center">
                <Link 
                  href="/dashboard/idea-bank" 
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] shadow-sm cursor-pointer"
                >
                  <i className="fa-solid fa-plus"></i> Capture New Idea
                </Link>
              </div>
            </div>
          ) : (
            <div className={`border rounded-2xl p-6 shadow-xs transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
              <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-600 px-2.5 py-0.5 rounded-md font-semibold">
                In Progress
              </span>
              <h2 className="text-lg font-bold mt-2">{projectData.title}</h2>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{projectData.description}</p>
            </div>
          )}
        </div>

        {/* Kanan: Competition Dossier */}
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 shadow-xs space-y-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
            <h3 className="text-sm font-bold border-b pb-3 transition-colors">Competition Dossier</h3>
            
            <div className="space-y-3 text-xs">
              <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <span className={isDarkMode ? 'text-slate-400' : 'text-[#534434]'}>Team Scale</span>
                <span className="font-semibold">{teamSize}</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <span className={isDarkMode ? 'text-slate-400' : 'text-[#534434]'}>Institution</span>
                <span className="font-semibold">{institution}</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <span className={isDarkMode ? 'text-slate-400' : 'text-[#534434]'}>Ethics Clearance</span>
                <span className="font-semibold text-emerald-600">ISO/IEC Compliant</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDossierModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-file-arrow-down text-amber-400"></i> Export Research Dossier
              </button>
            </div>
          </div>

          <div className={`border rounded-2xl p-6 text-xs space-y-3 transition-colors ${isDarkMode ? 'bg-amber-500/15 border-amber-500/30 text-slate-300' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <i className="fa-solid fa-triangle-exclamation"></i> Submission Deadline
            </div>
            <p className={`leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Preliminary prototype telemetry and lab notebooks for the PLEGO 2026 National Qualifier must be finalized before June 15, 2026.
            </p>
          </div>
        </div>

      </div>

      {/* Modal Pratinjau & Unduh Research Dossier */}
      {showDossierModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base">Competition Research Dossier 📄</h3>
              <button onClick={() => setShowDossierModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Official project documentation package compiled for the PLEGO National Science Fair 2026 qualifier. Contains team metrics, verified telemetry logs, and ISO/IEC compliance audit.
            </p>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#534434]'}`}>
              <p className="font-bold"><i className="fa-solid fa-circle-info mr-1 text-amber-500"></i> Package Details:</p>
              <p>Lead Researcher: {userName}</p>
              <p>Institution: {institution}</p>
              <p>Track: {researchField}</p>
              <p>Total Telemetry Logs: {telemetryLogs.length} entries</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowDossierModal(false)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDossierModal(false)
                  setToastMessage("Research Dossier PDF successfully compiled and downloaded!")
                  setTimeout(() => setToastMessage(null), 4000)
                }}
                className="px-5 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer transition"
              >
                Download PDF Package
              </button>
            </div>
          </div>
        </div>
      )}

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

function showToast(message: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const toast = document.createElement('div')
  toast.className = 'fixed bottom-6 right-6 z-[60] animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs'
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  toast.innerHTML = `
    <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
      <i class="fa-solid fa-check"></i>
    </span>
    <div>
      <b class="block text-slate-200">Success</b>
      <p class="text-slate-400">${message}</p>
    </div>
  `

  document.body.appendChild(toast)
  window.setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300')
    window.setTimeout(() => toast.remove(), 300)
  }, 4000)
}
