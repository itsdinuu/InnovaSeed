"use client"

import { useState, useEffect } from 'react'
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
  notes?: string
  description: string
  keywords: string[]
  officialUrl: string
  deadline: string // format 'YYYY-MM-DD'
}

type CompetitionRow = {
  id: string
  title: string
  organizer: string
  status_badge?: string | null
  category?: string | null
  jenjang?: string | null
  level?: string | null
  prestige?: string | null
  schedule_type?: string | null
  notes?: string | null
  description?: string | null
  keywords?: string[] | null
  official_url?: string | null
  deadline?: string | null
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
    notes: 'NOTE: Merged into International Indonesia Young Research & Innovation Fair',
    description: 'An official state innovation event held annually. Schedules and registrations are announced through official channels.',
    keywords: ['Innovation', 'Science', 'Technology'],
    officialUrl: 'https://brin.go.id',
    deadline: '2026-11-20'
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
    description: 'Prestigious national scientific research competition for secondary students showcasing practical technology innovations.',
    keywords: ['Research', 'IoT', 'Technology'],
    officialUrl: 'https://puspresnas.kemdikbud.go.id',
    deadline: '2026-11-25'
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
    description: 'International invention and innovation exhibition bringing together young researchers in science and digital fields.',
    keywords: ['AI', 'Software', 'Innovation'],
    officialUrl: 'https://iysa.or.id',
    deadline: '2026-12-05'
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
    description: 'AI and system automation-based research competition focusing on educational solutions and productivity.',
    keywords: ['AI', 'Automation', 'Science'],
    officialUrl: 'https://younginnovators.org',
    deadline: '2026-11-16'
  }
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CompetitionTargetPage() {
  const { isDarkMode } = useTheme()

  const [competitions, setCompetitions] = useState<CompetitionItem[]>(FALLBACK_COMPETITIONS)
  
  // State untuk navigasi bulan & tahun aktif (Default: November 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026)
  const [currentMonth, setCurrentMonth] = useState<number>(10) // 10 = November (0-indexed)
  
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-16')
  const [activeModalCompetition, setActiveModalCompetition] = useState<CompetitionItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectedKeywordFilter, setSelectedKeywordFilter] = useState<string>('All')

  // Fetch competitions from Supabase
  useEffect(() => {
    async function fetchCompetitionsFromSupabase() {
      const { data, error } = await supabase.from('competitions').select('*')
      if (!error && data && data.length > 0) {
        const mapped: CompetitionItem[] = data.map((item: CompetitionRow) => ({
          id: item.id,
          title: item.title ?? 'Untitled Competition',
          organizer: item.organizer ?? 'Unknown Organizer',
          statusBadge: item.status_badge ?? 'Official',
          category: item.category ?? 'General',
          jenjang: item.jenjang ?? 'All Levels',
          level: item.level ?? 'General',
          prestige: item.prestige ?? 'Standard',
          scheduleType: item.schedule_type ?? 'Annual',
          notes: item.notes ?? undefined,
          description: item.description ?? 'No description provided.',
          keywords: item.keywords ?? [],
          officialUrl: item.official_url ?? '#',
          deadline: item.deadline ?? ''
        }))
        setCompetitions(mapped)
        setActiveModalCompetition(mapped[3] || mapped[0])
      } else {
        setActiveModalCompetition(FALLBACK_COMPETITIONS[3])
      }
    }
    fetchCompetitionsFromSupabase()
  }, [])

  // Handler navigasi bulan sebelumnya
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  // Handler navigasi bulan berikutnya
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Kalkulasi hari dalam bulan dan tahun aktif
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const totalDays = getDaysInMonth(currentYear, currentMonth)
  const startDayOffset = getFirstDayOfWeek(currentYear, currentMonth)

  // Array hari dalam bulan aktif
  const calendarDays = Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1
    const mNum = currentMonth + 1
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`
    const formattedMonth = mNum < 10 ? `0${mNum}` : `${mNum}`
    return `${currentYear}-${formattedMonth}-${formattedDay}`
  })

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    const found = competitions.find(c => c.deadline === dateStr)
    if (found) {
      setActiveModalCompetition(found)
    } else {
      setActiveModalCompetition(null)
    }
  }

  const handleSaveCompetition = async (comp: CompetitionItem) => {
    setToastMessage(`Successfully saved "${comp.title}" to your Preparation Target!`)
    setTimeout(() => setToastMessage(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-500">
          <i className="fa-solid fa-trophy"></i> Official Repository &amp; Competition Calendar
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">Competition Target &amp; Calendar</h1>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Switch months on the calendar to explore official competition deadlines from Supabase, and sync them to your preparation goals.
        </p>
      </div>

      {/* Keyword Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-400 mr-1"><i className="fa-solid fa-filter mr-1"></i> Keyword Filter:</span>
        {['All', 'Innovation', 'Science', 'Technology', 'AI', 'Research'].map((kw) => (
          <button
            key={kw}
            onClick={() => setSelectedKeywordFilter(kw)}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border ${
              selectedKeywordFilter === kw
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]')
            }`}
          >
            {kw}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Calendar with Month Switcher */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          
          {/* Calendar Header with Navigation Controls */}
          <div className="flex items-center justify-between mb-6 border-b pb-3 border-inherit">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fa-solid fa-calendar-days text-amber-500"></i> {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'}`}
                title="Previous Month"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button
                onClick={handleNextMonth}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fbebdd]'}`}
                title="Next Month"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
              <div key={idx} className="font-bold text-slate-400 py-1">{d}</div>
            ))}

            {/* Dynamic offset spacing for first day of the month */}
            {Array.from({ length: startDayOffset }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square"></div>
            ))}

            {calendarDays.map((dateStr) => {
              const dayNumber = parseInt(dateStr.split('-')[2])
              const hasCompetition = competitions.some(c => c.deadline === dateStr)
              const isSelected = selectedDate === dateStr

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(dateStr)}
                  className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-between transition relative cursor-pointer border ${
                    isSelected 
                      ? 'bg-amber-500 text-slate-950 font-extrabold border-amber-600 shadow-md' 
                      : hasCompetition
                        ? (isDarkMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' : 'bg-[#FEF3C7] border-amber-400 text-[#855300] font-bold')
                        : (isDarkMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-[#fff8f4] border-[#d8c3ad]/50 text-[#221a12] hover:bg-[#fbebdd]')
                  }`}
                >
                  <span className="text-xs">{dayNumber}</span>
                  {hasCompetition && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Competition Popup Card Details */}
        <div className={`rounded-2xl border p-6 shadow-sm flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div>
            <div className="flex items-center justify-between border-b pb-3 border-inherit mb-4">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600">
                <i className="fa-solid fa-award"></i> {activeModalCompetition?.statusBadge || 'Competition Info'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                {selectedDate}
              </span>
            </div>

            {activeModalCompetition ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-base leading-snug">{activeModalCompetition.title}</h4>
                  <p className="text-amber-500 font-semibold text-[11px] mt-1">
                    {activeModalCompetition.organizer}
                  </p>
                </div>

                {/* Detail Attributes Table */}
                <div className={`rounded-xl border overflow-hidden divide-y ${isDarkMode ? 'border-slate-800 divide-slate-800 bg-slate-950/40' : 'border-[#d8c3ad] divide-[#d8c3ad] bg-[#fffcf9]'}`}>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Category / Field</span>
                    <span className="font-bold text-right">{activeModalCompetition.category}</span>
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
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-slate-400 font-medium">Schedule Cycle</span>
                    <span className="font-bold text-right">{activeModalCompetition.scheduleType}</span>
                  </div>
                </div>

                {activeModalCompetition.notes && (
                  <div className={`p-3 rounded-xl border text-[11px] ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-[#FEF3C7] border-amber-300 text-[#855300]'}`}>
                    <strong>Note:</strong> {activeModalCompetition.notes}
                  </div>
                )}

                <div className={`p-3 rounded-xl border text-[11px] ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-[#fff1e5] border-[#d8c3ad] text-[#534434]'}`}>
                  {activeModalCompetition.description}
                </div>

                <div>
                  <span className="font-bold text-[11px] text-slate-400 block mb-1.5">Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModalCompetition.keywords.map(kw => (
                      <span key={kw} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-[#fbebdd] text-[#534434] border border-[#d8c3ad]'}`}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <i className="fa-regular fa-calendar-xmark text-3xl"></i>
                <p className="text-xs">No competition scheduled for {selectedDate}. Please select another date marked with the orange dot indicator!</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {activeModalCompetition && (
            <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-inherit">
              <a
                href={activeModalCompetition.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-[#0F172A] text-white font-bold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-1.5 shadow-sm text-center"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Official Site
              </a>
              <button
                onClick={() => handleSaveCompetition(activeModalCompetition)}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-[#d8c3ad] text-[#534434] hover:bg-[#fff1e5]'}`}
              >
                <i className="fa-regular fa-bookmark"></i> Save Target
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}