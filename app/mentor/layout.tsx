"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { useEffect, useState } from 'react'

function MentorDashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mentorName, setMentorName] = useState('Faculty Lead')
  const [loading, setLoading] = useState(true)

  const { isDarkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    async function checkMentorAuth() {
      // 1. Cek apakah user sudah login
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // 2. Cek role mentor dari tabel profiles / users di database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'mentor') {
        // Jika bukan mentor, alihkan ke dashboard umum atau halaman utama
        router.push('/dashboard')
        return
      }

      // Set nama mentor dari database jika ada
      if (profile.name) {
        setMentorName(profile.name)
      }
      setLoading(false)
    }

    checkMentorAuth()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Tampilkan loading sebentar saat mengecek autentikasi dan role
  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Verifying faculty access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar Khusus Mentor */}
      <aside className={`hidden lg:flex flex-col w-60 shrink-0 border-r p-4 sticky top-0 h-screen transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#d8c3ad]'}`}>
        
        {/* Bagian Logo dan Judul */}
        <div className="flex items-center gap-3 mb-6">
          <Image
            src="/InnovaSeed-Logo.png"
            alt="InnovaSeed Logo"
            width={40}
            height={40}
            className="rounded-xl object-cover shadow-sm border border-amber-500/30 bg-amber-500/10"
            priority
          />
          <div>
            <b className="text-[15px] block leading-tight">InnovaSeed <span className="text-[#F59E0B]">Evaluator</span></b>
            <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Faculty Portal 2026</p>
          </div>
        </div>

        {/* Menu Navigasi Utama */}
        <nav className="space-y-1 text-sm">
          <Link 
            href="/mentor" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              pathname === '/mentor' 
                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') 
                : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')
            }`}
          >
            <i className="fa-solid fa-chart-line w-4 text-center"></i>Overview Teams
          </Link>

          <Link 
            href="/mentor/evaluation" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              pathname?.includes('/evaluation') 
                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') 
                : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')
            }`}
          >
            <i className="fa-solid fa-clipboard-list w-4 text-center"></i>Grading &amp; Rubrics
          </Link>

          <Link 
            href="/mentor/submissions" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              pathname?.includes('/submissions') 
                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') 
                : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')
            }`}
          >
            <i className="fa-solid fa-folder-tree w-4 text-center"></i>Student Submissions
          </Link>

          {/* Menu Competition Control yang baru ditambahkan */}
          <Link 
            href="/mentor/competition-prep" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              pathname?.includes('/competition-prep') 
                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') 
                : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')
            }`}
          >
            <i className="fa-solid fa-trophy w-4 text-center"></i>Competition Control
          </Link>

          <Link 
            href="/mentor/teams" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              pathname?.includes('/teams') 
                ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') 
                : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')
            }`}>
            <i className="fa-solid fa-users-gear w-4 text-center"></i>Team Management
          </Link>
        </nav>

        {/* Profil Mentor di Bagian Bawah Sidebar */}
        <div className={`mt-auto pt-4 border-t space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'}`}>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold grid place-items-center shrink-0">
              <i className="fa-solid fa-user-tie"></i>
            </span>
            <div className="text-sm leading-tight truncate">
              <b className="truncate block">{mentorName}</b>
              <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Faculty Reviewer</p>
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

      {/* Area Konten Utama */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className={`flex items-center justify-between gap-3 border-b px-6 py-3.5 sticky top-0 z-10 transition-colors ${isDarkMode ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md' : 'bg-white/90 border-[#d8c3ad] backdrop-blur-md'}`}>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            Mentor Evaluation Console
          </span>

          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}
          >
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        <main className="p-6 lg:p-8 max-w-275 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MentorDashboardContent>{children}</MentorDashboardContent>
    </ThemeProvider>
  )
}