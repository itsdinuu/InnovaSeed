"use client"

import { useState } from 'react'
import Link from 'next/link'

export default function IdeaBankPage() {
  const [ideas, setIdeas] = useState([
    {
      id: 'IDEA-01',
      title: 'Compression-Molded Recycled HDPE Composite Pavers',
      category: 'Materials Science',
      author: 'Nadia Kusuma',
      votes: 14,
      feasibility: '92%',
      status: 'Active Prototype',
      desc: 'Using post-consumer bottle caps and low-density packaging mixed with agricultural fiber ash for heavy-duty urban sidewalk tiles.'
    },
    {
      id: 'IDEA-02',
      title: 'Solar-Powered Automated Drip Irrigation with Soil Moisture Sensor',
      category: 'AgriTech & IoT',
      author: 'Team GeoPoly',
      votes: 9,
      feasibility: '85%',
      status: 'Under Validation',
      desc: 'Low-cost microcontroller setup using ESP32 to regulate water distribution in urban farming vertical gardens.'
    },
    {
      id: 'IDEA-03',
      title: 'Banana-Fiber Bioplastic Packaging Film',
      category: 'Biotechnology',
      author: 'Research Sub-division B',
      votes: 7,
      feasibility: '78%',
      status: 'Raw Concept',
      desc: 'Extracting cellulose from agricultural banana stem waste to create flexible, home-compostable shopping bags.'
    }
  ])

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
        
        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 w-full mb-5">
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
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 text-xs font-bold grid place-items-center">NK</span>
            <div className="text-sm leading-tight">
              <b>Nadia Kusuma</b>
              <p className="text-xs text-slate-500">Team GeoPoly • Lead</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-3 bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
          <div className="relative flex-1 max-w-85">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-sm"></i>
            <input className="w-full rounded-lg bg-slate-100 pl-9 pr-12 py-2.5 text-sm outline-none" placeholder="Search concepts, tags..." />
            <kbd className="absolute right-3 top-2.5 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-block rounded-md px-3 py-1 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800">
              ● Idea Repository Active
            </span>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-275">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Innovation Idea Bank 💡</h1>
              <p className="text-sm text-slate-500 mt-1">Brainstorm, vote on raw hypotheses, and evaluate feasibility scores before scaling into lab sprints.</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600">
              <i className="fa-solid fa-plus"></i> Submit New Concept
            </button>
          </div>

          {/* Ideas List Grid */}
          <div className="grid gap-4 mt-6">
            {ideas.map((idea) => (
              <div key={idea.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{idea.id}</span>
                    <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium border border-amber-200">{idea.category}</span>
                    <span className="text-[11px] px-2 py-0.5 bg-green-50 text-green-700 rounded font-medium">{idea.status}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{idea.title}</h3>
                  <p className="text-xs text-slate-600 max-w-2xl">{idea.desc}</p>
                  <p className="text-[11px] text-slate-400">Proposed by: <span className="font-semibold text-slate-700">{idea.author}</span></p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                  <div className="text-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Feasibility</p>
                    <b className="text-amber-600 text-sm">{idea.feasibility}</b>
                  </div>
                  <div className="text-center px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Votes</p>
                    <b className="text-slate-900 text-sm">+{idea.votes}</b>
                  </div>
                  <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition bg-slate-900 text-white hover:bg-slate-800">
                    View Dossier →
                  </button>
                </div>
              </div>
              ))}
          </div>
        </main>
      </div>
    </div>
  )
}