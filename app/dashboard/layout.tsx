"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [userName, setUserName] = useState('Innovator')
  const [teamName, setTeamName] = useState('Team GeoPoly')

  useEffect(() => {
    async function getUserData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.user_metadata) {
        const metadata = session.user.user_metadata
        if (metadata?.lead_name) setUserName(metadata.lead_name)
        if (metadata?.team_name) setTeamName(metadata.team_name)
      }
    }
    getUserData()
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Global yang Bersih & Profesional */}
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
          <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${pathname === '/dashboard' ? 'bg-amber-100/60 text-amber-900 font-semibold border-l-[3px] border-amber-500' : 'text-slate-600 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-table-cells-large w-4 text-center"></i>Dashboard
          </Link>
          <Link href="/idea-bank" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${pathname === '/idea-bank' ? 'bg-amber-100/60 text-amber-900 font-semibold border-l-[3px] border-amber-500' : 'text-slate-600 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-lightbulb w-4 text-center"></i>Idea Bank
          </Link>
          <Link href="/workspace" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${pathname === '/workspace' ? 'bg-amber-100/60 text-amber-900 font-semibold border-l-[3px] border-amber-500' : 'text-slate-600 hover:bg-slate-50'}`}>
            <i className="fa-solid fa-folder-open w-4 text-center"></i>Project Workspace
          </Link>
          <Link href="/notes" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${pathname === '/notes' ? 'bg-amber-100/60 text-amber-900 font-semibold border-l-[3px] border-amber-500' : 'text-slate-600 hover:bg-slate-50'}`}>
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
              <b>{userName}</b>
              <p className="text-xs text-slate-500">{teamName} • Lead</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <header className="flex items-center gap-3 bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
          <div className="relative flex-1 max-w-85">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-sm"></i>
            <input className="w-full rounded-lg bg-slate-100 pl-9 pr-12 py-2.5 text-sm outline-none" placeholder="Search tasks, sprint backlog..." />
            <kbd className="absolute right-3 top-2.5 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 text-xs font-bold grid place-items-center">
              {userName.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-275">
          {children}
        </main>
      </div>
    </div>
  )
}