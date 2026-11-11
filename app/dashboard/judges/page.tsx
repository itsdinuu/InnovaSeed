"use client"

import Link from 'next/link'

export default function JudgePortalPage() {
  const metrics = [
    { label: 'Assigned Entries', value: '8 Teams', desc: 'Category: Environmental Tech' },
    { label: 'Evaluations Completed', value: '5 / 8', desc: '3 pending final scoring' },
    { label: 'Average Score Given', value: '88.4 / 100', desc: 'Calibrated with rubric' },
    { label: 'Grand Finals Window', value: 'Open', desc: 'Closes Mar 12, 2025' }
  ]

  const queue = [
    { code: 'GEO-2025-081', team: 'Team GeoPoly', project: 'Eco-Friendly Plastic Bricks', track: 'Materials Science', status: 'In Evaluation', highlight: true },
    { code: 'BIO-2025-104', team: 'Bio-Spark Team', project: 'Banana-Fiber Bioplastic Film', track: 'Biotechnology', status: 'Scored (94.5)' },
    { code: 'IOT-2025-033', team: 'AgriSense Lab', project: 'Solar-Powered Soil Sensor', track: 'Computer Science', status: 'Pending Review' }
  ]

  const rubricCriteria = [
    { title: 'Scientific Rigor & Methodology', max: '25 pts', score: '23' },
    { title: 'Originality & Creativity', max: '20 pts', score: '18' },
    { title: 'Prototype Viability & Telemetry', max: '25 pts', score: '24' },
    { title: 'Presentation & Defense Quality', max: '30 pts', score: '27' }
  ]

  return (
    <div className="flex min-h-screen bg-stone-900 font-sans text-stone-100">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-57 shrink-0 bg-stone-950 border-r border-stone-800 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 grid place-items-center font-bold">
            <i className="fa-solid fa-trophy"></i>
          </span>
          <div>
            <b className="text-[15px]">InnovaSeed <span className="text-amber-400">Judge</span></b>
            <p className="text-[11px] text-stone-400">Evaluation Portal v2</p>
          </div>
        </div>
        
        <div className="rounded-lg bg-stone-900 p-3 text-xs mb-5 border border-stone-800">
          <p className="text-stone-400">Authorized Evaluator:</p>
          <b className="block text-amber-300 mt-0.5">Grand Jury Panel #4</b>
          <span className="text-[10px] text-stone-400">INASEF 2025 Finals</span>
        </div>

        <nav className="space-y-1 text-sm">
          <Link href="/dashboard/judges" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-amber-500">
            <i className="fa-solid fa-scale-balanced w-4 text-center"></i>Judge Portal
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-300 hover:bg-stone-900">
            <i className="fa-solid fa-list-check w-4 text-center"></i>Scoring Queue
            <span className="ml-auto bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full">3</span>
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-300 hover:bg-stone-900">
            <i className="fa-solid fa-file-lines w-4 text-center"></i>Rubric Guidelines
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-300 hover:bg-stone-900">
            <i className="fa-solid fa-medal w-4 text-center"></i>Submitted Scores
          </Link>
        </nav>

        <div className="mt-auto">
          <Link href="/login" className="flex items-center gap-3 px-3 py-2 text-sm text-stone-400 hover:text-white">
            <i className="fa-solid fa-right-from-bracket w-4"></i>Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-3 bg-stone-950 border-b border-stone-800 px-6 py-3 sticky top-0 z-10">
          <div className="relative flex-1 max-w-85">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-stone-400 text-sm"></i>
            <input className="w-full rounded-lg bg-stone-900 border border-stone-800 pl-9 pr-12 py-2.5 text-sm text-stone-100 outline-none focus:border-amber-500" placeholder="Search team code, project title..." />
            <kbd className="absolute right-3 top-2.5 text-[10px] text-stone-400 border border-stone-700 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-block rounded-md px-3 py-1 text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              ● Blind Evaluation Mode Active
            </span>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800">
              <i className="fa-regular fa-bell"></i>
            </button>
            <span className="w-9 h-9 rounded-full bg-amber-500 text-stone-950 text-xs font-bold grid place-items-center">JP</span>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-275">
          <div>
            <h1 className="text-2xl font-bold">Competition Judge Portal 🏆</h1>
            <p className="text-sm text-stone-400 mt-1">Review finalist dossiers, evaluate laboratory telemetry, and input standardized INASEF scoring rubrics.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            {metrics.map((m, i) => (
              <div key={i} className="bg-stone-950 border border-stone-800 rounded-xl p-5">
                <p className="text-xs text-stone-400 mb-1">{m.label}</p>
                <b className="text-2xl text-stone-100">{m.value}</b>
                <p className="text-xs text-stone-500 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Queue Section */}
          <section className="bg-stone-950 border border-stone-800 rounded-xl p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg"><i className="fa-solid fa-clipboard-list text-amber-500 mr-2"></i>Assigned Finalist Evaluation Queue</h2>
              <span className="text-xs text-stone-400">National Grand Finals 2025</span>
            </div>

            <div className="space-y-3">
              {queue.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${item.highlight ? 'border-amber-500 bg-amber-500/5' : 'border-stone-800 bg-stone-900/50'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono bg-stone-800 px-2 py-0.5 rounded text-amber-400">{item.code}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-stone-800 text-stone-300 rounded font-medium">{item.track}</span>
                    </div>
                    <b className="block text-base mt-1.5">{item.project}</b>
                    <p className="text-xs text-stone-400">Team: {item.team}</p>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${item.status.includes('Scored') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {item.status}
                    </span>
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition bg-amber-500 text-stone-950 hover:bg-amber-400">
                      Open Rubric Sheet →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Active Scoring Rubric Preview */}
          <section className="bg-stone-950 border border-stone-800 rounded-xl p-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base"><i className="fa-solid fa-calculator text-amber-500 mr-2"></i>INASEF Standard Rubric Breakdown</h3>
                <p className="text-xs text-stone-400 mt-0.5">Active evaluation for Team GeoPoly (GEO-2025-081)</p>
              </div>
              <span className="text-xl font-bold text-amber-400">Total: 92 / 100 pts</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              {rubricCriteria.map((rc, i) => (
                <div key={i} className="bg-stone-900 border border-stone-800 rounded-lg p-4">
                  <div className="flex justify-between text-xs font-semibold text-stone-300 mb-2">
                    <span>{rc.title}</span>
                    <span className="text-amber-400">Max: {rc.max}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="30" defaultValue={rc.score} className="flex-1 accent-amber-500" />
                    <span className="w-12 text-center font-bold text-sm bg-stone-950 py-1 rounded border border-stone-800">{rc.score}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-stone-800">
              <button className="rounded-lg px-4 py-2.5 text-xs font-semibold bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800">
                Save Draft Evaluation
              </button>
              <button className="rounded-lg px-4 py-2.5 text-xs font-semibold bg-amber-500 text-stone-950 hover:bg-amber-400">
                <i className="fa-solid fa-stamp mr-1.5"></i> Submit Final Official Score
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}