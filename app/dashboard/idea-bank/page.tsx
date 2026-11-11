"use client"

import { useState } from 'react'
import Link from 'next/link'

export default function IdeaBankPage() {
  const [ideas] = useState([
    {
      id: 'IDEA-01',
      title: 'Eco-Friendly Plastic Bricks',
      category: '#circular-economy #materials',
      author: 'Nadia Kusuma',
      votes: 42,
      feasibility: '9.2',
      status: 'Prototype',
      desc: 'Compression-molded recycled HDPE composite for modular urban pavers.'
    },
    {
      id: 'IDEA-02',
      title: 'Low-Cost Rainwater Purifier',
      category: '#water #community',
      author: 'Raka P.',
      votes: 31,
      feasibility: '8.1',
      status: 'Under Validation',
      desc: 'Charcoal and sand filter cartridge for household rainwater harvesting in rural areas.'
    },
    {
      id: 'IDEA-03',
      title: 'Solar-Powered Soil Sensor',
      category: '#iot #agritech',
      author: 'Sari W.',
      votes: 27,
      feasibility: '7.8',
      status: 'Raw Concept',
      desc: 'Self-charging IoT probe tracking moisture and pH for smallholder farms.'
    }
  ])

  const stats = [
    { label: 'Total Ideas', value: '18', sub: '+3 this sprint' },
    { label: 'Under Validation', value: '5', sub: 'Awaiting mentor input' },
    { label: 'Avg. Feasibility Score', value: '7.4/10', sub: 'Mentor-rated' },
    { label: 'Most Voted', value: '42 votes', sub: 'Eco-Bricks Lead' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Idea Bank 💡</h1>
          <p className="text-sm text-slate-500 mt-1">Capture, vote and validate concepts before they become prototypes.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600">
          <i className="fa-solid fa-plus"></i> Capture New Idea
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <b className="text-2xl">{s.value}</b>
            <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-white">All Ideas</button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Raw Concept</button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Under Validation</button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Approved</button>
        <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Prototype</button>
      </div>

      {/* Ideas Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {ideas.map((idea) => (
          <div key={idea.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{idea.id}</span>
                <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium border border-amber-200">{idea.status}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{idea.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{idea.desc}</p>
              <div className="flex flex-wrap gap-1 mt-3 text-[11px] text-amber-700">
                <span>{idea.category}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs">
              <span className="text-slate-500">Proposed by: <b className="text-slate-700">{idea.author}</b></span>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">▲ {idea.votes}</span>
                <span className="font-bold text-amber-600">Score: {idea.feasibility}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}