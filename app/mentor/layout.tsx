"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

function isUuidLike(val?: string | null) {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

function MentorDashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mentorName, setMentorName] = useState('Faculty Lead')
  const [mentorCode, setMentorCode] = useState<string | null>(null)
  const [mentorRoleBadge, setMentorRoleBadge] = useState('Faculty Reviewer')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { isDarkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    let isMounted = true

    async function getMentorProfile() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          if (isMounted) router.replace('/login')
          return
        }

        const user = session.user

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Supabase profile fetch error:', profileError.message)
        }

        const prof = (profileData || {}) as Record<string, unknown>

        const resolvedName =
          (typeof prof.full_name === 'string' && prof.full_name.trim()) ||
          (typeof prof.name === 'string' && prof.name.trim()) ||
          (typeof user.user_metadata?.full_name === 'string' &&
            user.user_metadata.full_name.trim()) ||
          (typeof user.email === 'string' ? user.email.split('@')[0] : 'Faculty Mentor')

        const rawCode = typeof prof.mentor_code === 'string' ? prof.mentor_code.trim() : ''
        const resolvedCode =
          rawCode && !isUuidLike(rawCode)
            ? rawCode.toUpperCase()
            : `MTR-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

        if (!isMounted) return

        setMentorName(resolvedName)
        setMentorCode(resolvedCode)

        const dbRole =
          (typeof prof.role === 'string' ? prof.role.toLowerCase() : '') ||
          (typeof user.user_metadata?.role === 'string'
            ? user.user_metadata.role.toLowerCase()
            : 'mentor')

        if (dbRole === 'student') {
          router.replace('/dashboard/student')
          return
        }

        setMentorRoleBadge('Faculty Reviewer')
      } catch (err) {
        console.error('Exception during profile load:', err)
      }
    }

    void getMentorProfile()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const userId = session.user.id
        sessionStorage.removeItem(`active_profile_${userId}`)
        sessionStorage.removeItem(`active_member_name_${userId}`)
        sessionStorage.removeItem(`skip_profile_modal_${userId}`)
      }

      await supabase.auth.signOut()
      router.replace('/login')
    } catch (err) {
      console.error('Error signing out:', err)
      setIsSigningOut(false)
    }
  }

  const navItems = [
    { href: '/mentor', label: 'Overview Teams', icon: 'fa-chart-line', exact: true },
    { href: '/mentor/evaluation', label: 'Grading & Rubrics', icon: 'fa-clipboard-list' },
    { href: '/mentor/submissions', label: 'Student Submissions', icon: 'fa-folder-tree' },
    { href: '/mentor/competition-prep', label: 'Competition Control', icon: 'fa-trophy' },
    { href: '/mentor/teams', label: 'Team Management', icon: 'fa-users-gear' },
  ]

  const isActiveLink = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return Boolean(pathname?.startsWith(href))
  }

  return (
    <div
      className={`flex min-h-screen transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body,
        button,
        input,
        select,
        textarea {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
      `}</style>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <aside
            className={`relative z-50 flex flex-col w-64 max-w-[80vw] border-r p-4 h-full overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-[#d8c3ad]'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/InnovaSeed-Logo.png"
                  alt="InnovaSeed Logo"
                  width={36}
                  height={36}
                  className="rounded-xl object-cover shadow-xs border border-amber-500/30 bg-amber-500/10"
                />
                <div>
                  <b className="text-sm">
                    InnovaSeed <span className="text-[#F59E0B]">Evaluator</span>
                  </b>
                  <p className="text-[10px] text-slate-400">Faculty Portal 2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-500"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <nav className="space-y-1 text-sm">
              {navItems.map((item) => {
                const active = isActiveLink(item.href, item.exact)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                      active
                        ? isDarkMode
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
                          : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
                        : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-[#534434] hover:bg-[#fff1e5]'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-4 text-center`}></i>
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div
              className={`mt-auto pt-4 border-t space-y-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
                  {mentorName.substring(0, 2).toUpperCase()}
                </span>
                <div className="text-xs leading-tight truncate">
                  <b className="truncate block">{mentorName}</b>
                  <p className="text-[10px] text-amber-600">{mentorCode || mentorRoleBadge}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
              >
                <i
                  className={`fa-solid ${
                    isSigningOut ? 'fa-spinner fa-spin' : 'fa-right-from-bracket'
                  } w-4 text-center`}
                ></i>
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Global Sidebar Khusus Mentor (Desktop) */}
      <aside
        className={`hidden lg:flex flex-col w-64 shrink-0 border-r p-4 sticky top-0 h-screen transition-colors overflow-y-auto ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#d8c3ad]'
        }`}
      >
        <div className="flex items-center gap-3 mb-5">
          <Image
            src="/InnovaSeed-Logo.png"
            alt="InnovaSeed Logo"
            width={40}
            height={40}
            className="rounded-xl object-cover shadow-xs border border-amber-500/30 bg-amber-500/10"
            priority
          />
          <div>
            <b className="text-[15px]">
              InnovaSeed <span className="text-[#F59E0B]">Evaluator</span>
            </b>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Faculty Portal 2026
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[10px]">
              <i className="fa-solid fa-chalkboard-user"></i> Faculty Console
            </span>
          </div>
          {mentorCode && (
            <div className="mt-2 font-mono font-bold text-[11px] text-amber-800">
              Code: {mentorCode}
            </div>
          )}
        </div>

        <nav className="space-y-1 text-sm">
          {navItems.map((item) => {
            const active = isActiveLink(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  active
                    ? isDarkMode
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]'
                      : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]'
                    : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-[#534434] hover:bg-[#fff1e5]'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center`}></i>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div
          className={`mt-auto pt-4 border-t space-y-3 ${
            isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center gap-3 pt-1">
            <span className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
              {mentorName.substring(0, 2).toUpperCase()}
            </span>
            <div className="text-sm leading-tight truncate">
              <b className="truncate block">{mentorName}</b>
              <p className="text-[11px] truncate font-medium text-amber-600">
                {mentorRoleBadge}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
          >
            <i
              className={`fa-solid ${
                isSigningOut ? 'fa-spinner fa-spin' : 'fa-right-from-bracket'
              } w-4 text-center`}
            ></i>
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3.5 sticky top-0 z-10 transition-colors ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md'
              : 'bg-white/90 border-[#d8c3ad] backdrop-blur-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className={`lg:hidden p-2 rounded-xl border text-xs ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white border-[#d8c3ad] text-[#221a12]'
              }`}
            >
              <i className="fa-solid fa-bars"></i>
            </button>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Mentor Evaluation Console
            </span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#613b00] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              Faculty Mode Active
            </span>

            <button
              type="button"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
              }`}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              <span className="hidden xl:inline text-[11px]">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-275 flex-1">{children}</main>
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