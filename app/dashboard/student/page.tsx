"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

type ProjectData = {
  id?: string | number
  title: string
  subtitle?: string
  description?: string
  status?: string
  category?: string
  project_code?: string
}

type TelemetryLog = {
  id?: number | string
  title: string
  status: string
  date: string
  user_id?: string
}

export default function StudentDashboardPage() {
  const { isDarkMode } = useTheme()
  const [userName, setUserName] = useState()
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // State data real & interaksi
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>([])
  const [newLogTitle, setNewLogTitle] = useState('')
  const [sampleId, setSampleId] = useState('SAMPLE-01')
  const [experimentalMetric, setExperimentalMetric] = useState('')
  const [experimentalNote, setExperimentalNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Statistik Real-Time
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 })
  const [mentorRating, setMentorRating] = useState<{ score: number | string; count: number }>({ score: 'No Review', count: 0 })
  const [readinessIndex, setReadinessIndex] = useState<{ percentage: number; statusText: string }>({ percentage: 0, statusText: 'Pending' })

  const triggerToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  useEffect(() => {
    let isMounted = true

    async function initDashboard() {
      try {
        setLoading(true)

        // 1. Ambil sesi auth user yang sedang login
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          if (isMounted) setLoading(false)
          return
        }

        const user = session.user
        if (isMounted) setCurrentUserId(user.id)

        // Ambil nama dari user metadata atau email
        const resolvedName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        if (isMounted) setUserName(resolvedName)

        // 2. Ambil proyek aktif dari Idea Bank milik user ini
        const { data: ideaRecords } = await supabase
          .from('ideas')
          .select('*')
          .eq('author_id', user.id)
          .order('id', { ascending: false })
          .limit(1)

        if (isMounted && ideaRecords && ideaRecords.length > 0) {
          const idea = ideaRecords[0]
          setProjectData({
            id: idea.id,
            title: idea.title,
            description: idea.problem_statement || idea.description || "Active innovation prototype build phase in progress.",
            status: idea.status ? idea.status.toUpperCase() : 'PROTOTYPE ACTIVE',
            category: idea.research_field || idea.category || 'Applied Sciences & Software Engineering'
          })
        } else {
          // Cek ke tabel projects jika di ideas kosong
          const { data: projRecords } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)

          if (isMounted && projRecords && projRecords.length > 0) {
            const proj = projRecords[0]
            setProjectData({
              id: proj.id,
              title: proj.title,
              subtitle: proj.subtitle,
              description: proj.subtitle || proj.project_code || "Active innovation prototype build phase in progress.",
              status: proj.approval_status ? proj.approval_status.toUpperCase() : 'PROTOTYPE ACTIVE',
              category: 'Applied Sciences & Software Engineering'
            })
          }
        }

        // 3. Ambil telemetry logs
        const { data: logsData } = await supabase
          .from('research_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('id', { ascending: false })

        if (isMounted && logsData) {
          setTelemetryLogs(logsData)
        }

        // 4. Ambil task stats dari Kanban
        const { data: tasksData } = await supabase
          .from('project_tasks')
          .select('status')
          .eq('user_id', user.id)

        let calcTotal = 0
        let calcCompleted = 0
        if (tasksData && tasksData.length > 0) {
          calcTotal = tasksData.length
          calcCompleted = tasksData.filter(t => t.status === 'Completed' || t.status === 'completed').length
          if (isMounted) setTaskStats({ total: calcTotal, completed: calcCompleted })
        }

        const taskPercent = calcTotal > 0 ? Math.round((calcCompleted / calcTotal) * 100) : 0
        const logBonus = Math.min(logsData ? logsData.length * 5 : 0, 20)
        const finalReadiness = Math.min(taskPercent + logBonus, 100)

        if (isMounted) {
          setReadinessIndex({
            percentage: finalReadiness,
            statusText: finalReadiness >= 80 ? 'Ready' : finalReadiness > 0 ? 'In Progress' : 'Pending'
          })
        }

        // 5. Ambil rating mentor
        const { data: feedbackData } = await supabase.from('mentor_feedback').select('rating')
        if (isMounted && feedbackData && feedbackData.length > 0) {
          const totalScore = feedbackData.reduce((acc, curr) => acc + (curr.rating || 0), 0)
          const avgScore = Number((totalScore / feedbackData.length).toFixed(1))
          setMentorRating({ score: avgScore, count: feedbackData.length })
        }

      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return
    
    const logTitleText = newLogTitle.trim() || `Sample ${sampleId} - Metric: ${experimentalMetric || 'Experimental trial'}`
    setSubmitting(true)

    try {
      const currentDate = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('research_logs')
        .insert([{
          user_id: currentUserId,
          title: logTitleText,
          status: 'Pending Review',
          date: currentDate
        }])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setTelemetryLogs(prev => [data[0], ...prev])
      }

      setNewLogTitle('')
      setExperimentalMetric('')
      setExperimentalNote('')
      triggerToast('Lab ledger entry successfully committed to cloud!')
    } catch (err: unknown) {
      console.error(err)
      triggerToast('Failed to commit entry to cloud ledger.')
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercentage = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading your innovator dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Welcome Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xs transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {userName} 👋</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Sprint Validation &amp; Pre-Competition Benchmarking • <span className="text-amber-500 font-bold">InnovaSeed Active Session</span>
          </p>
        </div>

        <div className={`flex items-center gap-2 self-start md:self-auto px-3 py-2 rounded-xl border shadow-xs ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}>
          <i className="fa-solid fa-flag-checkered text-amber-500 text-lg"></i>
          <div className="flex flex-col text-left text-xs">
            <span className="text-slate-400">Competition Track</span>
            <span className="font-bold text-amber-500">National Science Fair (Active)</span>
          </div>
        </div>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Active Idea / Project</span>
            <i className="fa-solid fa-lightbulb text-amber-500"></i>
          </div>
          <div className="mt-2">
            <h3 className="text-base font-bold truncate">{projectData ? projectData.title : 'No Idea Selected'}</h3>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-500 font-medium truncate">{projectData ? (projectData.category || 'Idea Bank Active') : 'Go to Idea Bank'}</span>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Milestone Completion</span>
            <i className="fa-solid fa-chart-pie text-amber-500"></i>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{progressPercentage}%</h3>
              <span className="text-xs text-slate-400">({taskStats.completed}/{taskStats.total} Complete)</span>
            </div>
            <div className={`w-full rounded-full h-2 mt-2 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-[#fff1e5]'}`}>
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Mentor Rating</span>
            <i className="fa-solid fa-star text-amber-500"></i>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{mentorRating.score}</h3>
              {typeof mentorRating.score === 'number' && <span className="text-xs text-slate-400">/ 5.0</span>}
            </div>
            <span className="text-xs text-slate-400 block mt-1">{mentorRating.count > 0 ? `${mentorRating.count} Recent endorsements` : 'Awaiting mentor review'}</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Readiness Index</span>
            <i className="fa-solid fa-gauge-high text-amber-500"></i>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{readinessIndex.percentage}%</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold">{readinessIndex.statusText}</span>
            </div>
            <span className="text-xs text-amber-500 block mt-1 font-semibold">Based on task milestone progress</span>
          </div>
        </div>
      </div>

      {/* Active Project Card & Competition Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Project Card */}
        <div className={`lg:col-span-8 rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-inherit">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {projectData ? (projectData.status || 'IDEA ACTIVE') : 'No Active Idea'}
                  </span>
                  <span className="text-xs text-slate-400">Owner: {userName}</span>
                </div>
                <h2 className="text-xl font-bold mt-2">
                  {projectData ? projectData.title : 'No Idea Selected from Idea Bank'}
                </h2>
                <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                  {projectData 
                    ? (projectData.description || projectData.subtitle)
                    : 'You have not selected or created an idea in the Idea Bank yet. Go to Idea Bank to add your innovation concept.'}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/5 text-amber-600 border border-amber-500/20 font-semibold shrink-0">
                {telemetryLogs.length} Samples Logged
              </span>
            </div>

            {!projectData ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 grid place-items-center text-lg border border-amber-500/30">
                  <i className="fa-solid fa-lightbulb"></i>
                </div>
                <h3 className="font-bold text-sm">No Idea Found for {userName}</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Create or pick an idea from your Idea Bank to activate your individual workspace.</p>
                <div className="pt-2">
                  <Link href="/dashboard/idea-bank" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm inline-flex items-center gap-2">
                    <span>Go to Idea Bank</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="py-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold">Milestone Roadmap Progress</span>
                    <span className="text-amber-500 font-bold">{progressPercentage}% Completed</span>
                  </div>
                  <div className={`w-full rounded-full h-3 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-[#fff1e5]'}`}>
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff1e5]/50 border-[#d8c3ad]'}`}>
                    <span className="text-xs text-slate-400">Category / Track</span>
                    <p className="text-sm font-bold mt-0.5 truncate">{projectData.category || 'Applied Sciences'}</p>
                    <span className="text-[11px] text-emerald-600 font-semibold">Idea Bank Verified</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff1e5]/50 border-[#d8c3ad]'}`}>
                    <span className="text-xs text-slate-400">Kanban Tasks</span>
                    <p className="text-sm font-bold mt-0.5">{taskStats.completed} of {taskStats.total} Done</p>
                    <span className="text-[11px] text-slate-400">Cloud Synced</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-[#fff1e5]/50 border-[#d8c3ad]'}`}>
                    <span className="text-xs text-slate-400">Idea ID</span>
                    <p className="text-sm font-bold mt-0.5">#{projectData.id}</p>
                    <span className="text-[11px] text-amber-500 font-bold">Supabase Active</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {projectData && (
            <div className="flex items-center justify-between pt-4 border-t border-inherit mt-4">
              <div className="flex items-center gap-2">
                <Link href="/dashboard/workspace" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm inline-flex items-center gap-2">
                  <span>Open Workspace</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </Link>
                <Link href="/dashboard/idea-bank" className={`px-4 py-2 border rounded-xl text-xs font-medium transition ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-[#d8c3ad] bg-[#fff8f4] hover:bg-[#fbebdd]'}`}>
                  Explore Idea Bank
                </Link>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline-block">InnovaSeed v2 Workspace</span>
            </div>
          )}
        </div>

        {/* Competition Countdown Widget */}
        <div className="lg:col-span-4 bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-trophy text-amber-400 text-lg"></i>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">TARGET COMPETITION</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px]">National</span>
            </div>

            <div className="mt-3">
              <h3 className="text-base font-bold text-white">National Science Fair 2026</h3>
              <p className="text-xs text-slate-400 mt-0.5">Environmental Engineering &amp; Applied Sciences</p>
            </div>

            <div className="mt-4 p-3 bg-black/40 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">Submission Window Closes In</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-lg font-bold text-amber-400 block">14</span>
                  <span className="text-[9px] text-slate-400 uppercase">Days</span>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-lg font-bold text-amber-400 block">08</span>
                  <span className="text-[9px] text-slate-400 uppercase">Hours</span>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-lg font-bold text-amber-400 block">32</span>
                  <span className="text-[9px] text-slate-400 uppercase">Mins</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-300 mb-1">
                <span>Requirements</span>
                <span className="text-amber-400">{taskStats.completed} / {taskStats.total || 6} Complete</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300"><i className="fa-solid fa-circle-check text-amber-400 text-xs"></i> Abstract &amp; Executive Summary</div>
              <div className="flex items-center gap-2 text-slate-300"><i className="fa-solid fa-circle-check text-amber-400 text-xs"></i> Signed Digital Lab Notebook</div>
              <div className="flex items-center gap-2 text-slate-300"><i className="fa-solid fa-circle-check text-amber-400 text-xs"></i> Institutional Safety Clearance</div>
              <div className="flex items-center gap-2 text-slate-300"><i className="fa-solid fa-circle-check text-amber-400 text-xs"></i> 3-Minute Prototype Video</div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link href="/dashboard/competition-prep" className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm">
              <span>Competition Guidelines &amp; Rubric</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
            </Link>
          </div>
        </div>

      </div>

      {/* Mentor Feedback & Quick Lab Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mentor Feedback */}
        <div className={`lg:col-span-6 rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-comments text-amber-500"></i>
                <h3 className="text-sm font-bold">Mentor Feedback &amp; Updates</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/30">Unread</span>
            </div>

            <div className="flex items-start gap-3 mt-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center shrink-0 border border-amber-500/30">
                DR
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold">Dr. Raden Hartono</h4>
                    <span className="text-slate-400 text-[11px]">Senior Advisor, Applied Sciences Lab</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">Recent</span>
                </div>
                <div className={`mt-2 p-3 rounded-xl border-l-4 border-amber-500 text-xs ${isDarkMode ? 'bg-slate-800/60' : 'bg-[#fff1e5]'}`}>
                  <p className="italic">
                    &quot;Ensure your project tasks and milestones in the workspace are updated regularly for the upcoming evaluation review.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-inherit mt-4">
            <Link href="/dashboard/mentor-feedback" className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition shadow-sm">
              Review Feedback
            </Link>
            <Link href="/dashboard/mentor-feedback" className={`px-3 py-1.5 border rounded-xl text-xs font-medium transition ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-[#d8c3ad] bg-[#fff8f4] hover:bg-[#fbebdd]'}`}>
              Reply to Mentor
            </Link>
          </div>
        </div>

        {/* Quick Lab Notebook Logger Widget */}
        <div className={`lg:col-span-6 rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <span className="text-sm font-bold">Quick Lab Logger</span>
              <i className="fa-solid fa-flask-vial text-amber-500"></i>
            </div>
            
            <form onSubmit={handleAddLog} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Batch Sample ID</label>
                <input 
                  type="text" 
                  value={sampleId} 
                  onChange={(e) => setSampleId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Experimental Metric / Parameter</label>
                <input 
                  type="text" 
                  value={experimentalMetric}
                  onChange={(e) => setExperimentalMetric(e.target.value)}
                  placeholder="e.g. +12dB amplification boost" 
                  className={`w-full px-3 py-2 rounded-xl outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Brief Experimental Note</label>
                <textarea 
                  value={experimentalNote}
                  onChange={() => experimentalNote}
                  placeholder="Record resonance observations or acoustic tuning..." 
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl outline-none border resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{submitting ? 'Committing...' : 'Commit Entry to Lab Ledger'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>

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