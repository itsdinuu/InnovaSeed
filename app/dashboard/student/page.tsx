"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

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
  const [userName, setUserName] = useState('Innovator')
  const [researchField, setResearchField] = useState('Computer Science & IoT')
  const [mentorEmail, setMentorEmail] = useState('Pending Verification')
  const [institution, setInstitution] = useState('SMKN 8 Jakarta')
  const [teamSize, setTeamSize] = useState('3 members')
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  
  // State untuk menyimpan data real dari Supabase
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([])
  const [newLogTitle, setNewLogTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const user = session.user
      setCurrentUserId(user.id)

      if (user.user_metadata) {
        const meta = user.user_metadata
        if (meta.lead_name) setUserName(meta.lead_name)
        if (meta.research_field) setResearchField(meta.research_field)
        if (meta.mentor_email) setMentorEmail(meta.mentor_email)
        if (meta.institution) setInstitution(meta.institution)
        if (meta.team_size) setTeamSize(meta.team_size)
      }

      // 1. Ambil data real telemetry logs dari tabel Supabase
      const { data: logsData, error: logsError } = await supabase
        .from('research_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!logsError && logsData) {
        setTelemetryLogs(logsData)
      }

      // 2. Ambil data project dari Supabase
      const { data: projectDataResult } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (projectDataResult) {
        setProjectData(projectDataResult)
      }

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  // Fungsi untuk menambah log secara real ke database
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLogTitle.trim() || !currentUserId) return

    setSubmitting(true)
    try {
      const currentDate = new Date().toISOString().split('T')[0]
      const newLogPayload = {
        user_id: currentUserId,
        title: newLogTitle,
        status: 'Pending Review',
        date: currentDate
      }

      const { data, error } = await supabase
        .from('research_logs')
        .insert([newLogPayload])
        .select()

      if (error) throw error

      if (data) {
        setTelemetryLogs([data[0], ...telemetryLogs])
      }
      setNewLogTitle('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit telemetry log.'
      alert(message)
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <span className="inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 mb-2">
            <i className="fa-solid fa-circle-check mr-1.5"></i> Active Cohort Session · 2026 Qualifier
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your research workspace is synchronized under <span className="text-slate-800 font-semibold">{researchField}</span> track.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs space-y-0.5">
          <div className="text-slate-400 text-[10px] uppercase font-semibold">Assigned Mentor</div>
          <div className="font-bold text-slate-800">{mentorEmail}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <i className="fa-solid fa-shield-halved"></i> Faculty Verified
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Kiri: Real Telemetry & Lab Notebooks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Research Telemetry &amp; Lab Notebooks</h2>
                <p className="text-xs text-slate-500">Record your daily trial results and experimental parameters.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
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
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : '+ Add Log'}
              </button>
            </form>

            <div className="space-y-3">
              {telemetryLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No telemetry logs recorded yet. Add your first milestone above!</p>
              ) : (
                telemetryLogs.map((log, idx) => (
                  <div key={log.id || idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                    <div>
                      <b className="text-xs font-semibold text-slate-800 block">{log.title}</b>
                      <span className="text-[11px] text-slate-400"><i className="fa-regular fa-clock mr-1"></i> {log.date}</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${log.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Project Status Section */}
          {!projectData ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl grid place-items-center mx-auto mb-3 text-lg">
                <i className="fa-solid fa-lightbulb"></i>
              </div>
              <h2 className="text-base font-bold text-slate-900">No Innovation Projects Registered</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You haven&apos;t submitted any innovation data to the database yet. Start capturing ideas or register your first prototype now!
              </p>
              <div className="mt-5 flex justify-center">
                <Link 
                  href="/dashboard/idea-bank" 
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                >
                  <i className="fa-solid fa-plus"></i> Capture New Idea
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-md font-semibold">
                In Progress
              </span>
              <h2 className="text-lg font-bold mt-2">{projectData.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{projectData.description}</p>
            </div>
          )}
        </div>

        {/* Kanan: Competition Dossier */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Competition Dossier</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Team Scale</span>
                <span className="font-semibold text-slate-900">{teamSize}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Institution</span>
                <span className="font-semibold text-slate-900">{institution}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-slate-600">Ethics Clearance</span>
                <span className="font-semibold text-emerald-600">ISO/IEC Compliant</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert('Exporting PDF dossier package...')}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
              >
                <i className="fa-solid fa-file-arrow-down mr-1.5 text-amber-400"></i> Export Research Dossier
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-xs space-y-3 text-slate-700">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <i className="fa-solid fa-triangle-exclamation"></i> Submission Deadline
            </div>
            <p className="leading-relaxed text-slate-600">
              Preliminary prototype telemetry and lab notebooks for the PLEGO 2026 National Qualifier must be finalized before June 15, 2026.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}