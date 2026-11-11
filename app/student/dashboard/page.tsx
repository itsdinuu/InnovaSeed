"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function DashboardPage() {
  const [userName, setUserName] = useState('Innovator')
  const [teamName, setTeamName] = useState('Innovation Team')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUserData() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const metadata = session.user.user_metadata
        // Mengambil data dari metadata saat user melakukan register
        if (metadata?.lead_name) setUserName(metadata.lead_name)
        if (metadata?.team_name) setTeamName(metadata.team_name)
      }
      setLoading(false)
    }

    getUserData()
  }, [])

  const stats = [
    { label: 'Active Prototype', value: 'Eco-Bricks Gen 3', desc: 'Status: In Lab Testing' },
    { label: 'Milestone Completion', value: '60%', desc: '(3/5 Complete)', progress: 60 },
    { label: 'Mentor Rating', value: '4.9 / 5.0', desc: '3 Recent endorsements' },
    { label: 'Readiness Index', value: '92%', tag: 'Ready', desc: 'Clear for regional submission' }
  ]

  const steps = [
    { title: '1. Formulation', status: 'done' },
    { title: '2. Extrusion', status: 'done' },
    { title: '3. Testing (Current)', status: 'cur' },
    { title: '4. Compression', status: '' },
    { title: '5. Final Pitch', status: '' }
  ]

  const metrics = [
    { label: 'Compressive Yield', value: '24.6 MPa', note: '+14% vs Gen 2' },
    { label: 'Density Metric', value: '1.28 g/cm³', note: 'Optimal porosity' },
    { label: 'Recycled HDPE Content', value: '78.5%', note: 'Meets Circular Spec' }
  ]

  const clock = [
    { num: '14', label: 'Days' },
    { num: '08', label: 'Hours' },
    { num: '32', label: 'Mins' }
  ]

  const reqs = [
    { text: 'Abstract & Executive Summary', done: true },
    { text: 'Signed Digital Lab Notebook', done: true },
    { text: 'Institutional Safety Clearance', done: true },
    { text: '3-Minute Prototype Video', done: true },
    { text: 'Ethics Declaration (Pending Advisor Signature)', done: false },
    { text: 'High-Res Competition Poster Board', done: false }
  ]

  const deadlines = [
    { month: 'FEB', day: '28', title: 'Poster Draft Upload', sub: 'Internal peer feedback session', highlight: true },
    { month: 'MAR', day: '04', title: 'Dry-Run Pitch', sub: 'Plego Indonesia Mentor Jury' },
    { month: 'MAR', day: '10', title: 'Official Showcase', sub: 'Booth Setup & Final Sign-off' }
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-57 shrink-0 bg-white border-r border-slate-200 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-amber-500 text-white grid place-items-center">
            <i className="fa-solid fa-seedling"></i>
          </span>
          <div>
            <b className="text-[15px]">InnovaSeed <span className="text-amber-600">v2</span></b>
            <p className="text-[11px] text-slate-500">Young Innovator Hub 2025</p>
          </div>
        </div>
        
        <Link href="#" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 w-full mb-5">
          + New Innovation
        </Link>

        <nav className="space-y-1 text-sm">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-100/60 text-amber-900 font-semibold border-l-[3px] border-amber-500">
            <i className="fa-solid fa-table-cells-large w-4 text-center"></i>Dashboard
          </Link>
          <Link href="/idea-bank" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-lightbulb w-4 text-center"></i>Idea Bank
          </Link>
          <Link href="/workspace" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-folder-open w-4 text-center"></i>Project Workspace
          </Link>
          <Link href="/notes" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-pen-to-square w-4 text-center"></i>Prototype Notes
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-comments w-4 text-center"></i>Mentor Feedback
            <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">1 New</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 text-xs font-bold grid place-items-center">
              {userName.substring(0, 2).toUpperCase()}
            </span>
            <div className="text-sm leading-tight">
              <b>{loading ? 'Loading...' : userName}</b>
              <p className="text-xs text-slate-500">{teamName} • Lead</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-3 bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
          <div className="relative flex-1 max-w-85">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-sm"></i>
            <input className="w-full rounded-lg bg-slate-100 pl-9 pr-12 py-2.5 text-sm outline-none" placeholder="Search tasks, sprint backlog..." />
            <kbd className="absolute right-3 top-2.5 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
              Eco-Friendly Plastic Bricks • Sprint 4 <i className="fa-solid fa-chevron-down text-xs"></i>
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
              <i className="fa-solid fa-plus"></i> Add Task
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
              <i className="fa-regular fa-calendar-check"></i> Log Sprint
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="p-6 lg:p-8 max-w-275">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {loading ? '...' : userName} 👋{' '}
                <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 align-middle">
                  Accelerated Track
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">Sprint 4: Validation &amp; Pre-Competition Benchmarking • Next mentor review in 3 days</p>
            </div>
            <span className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900">
              <i className="fa-regular fa-calendar text-amber-500"></i> National Finals March 14, 2025
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            {stats.map((s, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs text-slate-500 mb-2">{s.label}</p>
                {s.label === 'Milestone Completion' ? (
                  <>
                    <b className="text-3xl">{s.value}</b>
                    <div className="h-1.5 bg-slate-200 rounded-full mt-2">
                      <div className="h-full w-[60%] bg-amber-500 rounded-full"></div>
                    </div>
                  </>
                ) : s.label === 'Readiness Index' ? (
                  <div className="flex items-center gap-2">
                    <b className="text-3xl">{s.value}</b>
                    <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700">{s.tag}</span>
                  </div>
                ) : (
                  <b className="text-2xl">{s.value}</b>
                )}
                <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Main Grid Content */}
          <div className="grid xl:grid-cols-[1fr_330px] gap-5 mt-5">
            <div className="space-y-5">
              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between text-xs">
                  <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-700">In Progress (Milestone 3/5)</span>
                  <span className="text-slate-400">Updated 4h ago by {teamName}</span>
                </div>
                <h2 className="text-xl font-bold mt-4">Eco-Friendly Plastic Bricks</h2>
                <p className="text-sm text-slate-500">Compression-Molded Recycled HDPE Composite for Modular Urban Pavers</p>
                <p className="text-xs text-slate-500 mt-2"><i className="fa-solid fa-pen mr-1"></i> 12 Samples Logged</p>
                
                <div className="flex justify-between text-xs font-semibold mt-5 mb-2">
                  <span>Milestone Roadmap Progress</span>
                  <span>Step 3 of 5</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {steps.map((st, i) => (
                    <div key={i} className={`rounded-lg px-3 py-2.5 ${st.status === 'done' ? 'bg-green-50 text-green-700' : st.status === 'cur' ? 'bg-amber-50 border border-amber-500 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                      {st.status === 'done' && <i className="fa-solid fa-circle-check mr-1"></i>}
                      {st.title}
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  {metrics.map((m, i) => (
                    <div key={i} className="border border-slate-200 bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500">{m.label}</p>
                      <b className="text-xl">{m.value}</b>
                      <p className="text-xs text-green-600">{m.note}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <Link href="/workspace" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600">
                    Open Workspace →
                  </Link>
                  <Link href="/notes" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
                    View Test Logs
                  </Link>
                  <span className="ml-auto text-xs text-slate-400">Project ID: GEO-2025-081</span>
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between">
                  <h3 className="font-bold"><i className="fa-regular fa-comments text-amber-500 mr-2"></i>Mentor Feedback &amp; Updates</h3>
                  <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-500 text-white">1 Unread</span>
                </div>
                <div className="flex gap-3 mt-4">
                  <span className="w-10 h-10 rounded-full bg-slate-300 shrink-0"></span>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <b className="text-sm">Dr. Raden Hartono</b>
                        <p className="text-xs text-slate-500">Senior Advisor, Material Physics Lab</p>
                      </div>
                      <span className="text-xs text-slate-400">2 hours ago</span>
                    </div>
                    <p className="inline-block rounded-md px-2 py-0.5 text-[11px] bg-slate-100 text-slate-500 font-normal mt-2">
                      Ref: Eco-Friendly Plastic Bricks • Milestone 3 Data Log
                    </p>
                    <blockquote className="border-l-4 border-amber-500 bg-amber-50/50 italic text-sm text-slate-600 px-4 py-3 mt-3">
                      &ldquo;Excellent compressive test readings on sample #B4. Ensure you document moisture absorption variance before Tuesday&apos;s rehearsal. Bring the tensile strain curves as well.&rdquo;
                    </blockquote>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 py-1.5!">Review Feedback</button>
                      <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 py-1.5!">Reply to Mentor</button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-xl p-6 text-white bg-linear-to-br from-stone-900 to-amber-950 shadow-sm">
                <div className="flex justify-between text-[11px] font-bold text-amber-400">
                  <span><i className="fa-solid fa-trophy mr-1"></i> TARGET COMPETITION</span>
                  <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold border border-amber-400 text-amber-400">National</span>
                </div>
                <h3 className="text-xl font-bold mt-3">National Science Fair 2025</h3>
                <p className="text-xs text-slate-400">Environmental Engineering &amp; Applied Sciences</p>
                <p className="text-xs text-slate-400 mt-4">Official Submission Window Closes In</p>
                
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  {clock.map((c, i) => (
                    <div key={i} className="rounded-lg bg-white/10 py-3">
                      <b className="text-2xl">{c.num}</b>
                      <p className="text-[11px] text-slate-400">{c.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs font-semibold mt-5">
                  <span>Submission Requirements</span>
                  <span className="text-amber-400">4 / 6 Complete</span>
                </div>

                <ul className="mt-3 space-y-2 text-xs text-slate-200">
                  {reqs.map((r, i) => (
                    <li key={i} className="flex gap-2 items-center">
                      <i className={r.done ? "fa-solid fa-circle-check text-amber-400" : "fa-regular fa-circle text-slate-500"}></i>
                      {r.text}
                    </li>
                  ))}
                </ul>

                <Link href="#" className="text-xs font-semibold text-amber-400 mt-4 inline-block hover:underline">
                  Competition Guidelines &amp; Rubric <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                </Link>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold">Upcoming Deadlines <i className="fa-regular fa-clock text-amber-500 text-sm ml-1"></i></h3>
                <div className="mt-3 space-y-3">
                  {deadlines.map((d, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className={`w-11 rounded-lg text-center py-1 ${d.highlight ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                        <p className="text-[10px] font-bold">{d.month}</p>
                        <b>{d.day}</b>
                      </div>
                      <div>
                        <b className="text-sm">{d.title}</b>
                        <p className="text-xs text-slate-500">{d.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-6 mt-5 shadow-sm">
            <h3 className="font-bold">Quick Lab Logger <i className="fa-solid fa-flask text-amber-500 ml-1"></i></h3>
            <div className="grid md:grid-cols-[1fr_1fr_1.3fr_auto] gap-3 items-end mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Batch Sample ID</label>
                <input className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm outline-none focus:border-amber-500" defaultValue="SAMPLE-GEO-B5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observed Tensile Modulus (GPa)</label>
                <input className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm outline-none focus:border-amber-500" placeholder="e.g. 3.42" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brief Experimental Note</label>
                <input className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm outline-none focus:border-amber-500" placeholder="Record pressure, holding duration &amp; notes" />
              </div>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 py-3!">
                <i className="fa-solid fa-floppy-disk mr-1"></i> Commit Entry to Lab Ledger
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}