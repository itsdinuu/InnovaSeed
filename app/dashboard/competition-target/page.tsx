"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type CompetitionItem = {
  id: string
  title: string
  organizer: string
  statusBadge: string
  category: string
  jenjang: string
  level: string
  prestige: string
  scheduleType: string
  feeLabel: string
  notes?: string
  description: string
  keywords: string[]
  officialUrl: string
  deadline: string // format 'YYYY-MM-DD'
}

type CompetitionRow = {
  id: string | number
  title?: string | null
  organizer?: string | null
  status_badge?: string | null
  category?: string | null
  jenjang?: string | null
  level?: string | null
  prestige?: string | null
  schedule_type?: string | null
  registration_fee?: number | string | null
  fee?: number | string | null
  price?: number | string | null
  notes?: string | null
  description?: string | null
  keywords?: string[] | null
  official_url?: string | null
  deadline?: string | null
}

const LS_SAVED_COMPETITIONS = 'innovaseed_saved_competitions_v2'
const PLEGO_MENTORSHIP_URL =
  process.env.NEXT_PUBLIC_PLEGO_MENTORSHIP_URL ||
  'https://lynk.id/plegoindonesia/k829lkgw9g2d'

function buildMentorshipUrl(competitionTitle?: string): string {
  try {
    const url = new URL(PLEGO_MENTORSHIP_URL)
    if (competitionTitle && competitionTitle.trim()) {
      url.searchParams.set('competition', competitionTitle.trim())
    }
    return url.toString()
  } catch {
    return PLEGO_MENTORSHIP_URL
  }
}

function normalizeFee(raw: unknown): string {
  if (raw === null || raw === undefined) return 'Free'
  const val = String(raw).trim()
  if (!val) return 'Free'

  const low = val.toLowerCase()
  if (
    low === 'free' ||
    low === 'gratis' ||
    low === '0' ||
    low === 'rp 0' ||
    low === 'rp0' ||
    low === 'idr 0' ||
    low === '$0'
  ) {
    return 'Free'
  }

  const numericOnly = Number(val.replace(/[^0-9.-]+/g, ''))
  if (!Number.isNaN(numericOnly) && numericOnly === 0) {
    return 'Free'
  }

  if (!Number.isNaN(numericOnly) && numericOnly > 0 && /^[0-9.,]+$/.test(val)) {
    return `Rp ${numericOnly.toLocaleString('id-ID')}`
  }

  return val
}

function LiveDateBadge() {
  const { isDarkMode } = useTheme()
  const [dateText, setDateText] = useState<string>('')

  useEffect(() => {
    const formatted = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    queueMicrotask(() => {
      setDateText(formatted)
    })
  }, [])

  return (
    <div
      className={`px-4 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 shadow-sm ${
        isDarkMode
          ? 'bg-slate-900 border-slate-800 text-amber-400'
          : 'bg-white border-[#d8c3ad] text-[#855300]'
      }`}
    >
      <i className="fa-regular fa-calendar-check text-amber-500"></i>
      <span>Today: {dateText || '...'}</span>
    </div>
  )
}

