"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('Bima')
  const [teamName, setTeamName] = useState('Team AIBot')
  const [competitionTrack, setCompetitionTrack] = useState('National Science Fair Track')
  const [unreadCount, setUnreadCount] = useState(0)

  // State untuk Modal Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [formTeamName, setFormTeamName] = useState('Team AIBot')
  const [formLeadName, setFormLeadName] = useState('Bima')
  const [formTrack, setFormTrack] = useState('National Science Fair Track')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const { isDarkMode, toggleDarkMode } = useTheme()

  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from('mentor_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (!error && count !== null) {
      setUnreadCount(count)
    }
  }

  useEffect(() => {
    async function getDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.user_metadata) {
        const metadata = session.user.user_metadata
        if (metadata?.lead_name) {
          setUserName(metadata.lead_name)
          setFormLeadName(metadata.lead_name)
        }
        if (metadata?.team_name) {
  
          setTeamName(metadata.team_name)
          setFormTeamName(metadata.team_name)
        }
        if (metadata?.competition_track) {
          setCompetitionTrack(metadata.competition_track)
          setFormTrack(metadata.competition_track)
        }
      }

      fetchUnreadCount()
    }

    getDashboardData()

    // --- FITUR SUPABASE REALTIME (WEBBSOCKET) ---
    // Mendengarkan perubahan data pada tabel mentor_feedback secara real-time
    const channel = supabase
      .channel('realtime-mentor-feedback')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_feedback' },
        (payload) => {
          console.log('Realtime change detected:', payload)
          fetchUnreadCount() // Otomatis hitung ulang jumlah pesan unread saat ada insert/update
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamName(formTeamName)
    setUserName(formLeadName)
    setCompetitionTrack(formTrack)

    await supabase.auth.updateUser({
      data: {
        lead_name: formLeadName,
        team_name: formTeamName,
        competition_track: formTrack
      }
    })

    setIsSettingsOpen(false)
    setToastMessage("Settings updated successfully!")
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body, button, input, select, textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Sidebar Global */}
      <aside className={`hidden lg:flex flex-col w-60 shrink-0 border-r p-4 sticky top-0 h-screen transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="flex items-center gap-3 mb-5">
          <Image
            src="/InnovaSeed-Logo.png"
            alt="InnovaSeed Logo"
            width={40}
            height={40}
            className="rounded-xl object-cover shadow-sm border border-amber-500/30 bg-amber-500/10"
            priority
          />
          <div>
            <b className="text-[15px]">InnovaSeed <span className="text-[#F59E0B]">v2</span></b>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Young Innovator Hub 2026</p>
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
          <Link href="/dashboard/competition-prep" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname?.includes('/competition-prep') ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
            <i className="fa-solid fa-clipboard-check w-4 text-center"></i>Competition Prep
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
          <Link href="/dashboard/portfolio" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname?.includes('/portfolio') ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
             <i className="fa-solid fa-folder-closed w-4 text-center"></i>Portfolio Showcase
          </Link>
        </nav>

        {/* Bagian Bawah: Tombol Settings & Profil User */}
        <div className={`mt-auto pt-4 border-t space-y-2 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'}`}>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]'}`}
          >
            <i className="fa-solid fa-gear w-4 text-center text-amber-500"></i>Settings &amp; Profile
          </button>

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
        <header className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3.5 sticky top-0 z-10 transition-colors ${isDarkMode ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md' : 'bg-white/90 border-[#d8c3ad] backdrop-blur-md'}`}>
          <div className="relative flex-1 min-w-55 max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
            <input 
              className={`w-full rounded-xl pl-9 pr-12 py-2 text-xs outline-none transition border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-[#F59E0B]' : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-[#F59E0B]'}`} 
              placeholder="Search ideas, prototype logs, guidelines..." 
            />
            <kbd className={`absolute right-2.5 top-2 text-[9px] border rounded px-1.5 py-0.5 ${isDarkMode ? 'border-slate-700 text-slate-400 bg-slate-900' : 'border-[#d8c3ad] text-[#534434] bg-white'}`}>⌘K</kbd>
          </div>

          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#613b00]'}`}>
            <span className="w-5 h-5 rounded-md bg-[#F59E0B] text-white grid place-items-center text-[10px]">
              <i className="fa-solid fa-star"></i>
            </span>
            <span className="truncate max-w-60">{teamName} &bull; {competitionTrack}</span>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-60 ml-1"></i>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#613b00] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              Sprint Active
            </span>

            <button 
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'}`}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              <span className="hidden xl:inline text-[11px]">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-275 flex-1">
          {children}
        </main>
      </div>

      {/* Modal Settings */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-gear text-amber-500"></i> Dashboard Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Team Name</label>
                <input 
                  type="text" 
                  value={formTeamName}
                  onChange={(e) => setFormTeamName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lead Author Name</label>
                <input 
                  type="text" 
                  value={formLeadName}
                  onChange={(e) => setFormLeadName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Competition Track</label>
                <select 
                  value={formTrack}
                  onChange={(e) => setFormTrack(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                >
                  <option value="National Science Fair Track">National Science Fair Track</option>
                  <option value="Young Innovator Hub 2025">Young Innovator Hub 2025</option>
                  <option value="AI & Software Engineering Track">AI & Software Engineering Track</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  )
}