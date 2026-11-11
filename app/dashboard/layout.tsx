"Author: Desti Andhini"
"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('Desti A.')
  const [teamName, setTeamName] = useState('Team GeoPoly')
  const [unreadCount, setUnreadCount] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    async function getDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.user_metadata) {
        const metadata = session.user.user_metadata
        if (metadata?.lead_name) setUserName(metadata.lead_name)
        if (metadata?.team_name) setTeamName(metadata.team_name)
      }

      const { count, error } = await supabase
        .from('mentor_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    getDashboardData()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Import Google Fonts Plus Jakarta Sans & Inter */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        body, button, input, select, textarea {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      {/* Sidebar Global */}
      <aside className={`hidden lg:flex flex-col w-60 shrink-0 border-r p-4 sticky top-0 h-screen transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white grid place-items-center shadow-sm">
            <i className="fa-solid fa-seedling"></i>
          </span>
          <div>
            <b className="text-[15px]">InnovaSeed <span className="text-[#F59E0B]">v2</span></b>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Young Innovator Hub 2025</p>
          </div>
        </div>
        
        <Link href="/dashboard/student" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] w-full mb-5 shadow-sm">
          + New Innovation
        </Link>

        {/* Menu Navigasi */}
        <nav className="space-y-1 text-sm">
          <Link href="/dashboard/student" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname === '/dashboard/student' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
            <i className="fa-solid fa-table-cells-large w-4 text-center"></i>Dashboard
          </Link>
          <Link href="/dashboard/idea-bank" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname?.includes('/idea-bank') ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
            <i className="fa-solid fa-lightbulb w-4 text-center"></i>Idea Bank
          </Link>
          <Link href="/dashboard/workspace" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname?.includes('/workspace') ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
            <i className="fa-solid fa-folder-open w-4 text-center"></i>Project Workspace
          </Link>
          <Link href="/dashboard/notes" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname?.includes('/notes') ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
            <i className="fa-solid fa-pen-to-square w-4 text-center"></i>Prototype Notes
          </Link>
          <Link href="/dashboard/mentor-feedback" className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition ${pathname?.includes('/mentor-feedback') ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-comments w-4 text-center"></i>
              <span>Mentor Feedback</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-[#F59E0B] text-[#0F172A] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                {unreadCount} New
              </span>
            )}
          </Link>
        </nav>

        {/* Bagian Bawah: Profil User & Tombol Sign Out */}
        <div className={`mt-auto pt-4 border-t space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'}`}>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </span>
            <div className="text-sm leading-tight truncate">
              <b className="truncate block">{userName}</b>
              <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{teamName} Lead</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            <i className="fa-solid fa-right-from-bracket w-4 text-center"></i>Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Main Content Header */}
        <header className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3.5 sticky top-0 z-10 transition-colors ${isDarkMode ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md' : 'bg-white/90 border-[#d8c3ad] backdrop-blur-md'}`}>
          
          {/* 1. Search Bar */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
            <input 
              className={`w-full rounded-xl pl-9 pr-12 py-2 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-[#F59E0B]' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-[#F59E0B]'}`} 
              placeholder="Search ideas, prototype logs, guidelines..." 
            />
            <kbd className={`absolute right-2.5 top-2 text-[9px] border rounded px-1.5 py-0.5 font-inter ${isDarkMode ? 'border-slate-700 text-slate-400 bg-slate-900' : 'border-[#d8c3ad] text-[#534434] bg-white'}`}>⌘K</kbd>
          </div>

          {/* 2. Nama Tim / Track Dropdown */}
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#613b00]'}`}>
            <span className="w-5 h-5 rounded-md bg-[#F59E0B] text-white grid place-items-center text-[10px]">
              <i className="fa-solid fa-star"></i>
            </span>
            <span className="truncate max-w-[240px]">{teamName} • National Science Fair Track</span>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-60 ml-1"></i>
          </div>

          {/* 3. Kanan Header: Sprint Active, Notifikasi, & Tombol Switch Mode */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Sprint Active Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#613b00] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              Sprint Active
            </span>

            {/* Tombol Switch Mode */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'}`}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              <span className="hidden xl:inline text-[11px]">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* Tombol Notifikasi */}
            <button 
              onClick={() => alert('Live notification panel checked.')}
              className={`relative p-2 rounded-xl border transition cursor-pointer shadow-2xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#534434] hover:bg-[#fff1e5]'}`}
              title="Notifications"
            >
              <i className="fa-regular fa-bell text-sm"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center animate-pulse font-inter">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

        </header>

        <main className="p-6 lg:p-8 max-w-275 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}