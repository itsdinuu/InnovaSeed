"use client"

import Link from 'next/link'

export default function IdeaBankPage() {
  const stats = [
    { label: 'Total Ideas', value: '18', sub: '', note: '+3 this sprint', noteColor: 'text-green-600' },
    { label: 'Under Validation', value: '5', sub: '', note: 'Awaiting mentor input', noteColor: 'text-slate-500' },
    { label: 'Promoted to Prototype', value: '3', sub: '', note: 'Incl. Eco-Bricks Gen 3', noteColor: 'text-slate-500' },
    { label: 'Avg. Feasibility Score', value: '7.4', sub: ' / 10', note: 'Mentor-rated', noteColor: 'text-slate-500' }
  ]

  const filters = ['All Ideas', 'Raw Concept', 'Under Validation', 'Approved', 'Prototype']

  const statusStyles: Record<string, string> = {
    'Prototype': 'bg-green-100 text-green-700',
    'Under Validation': 'bg-amber-100 text-amber-800',
    'Approved': 'bg-blue-100 text-blue-700',
    'Raw Concept': 'bg-slate-100 text-slate-600'
  }

  const ideas = [
    {
      icon: 'fa-recycle',
      col: 'bg-green-50 text-green-600',
      status: 'Prototype',
      title: 'Eco-Friendly Plastic Bricks',
      desc: 'Compression-molded recycled HDPE composite for modular urban pavers.',
      tags: ['#circular-economy', '#materials'],
      author: 'Nadia K.',
      votes: 42,
      score: 9.2
    },
    {
      icon: 'fa-droplet',
      col: 'bg-sky-50 text-sky-600',
      status: 'Under Validation',
      title: 'Low-Cost Rainwater Purifier',
      desc: 'Charcoal and sand filter cartridge for household rainwater harvesting in rural areas.',
      tags: ['#water', '#community'],
      author: 'Raka P.',
      votes: 31,
      score: 8.1
    },
    {
      icon: 'fa-solar-panel',
      col: 'bg-amber-50 text-amber-600',
      status: 'Approved',
      title: 'Solar-Powered Soil Sensor',
      desc: 'Self-charging IoT probe tracking moisture and pH for smallholder farms.',
      tags: ['#iot', '#agritech'],
      author: 'Sari W.',
      votes: 27,
      score: 7.8
    },
    {
      icon: 'fa-leaf',
      col: 'bg-emerald-50 text-emerald-600',
      status: 'Under Validation',
      title: 'Banana-Fiber Bioplastic Film',
      desc: 'Biodegradable packaging film made from banana stem waste.',
      tags: ['#biomaterials', '#packaging'],
      author: 'Dimas A.',
      votes: 19,
      score: 7.2
    },
    {
      icon: 'fa-wind',
      col: 'bg-purple-50 text-purple-600',
      status: 'Raw Concept',
      title: 'Urban Air-Quality Wearable',
      desc: 'Clip-on sensor warning students of PM2.5 spikes on their commute.',
      tags: ['#health', '#sensors'],
      author: 'Putri L.',
      votes: 11,
      score: 6.5
    }
  ]

  return (
    <div className="flex min-h-screen bg-amber-50/20 font-sans text-slate-900">
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
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-table-cells-large w-4 text-center"></i>Dashboard
          </Link>
          <Link href="/idea-bank" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-100/60 text-amber-900 font-semibold border-l-[3px] border-amber-500">
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
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-trophy w-4 text-center"></i>Competition Prep
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50">
            <i className="fa-solid fa-id-badge w-4 text-center"></i>Portfolio
          </Link>
        </nav>

        <div className="mt-auto">
          <div className="border border-slate-200 rounded-xl p-3 text-xs mb-4">
            <div className="flex justify-between font-semibold text-slate-600">
              <span><i className="fa-solid fa-cloud mr-1 text-slate-400"></i>Lab Storage</span>
              <span>3.8 / 5 GB</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full my-2">
              <div className="h-full w-[76%] bg-amber-500 rounded-full"></div>
            </div>
            <div className="flex justify-between text-slate-500">
              <span><i className="fa-solid fa-circle text-green-500 text-[6px] align-middle"></i> System Synced</span>
              <Link href="#" className="text-amber-800 font-semibold">Details</Link>
            </div>
          </div>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600">
            <i className="fa-solid fa-gear w-4"></i>Settings
          </Link>
          <div className="flex items-center gap-3 border-t border-slate-200 pt-4 mt-2">
            <span className="w-10 h-10 rounded-full bg-linear-to-br from-amber-200 to-slate-400 inline-flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-white">NK</span>
            <div className="text-sm leading-tight">
              <b>Nadia Kusuma</b>
              <p className="text-xs text-slate-500">Team GeoPoly • Lead</p>
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
            <input className="w-full rounded-lg bg-slate-100 pl-9 pr-12 py-2.5 text-sm outline-none" placeholder="Search ideas, tags, authors..." />
            <kbd className="absolute right-3 top-2.5 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
              <i className="fa-regular fa-bell"></i>
            </button>
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 text-xs font-bold grid place-items-center">NK</span>
          </div>
        </header>

        {/* Main Body */}
        <main className="p-6 lg:p-8 max-w-275">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <h1 className="text-3xl font-bold">Idea Bank</h1>
              <p className="text-sm text-slate-500 mt-1">Capture, vote and validate concepts before they become prototypes.</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600">
              <i className="fa-solid fa-plus"></i> Capture New Idea
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            {stats.map((s, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">{s.label}</p>
                <div className="mt-1">
                  <b className="text-3xl">{s.value}</b>
                  <span className="text-slate-400">{s.sub}</span>
                </div>
                <p className={`text-xs mt-1 ${s.noteColor}`}>{s.note}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-6 text-sm">
            {filters.map((t, i) => (
              <button
                key={i}
                className={`rounded-full px-4 py-1.5 font-medium border transition ${i === 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                {t}
              </button>
            ))}
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 ml-auto py-1.5!">
              <i className="fa-solid fa-arrow-down-wide-short"></i> Most Voted
            </button>
          </div>

          {/* Ideas Cards Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
            {ideas.map((item, i) => (
              <article key={i} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
                <div className="flex justify-between">
                  <span className={`w-10 h-10 rounded-lg grid place-items-center ${item.col}`}>
                    <i className={`fa-solid ${item.icon}`}></i>
                  </span>
                  <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold h-fit ${statusStyles[item.status]}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="font-bold mt-4">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                
                <div className="flex gap-2 mt-3 flex-wrap">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="inline-block rounded-md px-2 py-0.5 text-[11px] bg-slate-100 text-slate-500 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 mt-4 pt-3 text-xs text-slate-500">
                  <span className="w-8 h-8 rounded-full bg-linear-to-br from-amber-200 to-slate-400 inline-flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-2 ring-white">
                    {item.author[0]}
                  </span>
                  {item.author}
                  <span className="ml-auto text-amber-800 font-semibold">
                    <i className="fa-solid fa-arrow-up mr-1"></i> {item.votes} votes
                  </span>
                  <b className="ml-2 text-sm text-slate-900">{item.score}</b>
                </div>
              </article>
            ))}

            {/* Capture New Idea Card */}
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 text-center flex flex-col items-center justify-center">
              <span className="w-11 h-11 rounded-full bg-amber-500 text-white grid place-items-center mb-3">
                <i className="fa-solid fa-lightbulb"></i>
              </span>
              <b className="text-sm">Have a new idea?</b>
              <p className="text-xs text-slate-500 mt-1 max-w-57.5">
                Describe the problem, your hypothesis and the impact. Mentors will rate feasibility.
              </p>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 mt-4 py-1.5!">
                Capture New Idea
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}