const FALLBACK_COMPETITIONS: CompetitionItem[] = [
  {
    id: 'comp-1',
    title: 'NYIA (National Young Inventors Award)',
    organizer: 'BRIN',
    statusBadge: 'National Official',
    category: 'Invention / Youth Innovation',
    jenjang: 'Junior & Senior High School',
    level: 'National',
    prestige: 'High',
    scheduleType: 'Annual',
    feeLabel: 'Free',
    notes: 'NOTE: Merged into International Indonesia Young Research & Innovation Fair',
    description:
      'An official state innovation event held annually. Schedules and registrations are announced through official channels.',
    keywords: ['Innovation', 'Science', 'Technology'],
    officialUrl: 'https://brin.go.id',
    deadline: '2026-11-20',
  },
  {
    id: 'comp-2',
    title: 'National Science Fair (NSF) 2026',
    organizer: 'Puspresnas / BPTI Kemendikbud',
    statusBadge: 'Puspresnas',
    category: 'Science & Tech / IoT',
    jenjang: 'Senior High / Vocational School',
    level: 'National',
    prestige: 'Very High',
    scheduleType: 'Annual',
    feeLabel: 'Free',
    description:
      'Prestigious national scientific research competition for secondary students showcasing practical technology innovations.',
    keywords: ['Research', 'IoT', 'Technology'],
    officialUrl: 'https://puspresnas.kemdikbud.go.id',
    deadline: '2026-11-25',
  },
  {
    id: 'comp-3',
    title: 'Indonesian Youth Science Association (IYSA) Expo',
    organizer: 'IYSA Indonesia',
    statusBadge: 'International',
    category: 'Software Engineering & AI',
    jenjang: 'Junior & Senior High School',
    level: 'International',
    prestige: 'High',
    scheduleType: 'Periodic',
    feeLabel: 'Free',
    description:
      'International invention and innovation exhibition bringing together young researchers in science and digital fields.',
    keywords: ['AI', 'Software', 'Innovation'],
    officialUrl: 'https://iysa.or.id',
    deadline: '2026-12-05',
  },
  {
    id: 'comp-4',
    title: 'Invention & Young Innovators Challenge',
    organizer: 'Global Youth Research Network',
    statusBadge: 'Curated Target',
    category: 'AI & Automations',
    jenjang: 'Senior High / Vocational',
    level: 'National & International',
    prestige: 'High',
    scheduleType: 'Annual',
    feeLabel: 'Rp 75.000',
    description:
      'AI and system automation-based research competition focusing on educational solutions and productivity.',
    keywords: ['AI', 'Automation', 'Science'],
    officialUrl: 'https://younginnovators.org',
    deadline: '2026-11-16',
  },
]

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export default function CompetitionTargetPage() {
  const { isDarkMode } = useTheme()

  const [competitions, setCompetitions] = useState<CompetitionItem[]>(FALLBACK_COMPETITIONS)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false)

  const [viewerRole, setViewerRole] = useState<string>('student')
  const [studentName, setStudentName] = useState<string>('Student')
  const [teamName, setTeamName] = useState<string>('')

  const [currentYear, setCurrentYear] = useState<number>(2026)
  const [currentMonth, setCurrentMonth] = useState<number>(10)

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-16')
  const [dateCompetitions, setDateCompetitions] = useState<CompetitionItem[]>([])
  const [activeModalCompetition, setActiveModalCompetition] = useState<CompetitionItem | null>(
    null
  )

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectedKeywordFilter, setSelectedKeywordFilter] = useState<string>('All')

  const notify = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const loadTargetData = useCallback(async () => {
    try {
      const rawSaved = localStorage.getItem(LS_SAVED_COMPETITIONS)
      if (rawSaved) {
        const parsedSaved = JSON.parse(rawSaved) as unknown
        if (Array.isArray(parsedSaved)) {
          setSavedIds(parsedSaved.map((x) => String(x)))
        }
      }
    } catch {
      // Ignore localStorage parse error
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const activeUserId: string | null = session?.user?.id ?? null

    let resolvedRole =
      typeof session?.user?.user_metadata?.role === 'string' &&
      session.user.user_metadata.role.trim()
        ? session.user.user_metadata.role.trim().toLowerCase()
        : 'student'

    let resolvedStudent =
      typeof session?.user?.user_metadata?.full_name === 'string' &&
      session.user.user_metadata.full_name.trim()
        ? session.user.user_metadata.full_name.trim()
        : session?.user?.email
        ? session.user.email.split('@')[0]
        : 'Student'

    let resolvedTeamName = ''

    if (activeUserId) {
      const [{ data: teamsRes }, { data: membersRes }, { data: profilesRes }] =
        await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('team_members').select('*'),
          supabase.from('profiles').select('*'),
        ])

      const profilesList = (Array.isArray(profilesRes) ? profilesRes : []) as Record<
        string,
        unknown
      >[]
      const meProfile = profilesList.find((p) => String(p.id) === activeUserId)
      if (meProfile) {
        if (typeof meProfile.role === 'string' && meProfile.role.trim()) {
          resolvedRole = meProfile.role.trim().toLowerCase()
        }
        const pName =
          typeof meProfile.full_name === 'string' && meProfile.full_name.trim()
            ? meProfile.full_name.trim()
            : typeof meProfile.name === 'string' && meProfile.name.trim()
            ? meProfile.name.trim()
            : ''
        if (pName) resolvedStudent = pName
      }

      const teamsList = (Array.isArray(teamsRes) ? teamsRes : []) as Record<string, unknown>[]
      const membersList = (Array.isArray(membersRes) ? membersRes : []) as Record<
        string,
        unknown
      >[]
      const emailLower = (session?.user?.email || '').trim().toLowerCase()

      if (resolvedRole !== 'mentor') {
        const matchedMember = membersList.find((m) => {
          const mId = String(m.user_id ?? m.student_id ?? m.member_id ?? m.profile_id ?? '')
          const mEmail = typeof m.email === 'string' ? m.email.trim().toLowerCase() : ''
          const mName = typeof m.name === 'string' ? m.name.trim().toLowerCase() : ''
          return (
            (mId && mId === activeUserId) ||
            (emailLower && mEmail && mEmail === emailLower) ||
            (resolvedStudent && mName && mName === resolvedStudent.toLowerCase())
          )
        })

        const matchedTeam =
          (matchedMember?.team_id
            ? teamsList.find((t) => String(t.id) === String(matchedMember.team_id))
            : null) ||
          teamsList.find((t) => {
            const lead = String(t.lead_id ?? t.leader_id ?? t.user_id ?? t.student_id ?? '')
            return lead && lead === activeUserId
          }) ||
          null

        if (matchedTeam) {
          resolvedTeamName = String(
            (typeof matchedTeam.team_name === 'string' && matchedTeam.team_name.trim()) ||
              (typeof matchedTeam.name === 'string' && matchedTeam.name.trim()) ||
              ''
          )
        }
      }
    }

    setViewerRole(resolvedRole)
    setStudentName(resolvedStudent)
    setTeamName(resolvedTeamName)

    const { data, error } = await supabase.from('competitions').select('*')
    let activeList = FALLBACK_COMPETITIONS

    if (!error && Array.isArray(data) && data.length > 0) {
      activeList = data.map((item: CompetitionRow, idx: number) => {
        const rawFee =
          item.registration_fee !== undefined && item.registration_fee !== null
            ? item.registration_fee
            : item.fee ?? item.price

        return {
          id: item.id !== undefined && item.id !== null ? String(item.id) : `comp-${idx}`,
          title: item.title ?? 'Untitled Competition',
          organizer: item.organizer ?? 'Unknown Organizer',
          statusBadge: item.status_badge ?? 'Official',
          category: item.category ?? 'General',
          jenjang: item.jenjang ?? 'All Levels',
          level: item.level ?? 'General',
          prestige: item.prestige ?? 'Standard',
          scheduleType: item.schedule_type ?? 'Annual',
          feeLabel: normalizeFee(rawFee),
          notes: item.notes ?? undefined,
          description: item.description ?? 'No description provided.',
          keywords: Array.isArray(item.keywords) ? item.keywords : [],
          officialUrl: item.official_url ?? '#',
          deadline: item.deadline ?? '',
        }
      })
      setCompetitions(activeList)
    }

    const initialComps = activeList.filter((c) => c.deadline === '2026-11-16')
    setDateCompetitions(initialComps)
    setActiveModalCompetition(initialComps[0] || activeList[0] || null)
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      if (!active) return
      await loadTargetData()
    }
    void init()
    return () => {
      active = false
    }
  }, [loadTargetData])

  const persistSavedIds = (nextIds: string[]) => {
    setSavedIds(nextIds)
    try {
      localStorage.setItem(LS_SAVED_COMPETITIONS, JSON.stringify(nextIds))
    } catch {
      // Ignore localStorage error
    }
  }

  const handleSaveCompetition = (comp: CompetitionItem) => {
    const alreadySaved = savedIds.includes(comp.id)
    const nextIds = alreadySaved ? savedIds : [...savedIds, comp.id]
    persistSavedIds(nextIds)
    setIsSavedDrawerOpen(true)
    notify(
      alreadySaved
        ? `"${comp.title}" is already in your Saved Competitions list.`
        : `Saved "${comp.title}" to your Saved Competitions list.`
    )
  }

  const handleRemoveSaved = (comp: CompetitionItem) => {
    const nextIds = savedIds.filter((id) => id !== comp.id)
    persistSavedIds(nextIds)
    notify(`Removed "${comp.title}" from Saved Competitions.`)
  }

  const handleOpenOfficialSite = (comp: CompetitionItem) => {
    window.open(comp.officialUrl, '_blank', 'noopener,noreferrer')
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const totalDays = getDaysInMonth(currentYear, currentMonth)
  const startDayOffset = getFirstDayOfWeek(currentYear, currentMonth)

  const calendarDays = Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1
    const mNum = currentMonth + 1
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`
    const formattedMonth = mNum < 10 ? `0${mNum}` : `${mNum}`
    return `${currentYear}-${formattedMonth}-${formattedDay}`
  })

  const filteredCompetitions = competitions.filter((comp) => {
    if (selectedKeywordFilter === 'All') return true
    return comp.keywords.includes(selectedKeywordFilter)
  })

  const getCompetitionsForDate = (dateStr: string) => {
    return filteredCompetitions.filter((c) => {
      if (!c.deadline) return false
      const deadlineDate = new Date(c.deadline)
      const startRangeStr = `${deadlineDate.getFullYear()}-${String(
        deadlineDate.getMonth() + 1
      ).padStart(2, '0')}-01`
      return dateStr >= startRangeStr && dateStr <= c.deadline
    })
  }

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    const matchedComps = getCompetitionsForDate(dateStr)
    setDateCompetitions(matchedComps)
    if (matchedComps.length > 0) {
      setActiveModalCompetition(matchedComps[0])
    } else {
      setActiveModalCompetition(null)
    }
  }

  const savedCompetitionsList = competitions.filter((c) => savedIds.includes(c.id))
  const isActiveSaved = activeModalCompetition
    ? savedIds.includes(activeModalCompetition.id)
    : false

  const headerBadgeText =
    viewerRole === 'mentor'
      ? `${studentName} • Mentor View`
      : teamName
      ? `${studentName} • ${teamName}`
      : studentName

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-500">
            <span>
              <i className="fa-solid fa-trophy mr-1"></i> Official Repository &amp; Competition
              Calendar
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] tracking-normal normal-case bg-amber-500/15 text-amber-600 border border-amber-500/30">
              {headerBadgeText}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">
            Competition Target &amp; Calendar
          </h1>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Explore active registration periods, save competitions you are interested in, and
            request PLEGO mentorship from idea to pitching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsSavedDrawerOpen((prev) => !prev)}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold border flex items-center gap-2 shadow-sm transition cursor-pointer ${
              isSavedDrawerOpen
                ? 'bg-amber-500 text-slate-950 border-amber-600'
                : isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fbebdd]'
            }`}
          >
            <i className="fa-solid fa-bookmark text-amber-500"></i>
            <span>Saved Competitions ({savedCompetitionsList.length})</span>
          </button>

          <Suspense
            fallback={
              <div
                className={`px-4 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 shadow-sm ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-amber-400/60'
                    : 'bg-white border-[#d8c3ad] text-[#855300]/60'
                }`}
              >
                <i className="fa-regular fa-calendar-check text-amber-500"></i>
                <span>Today: ...</span>
              </div>
            }
          >
            <LiveDateBadge />
          </Suspense>
        </div>
      </div>

      {/* Animated Saved Competitions Panel */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          isSavedDrawerOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`rounded-2xl border p-5 shadow-md space-y-4 ${
              isDarkMode
                ? 'bg-slate-900/95 border-amber-500/30 text-slate-100'
                : 'bg-[#fffcf9] border-amber-400/70 text-[#221a12]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b pb-3 border-inherit">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-inbox"></i>
                </span>
                <div>
                  <h2 className="text-sm font-extrabold">
                    Saved Competitions ({savedCompetitionsList.length})
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Get mentored by PLEGO from idea to research, prototype, presentation, and
                    pitching.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedDrawerOpen(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'
                }`}
              >
                Close
              </button>
            </div>

            {savedCompetitionsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No saved competitions yet. Select a competition on the calendar and click{' '}
                <b>Save</b> to add it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {savedCompetitionsList.map((savedComp) => {
                  const ctaHref = buildMentorshipUrl(savedComp.title)

                  return (
                    <div
                      key={savedComp.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition ${
                        isDarkMode
                          ? 'bg-slate-800/70 border-slate-700'
                          : 'bg-white border-[#d8c3ad]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold text-amber-500">
                            Deadline: {savedComp.deadline || 'TBD'}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                            Saved
                          </span>
                        </div>
                        <h3 className="text-xs font-extrabold leading-snug">
                          {savedComp.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {savedComp.organizer} • Fee:{' '}
                          <b
                            className={
                              savedComp.feeLabel === 'Free'
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }
                          >
                            {savedComp.feeLabel}
                          </b>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-inherit">
                        <a
                          href={ctaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold bg-amber-500 text-slate-950 hover:bg-amber-400 transition text-center inline-flex items-center justify-center gap-1.5"
                        >
                          <span>Get Mentored for This</span>
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveSaved(savedComp)}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            isDarkMode
                              ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                              : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fff1e5]'
                          }`}
                          title="Remove from saved"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyword Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-400 mr-1">
          <i className="fa-solid fa-filter mr-1"></i> Keyword Filter:
        </span>
        {['All', 'Innovation', 'Science', 'Technology', 'AI', 'Research'].map((kw) => (
          <button
            key={kw}
            type="button"
            onClick={() => setSelectedKeywordFilter(kw)}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              selectedKeywordFilter === kw
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                : isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'
            }`}
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className={`xl:col-span-7 rounded-2xl border p-6 shadow-sm ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex items-center justify-between mb-6 border-b pb-3 border-inherit">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fa-solid fa-calendar-days text-amber-500"></i>{' '}
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'
                }`}
                title="Previous Month"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'
                }`}
                title="Next Month"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
              <div key={idx} className="font-bold text-slate-400 py-1">
                {d}
              </div>
            ))}

            {Array.from({ length: startDayOffset }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square"></div>
            ))}

            {calendarDays.map((dateStr) => {
              const dayNumber = parseInt(dateStr.split('-')[2])
              const dayComps = getCompetitionsForDate(dateStr)
              const hasActiveCompetition = dayComps.length > 0
              const isSelected = selectedDate === dateStr
              const isDeadlineDate = dayComps.some((c) => c.deadline === dateStr)

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDateClick(dateStr)}
                  className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-between transition relative cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-extrabold border-amber-600 shadow-md'
                      : isDeadlineDate
                      ? isDarkMode
                        ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-extrabold'
                        : 'bg-amber-200 border-amber-500 text-amber-900 font-extrabold'
                      : hasActiveCompetition
                      ? isDarkMode
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                        : 'bg-[#FEF3C7] border-amber-300 text-[#855300] font-bold'
                      : isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      : 'bg-[#fff8f4] border-[#d8c3ad]/50 text-[#221a12] hover:bg-[#fbebdd]'
                  }`}
                >
                  <span className="text-xs">{dayNumber}</span>
                  {hasActiveCompetition && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDeadlineDate ? 'bg-amber-600 animate-bounce' : 'bg-amber-500'
                      }`}
                    ></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className={`xl:col-span-5 rounded-2xl border p-6 shadow-sm flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit mb-4">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600">
                <i className="fa-solid fa-award"></i>{' '}
                {activeModalCompetition?.statusBadge || 'Open Registration'}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/30 whitespace-nowrap">
                Open until {activeModalCompetition?.deadline || selectedDate}
              </span>
            </div>

            {dateCompetitions.length > 1 && (
              <div className="mb-4">
                <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                  Active competitions on this date ({dateCompetitions.length}):
                </label>
                <div className="flex flex-col gap-1.5">
                  {dateCompetitions.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => setActiveModalCompetition(comp)}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition border flex items-center justify-between gap-2 cursor-pointer ${
                        activeModalCompetition?.id === comp.id
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-[#fffcf9] border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'
                      }`}
                    >
                      <span className="truncate">{comp.title}</span>
                      <span className="text-[10px] opacity-75 font-normal whitespace-nowrap">
                        ({comp.deadline})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeModalCompetition ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-base leading-snug">
                    {activeModalCompetition.title}
                  </h4>
                  <p className="text-amber-500 font-semibold text-[11px] mt-1">
                    {activeModalCompetition.organizer}
                  </p>
                </div>

                <div
                  className={`rounded-xl border overflow-hidden divide-y ${
                    isDarkMode
                      ? 'border-slate-800 divide-slate-800 bg-slate-950/40'
                      : 'border-[#d8c3ad] divide-[#d8c3ad] bg-[#fffcf9]'
                  }`}
                >
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Registration Status</span>
                    <span className="font-bold text-emerald-500 text-right">
                      🟢 Open Until {activeModalCompetition.deadline}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Registration Fee</span>
                    <span
                      className={`font-extrabold text-right ${
                        activeModalCompetition.feeLabel === 'Free'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {activeModalCompetition.feeLabel}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Category / Field</span>
                    <span className="font-bold text-right">
                      {activeModalCompetition.category}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Education Level</span>
                    <span className="font-bold text-right">{activeModalCompetition.jenjang}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Scope Level</span>
                    <span className="font-bold text-right">{activeModalCompetition.level}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Prestige Rating</span>
                    <span className="font-bold text-right">{activeModalCompetition.prestige}</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-[11px] ${
                    isDarkMode
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-[#FEF3C7] border-amber-300 text-[#855300]'
                  }`}
                >
                  <strong>PLEGO Mentorship Journey:</strong> Guided from idea → research →
                  prototype → presentation → pitching.
                </div>

                <div
                  className={`p-3 rounded-xl border text-[11px] ${
                    isDarkMode
                      ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                      : 'bg-[#fff1e5] border-[#d8c3ad] text-[#534434]'
                  }`}
                >
                  {activeModalCompetition.description}
                </div>

                <div>
                  <span className="font-bold text-[11px] text-slate-400 block mb-1.5">
                    Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModalCompetition.keywords.map((kw) => (
                      <span
                        key={kw}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isDarkMode
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-[#fbebdd] text-[#534434] border border-[#d8c3ad]'
                        }`}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <i className="fa-regular fa-calendar-xmark text-3xl"></i>
                <p className="text-xs">
                  No active competitions for {selectedDate}. Click on a date highlighted in amber
                  to check open registrations!
                </p>
              </div>
            )}
          </div>

          {activeModalCompetition && (
            <div className="pt-4 mt-4 border-t border-inherit space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenOfficialSite(activeModalCompetition)}
                  className="py-2.5 px-3 rounded-xl bg-[#0F172A] text-white font-bold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-1.5 shadow-sm text-center cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Official Site
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCompetition(activeModalCompetition)}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                    isActiveSaved
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-600'
                      : isDarkMode
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fff1e5]'
                  }`}
                >
                  <i className={isActiveSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>{' '}
                  {isActiveSaved ? 'Saved' : 'Save'}
                </button>
              </div>

              <a
                href={buildMentorshipUrl(activeModalCompetition.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Get Mentored for This Competition</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}