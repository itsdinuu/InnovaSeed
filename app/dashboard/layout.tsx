"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

type TeamRealtimePayload = {
  new?: {
    team_name?: string
    lead_name?: string
    members?: string[]
    mentor_code?: string
  }
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('Innovator')
  const [userRoleBadge, setUserRoleBadge] = useState('Team Leader')
  const [teamName, setTeamName] = useState('Independent Innovator')
  const [competitionTrack, setCompetitionTrack] = useState('National Science Fair Track')
  const [unreadCount, setUnreadCount] = useState(0)

  // State for Competition Dropdown Menu in Sidebar
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(pathname?.includes('/competition') ?? true)

  // State for Settings & Team Management Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [formTeamName, setFormTeamName] = useState('Independent Innovator')
  const [formLeadName, setFormLeadName] = useState('Innovator')
  const [formTrack, setFormTrack] = useState('National Science Fair Track')
  const [formMentorCode, setFormMentorCode] = useState('')
  
  // Team members state
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [teamRecordId, setTeamRecordId] = useState<number | null>(null)

  // Hover Popup State for Team Info
  const [isTeamHovered, setIsTeamHovered] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const { isDarkMode, toggleDarkMode } = useTheme()
  const isJudgeArea = pathname?.startsWith('/dashboard/judges') ?? false

  const fetchUnreadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('mentor_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (!error && count !== null) {
      setUnreadCount(count)
    }
  }, [])

  useEffect(() => {
    async function getDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const user = session.user

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name, name')
        .or(`id.eq.${user.id},uuid.eq.${user.id}`)
        .maybeSingle()

      if (profileData?.role && !['student', 'judge'].includes(profileData.role)) {
        router.push(profileData.role === 'mentor' ? '/mentor' : '/dashboard')
        return
      }

      const isJudgeRole = profileData?.role === 'judge' || pathname?.startsWith('/dashboard/judges')
      if (isJudgeRole) {
        setUserName(profileData?.full_name || profileData?.name || user.user_metadata?.full_name || 'Evaluator')
        setUserRoleBadge('Grand Jury Panel')
        setTeamName('Grand Jury Panel')
        setCompetitionTrack('Final Judging Panel')
        fetchUnreadCount()
        return
      }

      // Fetch team data from `teams` table based on user_id (lead_id)
      const { data: teamData, error } = await supabase
        .from('teams')
        .select('*')
        .eq('lead_id', user.id)
        .maybeSingle()

      if (!error && teamData) {
        setTeamRecordId(teamData.id)
        setTeamName(teamData.team_name || 'Independent Innovator')
        setFormTeamName(teamData.team_name || 'Independent Innovator')
        setFormLeadName(teamData.lead_name || user.user_metadata?.full_name || 'Innovator')
        if (teamData.mentor_code) {
          setFormMentorCode(teamData.mentor_code)
        }

        // Cek profil aktif dari localStorage / sessionStorage (sinkron dengan pop-up dashboard)
        const activeProfileId = sessionStorage.getItem(`active_profile_${user.id}`) || localStorage.getItem('active_member_id')
        const activeProfileName = localStorage.getItem('active_profile_name')

        if (activeProfileId) {
          const { data: memberRecord } = await supabase
            .from('team_members')
            .select('*')
            .eq('id', activeProfileId)
            .maybeSingle()

          if (memberRecord) {
            setUserName(memberRecord.name)
            // Tampilkan role dari database secara akurat (misal Developer / Researcher / Team Leader)
            setUserRoleBadge(memberRecord.role || 'Team Member')
          } else if (activeProfileName) {
            setUserName(activeProfileName)
            setUserRoleBadge(activeProfileName === teamData.lead_name ? 'Team Leader' : 'Team Member')
          }
        } else if (activeProfileName) {
          setUserName(activeProfileName)
          setUserRoleBadge(activeProfileName === teamData.lead_name ? 'Team Leader' : 'Team Member')
        } else {
          const leadName = teamData.lead_name || user.user_metadata?.full_name || 'Innovator'
          setUserName(leadName)
          setUserRoleBadge('Team Leader')
        }

        // Fetch team members list from `team_members` table
        const { data: membersList } = await supabase
          .from('team_members')
          .select('name')
          .eq('team_id', teamData.id)

        if (membersList) {
          setTeamMembers(membersList.map(m => m.name))
        }
      } else {
        const activeProfileName = localStorage.getItem('active_profile_name')
        const defaultName = activeProfileName || user.user_metadata?.full_name || 'Innovator'
        setUserName(defaultName)
        setUserRoleBadge('Team Leader')
        setTeamName('Independent Innovator')
      }

      fetchUnreadCount()
    }

    getDashboardData()

    const realtimeChannel = supabase
      .channel('realtime-dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload: TeamRealtimePayload) => {
          if (payload.new) {
            setTeamName((currentTeamName) => payload.new?.team_name ?? currentTeamName)
            if (payload.new?.mentor_code !== undefined) {
              setFormMentorCode(payload.new.mentor_code)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_feedback' },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [fetchUnreadCount, pathname, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamName(formTeamName)
    setUserName(formLeadName)
    setCompetitionTrack(formTrack)

    if (teamRecordId) {
      await supabase
        .from('teams')
        .update({
          team_name: formTeamName,
          lead_name: formLeadName,
          cohort_batch: formTrack,
          mentor_code: formMentorCode
        })
        .eq('id', teamRecordId)
    }

    setIsSettingsOpen(false)
    setToastMessage("Team settings & mentor code synced successfully!")
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fff8f4] text-[#221a12]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body, button, input, select, textarea { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Global Sidebar */}
      <aside className={`hidden lg:flex flex-col w-64 shrink-0 border-r p-4 sticky top-0 h-screen transition-colors overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-[#d8c3ad]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              {isJudgeArea ? 'Grand Jury Console' : 'Young Innovator Hub 2026'}
            </p>
          </div>
        </div>

        {isJudgeArea ? (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
            <div className="flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-[10px]">
              <i className="fa-solid fa-scale-balanced"></i> Evaluator Access
            </div>
            <div className="mt-2 font-semibold">Panel #4 • Final Judging</div>
          </div>
        ) : (
          <Link href="/dashboard/idea-bank" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] w-full mb-5 shadow-sm">
            + New Innovation
          </Link>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-1 text-sm font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {isJudgeArea ? (
            <>
              <Link href="/dashboard/judges/queue" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname === '/dashboard/judges/queue' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
                <i className="fa-solid fa-clipboard-list w-4 text-center"></i>Assigned Evaluation Queue
              </Link>
              <Link href="/dashboard/judges/rubrics" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname === '/dashboard/judges/rubrics' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
                <i className="fa-solid fa-file-lines w-4 text-center"></i>Scoring Rubrics &amp; Guidelines
              </Link>
              <Link href="/dashboard/judges/completed" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname === '/dashboard/judges/completed' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
                <i className="fa-solid fa-check-double w-4 text-center"></i>Completed Evaluations
              </Link>
              <Link href="/dashboard/judges/leaderboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname === '/dashboard/judges/leaderboard' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
                <i className="fa-solid fa-ranking-star w-4 text-center"></i>Grand Finalist Leaderboard
              </Link>
              <Link href="/dashboard/judges/profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${pathname === '/dashboard/judges/profile' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]') : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')}`}>
                <i className="fa-solid fa-user-shield w-4 text-center"></i>Evaluator Profile &amp; Credentials
              </Link>
            </>
          ) : (
            <>
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

              {/* Nested Dropdown Menu: Competition */}
              <div>
                <button
                  onClick={() => setIsCompetitionOpen(!isCompetitionOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    pathname?.includes('/competition')
                      ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-semibold border-l-[3px] border-[#F59E0B]' : 'bg-[#FEF3C7] text-[#855300] font-semibold border-l-[3px] border-[#F59E0B]')
                      : (isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]')
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <i className="fa-solid fa-trophy w-4 text-center"></i> Competition
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isCompetitionOpen ? "rotate-180" : ""}`}></i>
                </button>

                {isCompetitionOpen && (
                  <div className="ml-4 mt-1 pl-3 border-l border-slate-700/60 space-y-1">
                    <Link
                      href="/dashboard/competition-target"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        pathname?.includes('/competition-target')
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-[#FEF3C7] text-[#855300] font-bold')
                          : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-[#534434] hover:bg-[#fff1e5]')
                      }`}
                    >
                      <i className="fa-solid fa-circle-dot w-4 text-center text-[10px]"></i> Competition Target
                    </Link>
                    <Link
                      href="/dashboard/competition-prep"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        pathname?.includes('/competition-prep')
                          ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-[#FEF3C7] text-[#855300] font-bold')
                          : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-[#534434] hover:bg-[#fff1e5]')
                      }`}
                    >
                      <i className="fa-solid fa-circle-check w-4 text-center text-[10px]"></i> Competition Prep
                    </Link>
                  </div>
                )}
              </div>

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
            </>
          )}
        </nav>

        {/* Bottom Section: Team Info & User Profile */}
        <div className={`mt-auto pt-4 border-t space-y-2.5 relative ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'}`}>
          {isJudgeArea ? (
            <>
              <div className={`rounded-2xl border p-3 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-[#fff1e5] border-[#d8c3ad]'}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-sm font-extrabold text-[#0F172A]">
                    {userName.substring(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{userName}</div>
                    <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                      Grand Jury Panel #4
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {isTeamHovered && (
                <div className={`absolute bottom-full left-0 right-0 mb-2 p-3 rounded-2xl border shadow-xl transition-all duration-300 transform translate-y-0 opacity-100 z-30 space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/50' : 'bg-white border-[#d8c3ad] text-[#221a12] shadow-amber-900/10'}`}>
                  <div className="flex items-center justify-between text-[11px] font-bold border-b pb-1.5 border-inherit">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-users text-amber-500"></i> Team Roster
                    </span>
                    <span className="text-amber-500 text-[10px]">
                      {formMentorCode ? `Code: ${formMentorCode}` : 'No Mentor Code'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2 truncate">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="font-semibold truncate">{userName}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">{userRoleBadge}</span>
                    </div>

                    {teamMembers.map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-2 truncate">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="truncate text-slate-400 dark:text-slate-300">{member}</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-medium">Synced</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div 
                onMouseEnter={() => setIsTeamHovered(true)}
                onMouseLeave={() => setIsTeamHovered(false)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800' : 'bg-[#fff1e5]/70 border-[#d8c3ad]/60 hover:bg-[#fbebdd]'}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-2 shrink-0 overflow-hidden">
                    <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-slate-950 font-bold text-[9px] grid place-items-center border-2 border-white dark:border-slate-900">
                      {userName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 text-xs leading-tight">
                    <b className="block truncate text-[11px]">{teamName}</b>
                    <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                      Code: {formMentorCode ? formMentorCode : 'Unlinked'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                  Live
                </span>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#534434] hover:bg-[#fff1e5]'}`}
              >
                <i className="fa-solid fa-gear w-4 text-center text-amber-500"></i>Settings &amp; Mentor Code
              </button>

              {/* Displaying Active Profile (Name & Role synced from modal/localStorage) */}
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#855300] text-xs font-bold grid place-items-center shrink-0">
                  {userName.substring(0, 2).toUpperCase()}
                </span>
                <div className="text-sm leading-tight truncate">
                  <b className="truncate block">{userName}</b>
                  <p className={`text-[11px] truncate font-medium text-amber-600`}>{userRoleBadge}</p>
                </div>
              </div>
            </>
          )}

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
              <i className={`fa-solid ${isJudgeArea ? 'fa-scale-balanced' : 'fa-star'}`}></i>
            </span>
            <span className="truncate max-w-60">
              {isJudgeArea ? 'Grand Jury Panel • Final Evaluator' : `${teamName} • ${competitionTrack}`}
            </span>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-60 ml-1"></i>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#613b00] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              {isJudgeArea ? 'Judging Active' : 'Sprint Active'}
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

      {/* Settings & Mentor Code Modal */}
      {isSettingsOpen && !isJudgeArea && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-gear text-amber-500"></i> Settings &amp; Mentor Code
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Team Name</label>
                <input 
                  type="text" 
                  value={formTeamName}
                  onChange={(e) => setFormTeamName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Lead Author Name</label>
                <input 
                  type="text" 
                  value={formLeadName}
                  onChange={(e) => setFormLeadName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-amber-500">Mentor Invite Code (e.g. MAYA-2026)</label>
                <input 
                  type="text"
                  placeholder="Enter mentor code..."
                  value={formMentorCode}
                  onChange={(e) => setFormMentorCode(e.target.value.toUpperCase())}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-800 border-amber-500/50 text-white' : 'bg-[#fff8f4] border-amber-500/50 text-[#221a12]'}`}
                />
                <p className="text-[10px] text-slate-400 mt-1">Enter the code provided by your faculty/mentor to sync your team under their supervision list.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Competition Track</label>
                <select 
                  value={formTrack}
                  onChange={(e) => setFormTrack(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 outline-none border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#fff8f4] border-[#d8c3ad]'}`}
                >
                  <option value="National Science Fair Track">National Science Fair Track</option>
                  <option value="Young Innovator Hub 2026">Young Innovator Hub 2026</option>
                  <option value="AI & Software Engineering Track">AI & Software Engineering Track</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-inherit">
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