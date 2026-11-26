"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Plus_Jakarta_Sans } from "next/font/google"
import { supabase } from "@/lib/supabaseClient"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const PLEGO_ADMIN_WA_URL = "https://wa.me/message/YBBHHD4MUJ4TJ1"

type ProfileAccount = {
  id: string
  full_name?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  institution?: string | null
  mentor_code?: string | null
  connected_mentor_id?: string | null
  mentor_id?: string | null
  last_seen_at?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type ProjectItem = {
  id: string | number
  title: string
  category?: string | null
  status?: string | null
  approval_status?: string | null
  approved_by?: string | null
  approved_at?: string | null
  idea_id?: string | number | null
  user_id?: string | null
  author_id?: string | null
  mentor_id?: string | null
  competition_name?: string | null
  competition_title?: string | null
  summary?: string | null
  description?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type PortfolioItem = {
  id: string | number
  title: string
  student_name?: string | null
  user_id?: string | null
  mentor_name?: string | null
  category?: string | null
  summary?: string | null
  description?: string | null
  competition_name?: string | null
  status?: string | null
  demo_url?: string | null
  created_at?: string | null
}

type IdeaBankItem = {
  id: string | number
  title: string
  summary?: string | null
  description?: string | null
  category?: string | null
  research_field?: string | null
  difficulty?: string | null
  status?: string | null
  tags?: string[] | string | null
  created_at?: string | null
  updated_at?: string | null
}

type CompetitionItem = {
  id: string | number
  title: string
  organizer?: string | null
  status_badge?: string | null
  category?: string | null
  jenjang?: string | null
  level?: string | null
  schedule_type?: string | null
  location?: string | null
  description?: string | null
  notes?: string | null
  fee_label?: string | null
  official_url?: string | null
  deadline?: string | null
  start_date?: string | null
  created_at?: string | null
}

type MentorReportItem = {
  id: string | number
  mentor_id?: string | null
  mentor_name?: string | null
  student_id?: string | null
  student_name?: string | null
  project_id?: string | number | null
  project_title?: string | null
  feedback?: string | null
  message?: string | null
  status?: string | null
  score?: number | string | null
  created_at?: string | null
}

type ActivityLogItem = {
  id: string
  actorId?: string
  actorRole: "Student" | "Mentor" | "Admin"
  actorName: string
  action: string
  targetTitle: string
  timestamp: string
  rawTime: number
}

type AdminNavKey =
  | "dashboard"
  | "users"
  | "projects"
  | "portfolios"
  | "ideas"
  | "competitions"
  | "reports"

type AccountFilter = "all" | "student" | "mentor"
type AlphaSort = "asc" | "desc"
type CompetitionViewMode = "calendar" | "list"
type CalendarPeriodMode = "month" | "year"
type UserDirectoryPanel = "students" | "mentors" | null

function normalizePhoneNumber(rawPhone: string): string | null {
  const cleaned = rawPhone.replace(/[^\d+]/g, "").trim()
  if (!cleaned) return null
  if (cleaned.startsWith("+")) return cleaned
  if (cleaned.startsWith("0")) return `+62${cleaned.slice(1)}`
  if (cleaned.startsWith("62")) return `+${cleaned}`
  return `+62${cleaned}`
}

function generateMentorCode(fullName: string): string {
  const letters = fullName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X")
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `PLG-${letters}-${digits}`
}

function getDisplayMentorCode(mentor: ProfileAccount): string {
  if (mentor.mentor_code && mentor.mentor_code.trim()) {
    return mentor.mentor_code.trim().toUpperCase()
  }
  const cleanId = String(mentor.id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "0")
  return `PLG-${cleanId}`
}

function getAccountDisplayName(acc?: ProfileAccount | null): string {
  if (!acc) return "Unnamed User"
  return (acc.full_name || acc.name || acc.email || "Unnamed User").trim()
}

function formatRelativeTime(isoString?: string | null, nowMs?: number | null): string {
  if (!isoString) return "Recently"
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return "Recently"
  const baseMs = nowMs ?? date.getTime()
  const diffMs = Math.max(0, baseMs - date.getTime())
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays <= 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatFullDate(isoString?: string | null): string {
  if (!isoString) return "Not recorded"
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return "Not recorded"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseIdeaTags(tags?: string[] | string | null): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean)
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function NavIcon({ name }: { name: AdminNavKey }) {
  switch (name) {
    case "dashboard":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case "users":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case "projects":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    case "portfolios":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    case "ideas":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      )
    case "competitions":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      )
    case "reports":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
  }
}

/* ---------- Motion layer (uses the existing PLEGO amber / cream tokens) ---------- */
const ADMIN_MOTION_CSS = `
  @keyframes adm-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes adm-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes adm-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
  @keyframes adm-pulse-dot { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.55); } 70% { box-shadow: 0 0 0 7px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
  @keyframes adm-grow-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes adm-sheen { from { background-position: -200% 0; } to { background-position: 200% 0; } }

  .adm-page-enter { animation: adm-fade-up 380ms cubic-bezier(0.22, 1, 0.36, 1) both; }
  .adm-fade-up { animation: adm-fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--adm-delay, 0ms); }
  .adm-pop { animation: adm-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: var(--adm-delay, 0ms); }
  .adm-live-dot { animation: adm-pulse-dot 2s ease-out infinite; }
  .adm-bar { transform-origin: left center; animation: adm-grow-x 700ms cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--adm-delay, 0ms); }
  .adm-skeleton { background: linear-gradient(90deg, #f5ece5 25%, #fffdfa 50%, #f5ece5 75%); background-size: 200% 100%; animation: adm-sheen 1.4s linear infinite; }

  .adm-lift { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; will-change: transform; }
  .adm-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 24px -12px rgba(146, 64, 14, 0.28); border-color: #fcd34d !important; }
  .adm-lift:active { transform: translateY(-1px) scale(0.99); }

  .adm-nav-btn { transition: background-color 160ms ease, color 160ms ease, transform 160ms ease; }
  .adm-nav-btn:hover { transform: translateX(3px); background-color: #fff8ec !important; }
  .adm-nav-btn[data-active="true"]:hover { background-color: #f59e0b !important; transform: none; }

  .adm-btn { transition: transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease; }
  .adm-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px -8px rgba(146, 64, 14, 0.45); }
  .adm-btn:active { transform: translateY(0) scale(0.98); }

  .adm-row { transition: background-color 140ms ease; }
  .adm-row:hover { background-color: #fffaf2 !important; }

  button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .adm-page-enter, .adm-fade-up, .adm-pop, .adm-live-dot, .adm-bar, .adm-skeleton { animation: none !important; }
    .adm-lift, .adm-nav-btn, .adm-btn, .adm-row { transition: none !important; }
    .adm-lift:hover, .adm-nav-btn:hover, .adm-btn:hover { transform: none !important; }
  }
`

const admDelay = (ms: number) => ({ "--adm-delay": `${ms}ms` } as CSSProperties)

function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || value === fromRef.current) {
      setDisplay(value)
      fromRef.current = value
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{display.toLocaleString("en-US")}</>
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)
  const [referenceNowMs, setReferenceNowMs] = useState<number | null>(null)
  const [adminName, setAdminName] = useState("PLEGO Admin")
  const [adminEmail, setAdminEmail] = useState("")
  const [activeNav, setActiveNav] = useState<AdminNavKey>("dashboard")
  const [globalSearch, setGlobalSearch] = useState("")

  const [overviewRangeDays, setOverviewRangeDays] = useState<7 | 14 | 30>(7)

  const [compViewMode, setCompViewMode] = useState<CompetitionViewMode>("calendar")
  const [calendarPeriodMode, setCalendarPeriodMode] = useState<CalendarPeriodMode>("month")
  // Static placeholder for prerender; the real current month is set on mount below.
  const [calendarCursor, setCalendarCursor] = useState<{ year: number; month: number }>({
    year: 2026,
    month: 10,
  })

  const [accounts, setAccounts] = useState<ProfileAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<ProfileAccount | null>(null)
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [editAccountForm, setEditAccountForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    institution: "",
  })
  const [savingAccount, setSavingAccount] = useState(false)
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false)

  const [activeDirectoryPanel, setActiveDirectoryPanel] = useState<UserDirectoryPanel>(null)
  const [selectedStudentRowId, setSelectedStudentRowId] = useState<string | null>(null)
  const [selectedMentorRowId, setSelectedMentorRowId] = useState<string | null>(null)

  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all")
  const [alphaSort, setAlphaSort] = useState<AlphaSort>("asc")
  const [loadingData, setLoadingData] = useState(false)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([])
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([])
  const [isBulkPortfolioMode, setIsBulkPortfolioMode] = useState(false)

  const [ideas, setIdeas] = useState<IdeaBankItem[]>([])
  const [ideaStatusFilter, setIdeaStatusFilter] = useState<"all" | "active" | "completed">("all")
  const [selectedIdea, setSelectedIdea] = useState<IdeaBankItem | null>(null)
  const [isEditingIdea, setIsEditingIdea] = useState(false)
  const [editIdeaForm, setEditIdeaForm] = useState({
    title: "",
    category: "Computer Science & IoT",
    difficulty: "Intermediate",
    status: "active",
    summary: "",
    tagsText: "",
  })
  const [savingIdeaEdit, setSavingIdeaEdit] = useState(false)

  const [competitions, setCompetitions] = useState<CompetitionItem[]>([])
  const [editingCompetition, setEditingCompetition] = useState<CompetitionItem | null>(null)
  const [editCompForm, setEditCompForm] = useState({
    title: "",
    organizer: "",
    status_badge: "Open",
    category: "STEM & Innovation",
    jenjang: "SMP / SMA / Sederajat",
    level: "National",
    schedule_type: "Online / Hybrid",
    location: "Indonesia",
    fee_label: "",
    official_url: "",
    deadline: "",
    description: "",
  })
  const [savingCompEdit, setSavingCompEdit] = useState(false)

  const [mentorReports, setMentorReports] = useState<MentorReportItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
  const [mentorToStudents, setMentorToStudents] = useState<Record<string, string[]>>({})
  const [studentToMentors, setStudentToMentors] = useState<Record<string, string[]>>({})
  const [copiedMentorId, setCopiedMentorId] = useState<string | null>(null)

  const [showAddMentorForm, setShowAddMentorForm] = useState(false)
  const [showAddCompetitionForm, setShowAddCompetitionForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  const [mentorForm, setMentorForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    institution: "PLEGO Indonesia",
    mentorCode: "",
  })
  const [submittingMentor, setSubmittingMentor] = useState(false)
  const [showMentorPassword, setShowMentorPassword] = useState(false)

  const [compForm, setCompForm] = useState({
    title: "",
    organizer: "",
    status_badge: "Open",
    category: "STEM & Innovation",
    jenjang: "SMP / SMA / Sederajat",
    level: "National",
    schedule_type: "Online / Hybrid",
    location: "Indonesia",
    fee_label: "Free / Optional Package",
    official_url: "",
    start_date: "",
    deadline: "",
    description: "",
  })
  const [submittingCompetition, setSubmittingCompetition] = useState(false)

  const [banner, setBanner] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    const now = new Date()
    setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() })
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  const showBanner = useCallback((type: "success" | "error", message: string) => {
    setBanner({ type, message })
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }, [])

  const openAccountModal = useCallback((acc: ProfileAccount, startEditing = false) => {
    setSelectedAccount(acc)
    setIsEditingAccount(startEditing)
    setEditAccountForm({
      fullName: acc.full_name || acc.name || "",
      email: acc.email || "",
      phone: acc.phone || "",
      institution: acc.institution || "",
    })
  }, [])

  const openIdeaModal = useCallback((idea: IdeaBankItem, startEditing = false) => {
    setSelectedIdea(idea)
    setIsEditingIdea(startEditing)
    setEditIdeaForm({
      title: idea.title || "",
      category: idea.category || idea.research_field || "Computer Science & IoT",
      difficulty: idea.difficulty || "Intermediate",
      status: String(idea.status || "active").toLowerCase().includes("complet")
        ? "completed"
        : "active",
      summary: idea.summary || idea.description || "",
      tagsText: parseIdeaTags(idea.tags).join(", "),
    })
  }, [])

  const startEditCompetition = useCallback((comp: CompetitionItem) => {
    setEditingCompetition(comp)
    setShowAddCompetitionForm(false)
    setEditCompForm({
      title: comp.title || "",
      organizer: comp.organizer || "",
      status_badge: comp.status_badge || "Open",
      category: comp.category || "STEM & Innovation",
      jenjang: comp.jenjang || "SMP / SMA / Sederajat",
      level: comp.level || "National",
      schedule_type: comp.schedule_type || "Online / Hybrid",
      location: comp.location || "Indonesia",
      fee_label: comp.fee_label || "",
      official_url: comp.official_url || "",
      deadline: comp.deadline ? comp.deadline.slice(0, 10) : "",
      description: comp.description || comp.notes || "",
    })
  }, [])

  const loadAllAdminData = useCallback(async () => {
    setReferenceNowMs(Date.now())
    setLoadingData(true)
    try {
      const [
        profilesRes,
        projectsRes,
        ideasRes,
        competitionsRes,
        notesRes,
        feedbackRes,
        portfoliosRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("ideas").select("*").order("id", { ascending: false }),
        supabase.from("competitions").select("*").order("deadline", { ascending: true }),
        supabase
          .from("prototype_notes")
          .select("id, title, note_title, user_id, author_name, created_at")
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("mentor_feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("portfolios").select("*").order("created_at", { ascending: false }),
      ])

      const profileRows: ProfileAccount[] = Array.isArray(profilesRes.data)
        ? (profilesRes.data as ProfileAccount[])
        : []
      const projectRows: ProjectItem[] = Array.isArray(projectsRes.data)
        ? (projectsRes.data as ProjectItem[])
        : []
      const ideaRows: IdeaBankItem[] = Array.isArray(ideasRes.data)
        ? (ideasRes.data as IdeaBankItem[])
        : []
      const competitionRows: CompetitionItem[] = Array.isArray(competitionsRes.data)
        ? (competitionsRes.data as CompetitionItem[])
        : []
      const feedbackRows: MentorReportItem[] = Array.isArray(feedbackRes.data)
        ? (feedbackRes.data as MentorReportItem[])
        : []

      setAccounts(profileRows)
      setIdeas(ideaRows)
      setCompetitions(competitionRows)
      setMentorReports(feedbackRows)

      const nameById = new Map<string, string>()
      const mentorIdsSet = new Set<string>()
      const mToSMap = new Map<string, Set<string>>()
      const sToMMap = new Map<string, Set<string>>()

      const linkPair = (mentorId?: string | null, studentId?: string | null) => {
        const mId = String(mentorId || "").trim()
        const sId = String(studentId || "").trim()
        if (!mId || !sId || mId === sId) return
        if (!mToSMap.has(mId)) mToSMap.set(mId, new Set<string>())
        mToSMap.get(mId)?.add(sId)
        if (!sToMMap.has(sId)) sToMMap.set(sId, new Set<string>())
        sToMMap.get(sId)?.add(mId)
      }

      for (const p of profileRows) {
        nameById.set(p.id, getAccountDisplayName(p))
        if (String(p.role || "").toLowerCase() === "mentor") {
          mentorIdsSet.add(p.id)
          if (!mToSMap.has(p.id)) mToSMap.set(p.id, new Set<string>())
        }
      }

      for (const p of profileRows) {
        const roleLower = String(p.role || "").toLowerCase()
        if (roleLower === "mentor" || roleLower === "admin") continue
        const linkedMentor = p.connected_mentor_id || p.mentor_id
        if (linkedMentor && mentorIdsSet.has(String(linkedMentor))) {
          linkPair(String(linkedMentor), p.id)
        }
      }

      const approvedFeedbackProjectIds = new Set<string>()
      for (const fb of feedbackRows) {
        const st = String(fb.status || "").toLowerCase()
        if (fb.project_id && (st.includes("approv") || st.includes("complet"))) {
          approvedFeedbackProjectIds.add(String(fb.project_id))
        }
      }

      const activeWorkspaceProjects: ProjectItem[] = []
      const graduatedFromProjects: PortfolioItem[] = []

      for (const proj of projectRows) {
        const ownerId = String(proj.user_id || proj.author_id || "")
        const st = String(proj.status || "").toLowerCase()
        const appSt = String(proj.approval_status || "").toLowerCase()
        const isCompleted =
          st.includes("complete") ||
          st.includes("done") ||
          st.includes("submit") ||
          st.includes("ready")
        const isMentorApproved =
          appSt.includes("approv") ||
          Boolean(proj.approved_at) ||
          Boolean(proj.approved_by) ||
          approvedFeedbackProjectIds.has(String(proj.id))

        if (isCompleted && isMentorApproved) {
          const mentorLabel =
            proj.approved_by ||
            (proj.mentor_id ? nameById.get(String(proj.mentor_id)) : null) ||
            Array.from(sToMMap.get(ownerId) || [])
              .map((mId) => nameById.get(mId))
              .filter(Boolean)
              .join(", ") ||
            "Assigned Mentor"

          graduatedFromProjects.push({
            id: `proj-port-${proj.id}`,
            title: proj.title,
            student_name: nameById.get(ownerId) || "Student Innovator",
            user_id: ownerId,
            mentor_name: mentorLabel,
            category: proj.category || "Innovation Prototype",
            summary: proj.summary || proj.description || "Completed and approved student project.",
            description: proj.description || proj.summary || "",
            competition_name: proj.competition_name || proj.competition_title || null,
            status: "Mentor Approved",
            created_at: proj.approved_at || proj.updated_at || proj.created_at,
          })
        } else {
          activeWorkspaceProjects.push(proj)
        }
      }

      setProjects(activeWorkspaceProjects)

      const tablePortfolios: PortfolioItem[] =
        !portfoliosRes.error && Array.isArray(portfoliosRes.data)
          ? (portfoliosRes.data as PortfolioItem[])
          : []

      const mergedPortfolioMap = new Map<string, PortfolioItem>()
      for (const pt of tablePortfolios) {
        mergedPortfolioMap.set(String(pt.title || pt.id).toLowerCase(), pt)
      }
      for (const gp of graduatedFromProjects) {
        const key = String(gp.title || gp.id).toLowerCase()
        if (!mergedPortfolioMap.has(key)) {
          mergedPortfolioMap.set(key, gp)
        }
      }
      setPortfolios(Array.from(mergedPortfolioMap.values()))

      const projectOwnerById = new Map<string, string>()
      const logs: ActivityLogItem[] = []

      for (const proj of projectRows) {
        const ownerId = String(proj.user_id || proj.author_id || "")
        if (proj.id && ownerId) {
          projectOwnerById.set(String(proj.id), ownerId)
        }
        if (proj.mentor_id && ownerId && mentorIdsSet.has(String(proj.mentor_id))) {
          linkPair(String(proj.mentor_id), ownerId)
        }
        const ts = proj.updated_at || proj.created_at || ""
        logs.push({
          id: `proj-${proj.id}`,
          actorId: ownerId || undefined,
          actorRole: "Student",
          actorName: nameById.get(ownerId) || "Student Innovator",
          action: proj.status ? `Updated project (${proj.status})` : "Created workspace project",
          targetTitle: proj.title || "Untitled Project",
          timestamp: ts,
          rawTime: ts ? new Date(ts).getTime() : 0,
        })
      }

      if (!notesRes.error && Array.isArray(notesRes.data)) {
        for (const note of notesRes.data) {
          const ownerId = String(note.user_id || "")
          const ts = note.created_at || ""
          logs.push({
            id: `note-${note.id}`,
            actorId: ownerId || undefined,
            actorRole: "Student",
            actorName: note.author_name || nameById.get(ownerId) || "Student Innovator",
            action: "Logged prototype note",
            targetTitle: note.title || note.note_title || "Prototype Iteration",
            timestamp: ts,
            rawTime: ts ? new Date(ts).getTime() : 0,
          })
        }
      }

      for (const fb of feedbackRows) {
        const mentorId = String(fb.mentor_id || "")
        const linkedStudentId = String(
          fb.student_id || (fb.project_id ? projectOwnerById.get(String(fb.project_id)) || "" : "")
        )
        if (mentorId && linkedStudentId && mentorIdsSet.has(mentorId)) {
          linkPair(mentorId, linkedStudentId)
        }
        const ts = fb.created_at || ""
        const snippet = String(fb.project_title || fb.feedback || fb.message || "Mentor Review")
        logs.push({
          id: `fb-${fb.id}`,
          actorId: mentorId || undefined,
          actorRole: "Mentor",
          actorName: fb.mentor_name || nameById.get(mentorId) || "PLEGO Mentor",
          action: "Submitted mentor report & feedback",
          targetTitle: snippet.length > 52 ? `${snippet.slice(0, 52)}...` : snippet,
          timestamp: ts,
          rawTime: ts ? new Date(ts).getTime() : 0,
        })
      }

      for (const acc of profileRows.slice(0, 15)) {
        if (!acc.created_at) continue
        const roleStr = String(acc.role || "student").toLowerCase()
        const roleLabel: "Student" | "Mentor" | "Admin" =
          roleStr === "mentor" ? "Mentor" : roleStr === "admin" ? "Admin" : "Student"
        logs.push({
          id: `signup-${acc.id}`,
          actorId: acc.id,
          actorRole: roleLabel,
          actorName: getAccountDisplayName(acc),
          action: "Joined InnovaSeed workspace",
          targetTitle: acc.institution || "PLEGO Indonesia",
          timestamp: acc.created_at,
          rawTime: new Date(acc.created_at).getTime(),
        })
      }

      const serializedMToS: Record<string, string[]> = {}
      mToSMap.forEach((set, mId) => {
        serializedMToS[mId] = Array.from(set)
      })
      const serializedSToM: Record<string, string[]> = {}
      sToMMap.forEach((set, sId) => {
        serializedSToM[sId] = Array.from(set)
      })

      setMentorToStudents(serializedMToS)
      setStudentToMentors(serializedSToM)

      logs.sort((a, b) => b.rawTime - a.rawTime)
      setActivityLogs(logs)
    } catch (err) {
      console.error("Failed loading admin data:", err)
      showBanner("error", "Some admin data could not be loaded.")
    } finally {
      setLoadingData(false)
    }
  }, [showBanner])

  useEffect(() => {
    let active = true

    // If the access check hangs, send the visitor away instead of showing the
    // admin UI to someone who has not been verified.
    const fallbackTimer = window.setTimeout(() => {
      if (active) router.replace("/login")
    }, 10000)

    async function verifyAdmin() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          if (active) router.replace("/login")
          return
        }

        const user = session.user
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        // Only trust the role stored in the profiles table. user_metadata can be
        // edited by the signed-in user, and "email starts with admin" can be
        // registered by anyone, so neither is safe for an admin check.
        const role = String(profile?.role || "").trim().toLowerCase()
        const emailLower = String(user.email || "").trim().toLowerCase()
        const isAdminEmail =
          emailLower === "admininnovaseed@gmail.com" ||
          emailLower === "plego@gmail.com"

        if (role !== "admin" && !isAdminEmail) {
          if (active) {
            router.replace(role === "mentor" ? "/mentor" : "/dashboard/student")
          }
          return
        }

        if (!active) return
        setReferenceNowMs(Date.now())
        setAdminName(profile?.full_name || profile?.name || "PLEGO Admin")
        setAdminEmail(user.email || "")
        setIsCheckingAccess(false)
        await loadAllAdminData()
      } catch (err) {
        console.error("Admin session check failed:", err)
        if (active) router.replace("/login")
      } finally {
        window.clearTimeout(fallbackTimer)
      }
    }

    void verifyAdmin()
    return () => {
      active = false
      window.clearTimeout(fallbackTimer)
    }
  }, [loadAllAdminData, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAccount(null)
        setIsEditingAccount(false)
        setSelectedIdea(null)
        setIsEditingIdea(false)
        setEditingCompetition(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const accountById = useMemo(() => {
    const map = new Map<string, ProfileAccount>()
    for (const a of accounts) {
      map.set(a.id, a)
    }
    return map
  }, [accounts])

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of accounts) {
      map.set(a.id, getAccountDisplayName(a))
    }
    return map
  }, [accounts])

  const studentAccounts = useMemo(() => {
    return accounts
      .filter((a) => {
        const r = String(a.role || "student").toLowerCase()
        return r !== "mentor" && r !== "admin"
      })
      .sort((a, b) =>
        getAccountDisplayName(a).localeCompare(getAccountDisplayName(b), "id", {
          sensitivity: "base",
        })
      )
  }, [accounts])

  const mentorAccounts = useMemo(() => {
    return accounts
      .filter((a) => String(a.role || "").toLowerCase() === "mentor")
      .sort((a, b) =>
        getAccountDisplayName(a).localeCompare(getAccountDisplayName(b), "id", {
          sensitivity: "base",
        })
      )
  }, [accounts])

  const getStudentActivitySummary = useCallback(
    (student: ProfileAccount) => {
      const ownedProjects = projects.filter((p) => {
        const ownerId = String(p.user_id || p.author_id || "")
        return ownerId === student.id
      })

      const joinedCompetitions = new Set<string>()
      for (const proj of ownedProjects) {
        const compTitle = String(proj.competition_name || proj.competition_title || "").trim()
        if (compTitle) joinedCompetitions.add(compTitle)
      }
      for (const pt of portfolios) {
        const isOwner =
          String(pt.user_id || "") === student.id ||
          String(pt.student_name || "").trim().toLowerCase() ===
            getAccountDisplayName(student).toLowerCase()
        if (isOwner && pt.competition_name && String(pt.competition_name).trim()) {
          joinedCompetitions.add(String(pt.competition_name).trim())
        }
      }

      const mentorIds = studentToMentors[student.id] || []
      const mentorNames = mentorIds
        .map((mId) => profileNameById.get(mId))
        .filter((n): n is string => Boolean(n))

      return {
        projects: ownedProjects,
        competitions: Array.from(joinedCompetitions),
        mentorNames,
      }
    },
    [projects, portfolios, studentToMentors, profileNameById]
  )

  const last7DaysLogs = useMemo(() => {
    if (!referenceNowMs) return []
    const sevenDaysAgoMs = referenceNowMs - 7 * 24 * 60 * 60 * 1000
    return activityLogs.filter((log) => log.rawTime > 0 && log.rawTime >= sevenDaysAgoMs)
  }, [activityLogs, referenceNowMs])

  const activityAnalytics = useMemo(() => {
    if (!referenceNowMs) {
      return {
        activeTodayUsers: [] as ProfileAccount[],
        activeWindowUsers: [] as ProfileAccount[],
        active7DaysUsers: [] as ProfileAccount[],
        chartSeries: [] as Array<{
          key: string
          label: string
          shortDate: string
          count: number
          names: string[]
        }>,
        maxChartCount: 1,
      }
    }

    const now = new Date(referenceNowMs)
    const todayKey = toDayKey(now)
    const sevenDaysAgoMs = referenceNowMs - 7 * 24 * 60 * 60 * 1000
    const selectedWindowAgoMs = referenceNowMs - overviewRangeDays * 24 * 60 * 60 * 1000

    const latestActivityByUser = new Map<string, number>()
    const dailyActiveSets = new Map<string, Set<string>>()

    const dayBuckets: Array<{ key: string; label: string; shortDate: string }> = []
    for (let offset = overviewRangeDays - 1; offset >= 0; offset--) {
      const d = new Date(referenceNowMs)
      d.setDate(d.getDate() - offset)
      const dk = toDayKey(d)
      dayBuckets.push({
        key: dk,
        label:
          overviewRangeDays <= 14
            ? d.toLocaleDateString("en-US", { weekday: "short" })
            : String(d.getDate()),
        shortDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      })
      dailyActiveSets.set(dk, new Set<string>())
    }

    const recordUserPing = (userId: string | undefined, iso?: string | null) => {
      if (!userId || !iso) return
      const t = new Date(iso).getTime()
      if (Number.isNaN(t)) return
      const prev = latestActivityByUser.get(userId) || 0
      if (t > prev) latestActivityByUser.set(userId, t)

      const dk = toDayKey(new Date(t))
      if (dailyActiveSets.has(dk)) {
        dailyActiveSets.get(dk)?.add(userId)
      }
    }

    for (const acc of accounts) {
      recordUserPing(acc.id, acc.last_seen_at || acc.updated_at || acc.created_at)
    }
    for (const log of activityLogs) {
      recordUserPing(log.actorId, log.timestamp)
    }

    const activeTodayUsers: ProfileAccount[] = []
    const activeWindowUsers: ProfileAccount[] = []
    const active7DaysUsers: ProfileAccount[] = []

    for (const acc of accounts) {
      const lastMs = latestActivityByUser.get(acc.id)
      if (!lastMs) continue
      if (toDayKey(new Date(lastMs)) === todayKey) {
        activeTodayUsers.push(acc)
      }
      if (lastMs >= selectedWindowAgoMs) {
        activeWindowUsers.push(acc)
      }
      if (lastMs >= sevenDaysAgoMs) {
        active7DaysUsers.push(acc)
      }
    }

    const chartSeries = dayBuckets.map((b) => {
      const ids = Array.from(dailyActiveSets.get(b.key) || [])
      return {
        ...b,
        count: ids.length,
        names: ids.map((id) => profileNameById.get(id) || "User"),
      }
    })

    const maxChartCount = Math.max(1, ...chartSeries.map((c) => c.count))

    return {
      activeTodayUsers,
      activeWindowUsers,
      active7DaysUsers,
      chartSeries,
      maxChartCount,
    }
  }, [accounts, activityLogs, overviewRangeDays, profileNameById, referenceNowMs])

  const kpiStats = useMemo(() => {
    const mentors = accounts.filter((a) => String(a.role || "").toLowerCase() === "mentor")
    const students = accounts.filter(
      (a) =>
        String(a.role || "").toLowerCase() !== "mentor" &&
        String(a.role || "").toLowerCase() !== "admin"
    )
    const connectedStudentIds = new Set<string>()
    Object.values(mentorToStudents).forEach((ids) => ids.forEach((id) => connectedStudentIds.add(id)))

    const activeProjectsCount = projects.filter((p) => {
      const st = String(p.status || "active").toLowerCase()
      return !st.includes("archive") && !st.includes("cancel")
    }).length

    return {
      totalUsers: accounts.length,
      studentCount: students.length,
      mentorCount: mentors.length,
      mentorConnectionsCount: connectedStudentIds.size,
      activeTodayCount: activityAnalytics.activeTodayUsers.length,
      activeProjectsCount,
      active7DaysCount: activityAnalytics.active7DaysUsers.length,
    }
  }, [accounts, mentorToStudents, projects, activityAnalytics])

  // "Needs attention": the few things an admin can actually act on today.
  const attentionStats = useMemo(() => {
    const now = referenceNowMs
    const pendingProjects = projects.filter((p) => {
      const st = String(p.status || "").toLowerCase()
      const ap = String(p.approval_status || "").toLowerCase()
      if (st.includes("archive") || st.includes("cancel")) return false
      if (p.approved_at || ap.includes("approv")) return false
      return ap.includes("pend") || ap.includes("review") || st.includes("submit") || st.includes("review")
    }).length

    const closingSoon = now
      ? competitions.filter((c) => {
          if (!c.deadline) return false
          const t = new Date(c.deadline).getTime()
          return Number.isFinite(t) && t >= now && t - now <= 14 * 24 * 60 * 60 * 1000
        }).length
      : 0

    const mentorsWithoutStudents = mentorAccounts.filter(
      (m) => !(mentorToStudents[m.id] && mentorToStudents[m.id].length > 0)
    ).length

    const studentsWithoutMentor = studentAccounts.filter(
      (st) => !(studentToMentors[st.id] && studentToMentors[st.id].length > 0)
    ).length

    return { pendingProjects, closingSoon, mentorsWithoutStudents, studentsWithoutMentor }
  }, [projects, competitions, mentorAccounts, studentAccounts, mentorToStudents, studentToMentors, referenceNowMs])

  const handleExportPortfoliosPdf = useCallback((items: PortfolioItem[]) => {
    if (items.length === 0) return
    const printWin = window.open("", "_blank", "width=960,height=740")
    if (!printWin) return

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    const cardsMarkup = items
      .map((pt, idx) => {
        const title = escapeHtml(pt.title || "Untitled Portfolio")
        const student = escapeHtml(pt.student_name || "Student Innovator")
        const mentor = escapeHtml(pt.mentor_name || "Assigned Mentor")
        const category = escapeHtml(pt.category || "Innovation Prototype")
        const status = escapeHtml(pt.status || "Mentor Approved")
        const comp = pt.competition_name ? escapeHtml(pt.competition_name) : "General Showcase"
        const desc = escapeHtml(
          pt.summary ||
            pt.description ||
            "Completed innovation project verified by mentor and promoted from Idea Bank."
        )
        const dateLabel = escapeHtml(formatFullDate(pt.created_at))

        return `
          <article class="card ${idx > 0 ? "page-break" : ""}">
            <div class="top-row">
              <span class="badge badge-ok">${status}</span>
              <span class="badge badge-cat">${category}</span>
            </div>
            <h2>${title}</h2>
            <p class="meta">
              <strong>Student:</strong> ${student} &nbsp;|&nbsp;
              <strong>Mentor:</strong> ${mentor} &nbsp;|&nbsp;
              <strong>Date:</strong> ${dateLabel}
            </p>
            <div class="box">
              <h3>Project Overview &amp; Prototype Details</h3>
              <p>${desc}</p>
            </div>
            <div class="box">
              <h3>Competition &amp; Verification</h3>
              <p><strong>Competition Target:</strong> ${comp}</p>
              ${pt.demo_url ? `<p><strong>Demo URL:</strong> ${escapeHtml(pt.demo_url)}</p>` : ""}
            </div>
          </article>
        `
      })
      .join("")

    printWin.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>InnovaSeed Student Portfolio PDF (${items.length})</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 28px;
              color: #0f172a;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2px solid #f59e0b;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header h1 { margin: 0; font-size: 19px; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 20px;
              margin-bottom: 18px;
              background: #fffdf9;
            }
            .page-break { page-break-before: always; }
            .top-row { display: flex; gap: 8px; margin-bottom: 10px; }
            .badge {
              font-size: 10px;
              font-weight: 700;
              padding: 3px 9px;
              border-radius: 999px;
            }
            .badge-ok { background: #dcfce7; color: #166534; }
            .badge-cat { background: #fef3c7; color: #92400e; }
            h2 { margin: 0 0 8px; font-size: 17px; }
            .meta { margin: 0 0 14px; font-size: 12px; color: #475569; }
            .box {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px 14px;
              margin-bottom: 10px;
            }
            .box h3 {
              margin: 0 0 6px;
              font-size: 10.5px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #64748b;
            }
            .box p { margin: 0; font-size: 12.5px; line-height: 1.55; color: #1e293b; }
            @media print {
              body { padding: 10px; }
              .card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>InnovaSeed • Student Portfolio Export</h1>
              <p>Generated on ${escapeHtml(generatedDate)} • PLEGO Indonesia</p>
            </div>
            <p><strong>Portfolios:</strong> ${items.length}</p>
          </div>
          ${cardsMarkup}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWin.document.close()
  }, [])

  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase()
    if (!q) return null

    const matchedAccounts = accounts.filter((a) => {
      const name = String(a.full_name || a.name || "").toLowerCase()
      const email = String(a.email || "").toLowerCase()
      const inst = String(a.institution || "").toLowerCase()
      const code = String(a.mentor_code || "").toLowerCase()
      return name.includes(q) || email.includes(q) || inst.includes(q) || code.includes(q)
    })

    const matchedProjects = projects.filter((p) => {
      const title = String(p.title || "").toLowerCase()
      const cat = String(p.category || "").toLowerCase()
      const sum = String(p.summary || p.description || "").toLowerCase()
      return title.includes(q) || cat.includes(q) || sum.includes(q)
    })

    const matchedIdeas = ideas.filter((i) => {
      const title = String(i.title || "").toLowerCase()
      const cat = String(i.category || i.research_field || "").toLowerCase()
      const sum = String(i.summary || i.description || "").toLowerCase()
      return title.includes(q) || cat.includes(q) || sum.includes(q)
    })

    const matchedCompetitions = competitions.filter((c) => {
      const title = String(c.title || "").toLowerCase()
      const org = String(c.organizer || "").toLowerCase()
      const cat = String(c.category || "").toLowerCase()
      return title.includes(q) || org.includes(q) || cat.includes(q)
    })

    const matchedPortfolios = portfolios.filter((pt) => {
      const title = String(pt.title || "").toLowerCase()
      const student = String(pt.student_name || "").toLowerCase()
      return title.includes(q) || student.includes(q)
    })

    const matchedReports = mentorReports.filter((r) => {
      const mentor = String(r.mentor_name || "").toLowerCase()
      const proj = String(r.project_title || "").toLowerCase()
      const msg = String(r.feedback || r.message || "").toLowerCase()
      return mentor.includes(q) || proj.includes(q) || msg.includes(q)
    })

    const totalHits =
      matchedAccounts.length +
      matchedProjects.length +
      matchedIdeas.length +
      matchedCompetitions.length +
      matchedPortfolios.length +
      matchedReports.length

    return {
      totalHits,
      matchedAccounts,
      matchedProjects,
      matchedIdeas,
      matchedCompetitions,
      matchedPortfolios,
      matchedReports,
    }
  }, [globalSearch, accounts, projects, ideas, competitions, portfolios, mentorReports])

  const handleCopyMentorCode = async (mentor: ProfileAccount) => {
    const code = getDisplayMentorCode(mentor)
    try {
      await navigator.clipboard.writeText(code)
      setCopiedMentorId(mentor.id)
      setTimeout(() => setCopiedMentorId((prev) => (prev === mentor.id ? null : prev)), 2000)
    } catch {
      showBanner("success", `Mentor Code: ${code}`)
    }
  }

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = mentorForm.fullName.trim()
    const cleanEmail = mentorForm.email.trim().toLowerCase()
    const cleanPassword = mentorForm.password
    const cleanInstitution = mentorForm.institution.trim() || "PLEGO Indonesia"
    const normalizedPhone = mentorForm.phone.trim()
      ? normalizePhoneNumber(mentorForm.phone)
      : null
    const finalMentorCode = mentorForm.mentorCode.trim()
      ? mentorForm.mentorCode.trim().toUpperCase().replace(/\s+/g, "-")
      : generateMentorCode(cleanName)

    if (!cleanName || !cleanEmail) {
      showBanner("error", "Mentor full name and email are required.")
      return
    }
    if (cleanPassword && cleanPassword.length < 6) {
      showBanner("error", "Password must be at least 6 characters.")
      return
    }

    setSubmittingMentor(true)
    try {
      // 1. Create the auth user (with password) via the SERVER route, so the
      //    service_role key never touches the browser. The route verifies the
      //    caller is an authenticated admin before creating anything.
      let authUserId: string | null = null
      if (cleanPassword) {
        const { data: { session: callerSession } } = await supabase.auth.getSession()
        const callerToken = callerSession?.access_token || ""

        const res = await fetch("/api/admin/create-mentor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(callerToken ? { Authorization: `Bearer ${callerToken}` } : {}),
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            fullName: cleanName,
          }),
        })
        const result = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          userId?: string
          error?: string
        }

        if (!res.ok || !result.ok) {
          showBanner(
            "error",
            result.error ||
              "Could not create the login account (server refused). Check that SUPABASE_SERVICE_ROLE_KEY is set on the server and you are logged in as admin."
          )
          setSubmittingMentor(false)
          return
        }
        authUserId = result.userId ?? null
      }

      const generatedId =
        authUserId ||
        (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

      const payloadWithCode = {
        id: generatedId,
        full_name: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: normalizedPhone,
        role: "mentor",
        institution: cleanInstitution,
        mentor_code: finalMentorCode,
      }

      const { error } = await supabase
        .from("profiles")
        .upsert([payloadWithCode], { onConflict: "id" })
      if (error) {
        const fallback = { ...payloadWithCode }
        delete (fallback as { mentor_code?: string }).mentor_code
        const retry = await supabase.from("profiles").upsert([fallback], { onConflict: "id" })
        if (retry.error) throw retry.error
      }

      setMentorForm({
        fullName: "",
        email: "",
        password: "",
        phone: "",
        institution: cleanInstitution,
        mentorCode: "",
      })
      setShowMentorPassword(false)
      setShowAddMentorForm(false)
      await loadAllAdminData()
      showBanner(
        "success",
        cleanPassword
          ? `Mentor "${cleanName}" created (${finalMentorCode}) — they can now log in with their email & password.`
          : `Mentor "${cleanName}" created (${finalMentorCode}) — profile only, no login password set.`
      )
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to create mentor.")
    } finally {
      setSubmittingMentor(false)
    }
  }

  const handleSaveAccountEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount) return
    const cleanName = editAccountForm.fullName.trim()
    const cleanEmail = editAccountForm.email.trim().toLowerCase()
    const cleanPhone = editAccountForm.phone.trim()
      ? normalizePhoneNumber(editAccountForm.phone)
      : null
    const cleanInstitution = editAccountForm.institution.trim() || null

    if (!cleanName || !cleanEmail) {
      showBanner("error", "Full name and email cannot be empty.")
      return
    }

    setSavingAccount(true)
    try {
      const updatePayload = {
        full_name: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        institution: cleanInstitution,
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", selectedAccount.id)

      if (error) throw error

      const updatedAcc: ProfileAccount = {
        ...selectedAccount,
        ...updatePayload,
      }
      setAccounts((prev) => prev.map((a) => (a.id === selectedAccount.id ? updatedAcc : a)))
      setSelectedAccount(updatedAcc)
      setIsEditingAccount(false)
      showBanner("success", `Updated profile for "${cleanName}".`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to update account.")
    } finally {
      setSavingAccount(false)
    }
  }

  const handleSendPasswordReset = async (targetEmail?: string | null) => {
    const cleanEmail = String(targetEmail || "").trim().toLowerCase()
    if (!cleanEmail) {
      showBanner("error", "User does not have an email address for password reset.")
      return
    }

    setSendingPasswordReset(true)
    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      })
      if (error) throw error
      showBanner("success", `Password reset email sent to ${cleanEmail}.`)
    } catch (err: unknown) {
      showBanner(
        "error",
        err instanceof Error ? err.message : "Failed to send password reset email."
      )
    } finally {
      setSendingPasswordReset(false)
    }
  }

  const handleSaveIdeaEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIdea) return
    const cleanTitle = editIdeaForm.title.trim()
    const cleanSummary = editIdeaForm.summary.trim()
    if (!cleanTitle || !cleanSummary) {
      showBanner("error", "Idea title and summary cannot be empty.")
      return
    }

    const parsedTags = parseIdeaTags(editIdeaForm.tagsText)
    setSavingIdeaEdit(true)
    try {
      const payload = {
        title: cleanTitle,
        summary: cleanSummary,
        description: cleanSummary,
        category: editIdeaForm.category,
        research_field: editIdeaForm.category,
        difficulty: editIdeaForm.difficulty,
        status: editIdeaForm.status,
        tags: parsedTags,
      }
      const { error } = await supabase.from("ideas").update(payload).eq("id", selectedIdea.id)
      if (error) {
        const retry = await supabase
          .from("ideas")
          .update({
            title: cleanTitle,
            summary: cleanSummary,
            category: editIdeaForm.category,
            difficulty: editIdeaForm.difficulty,
          })
          .eq("id", selectedIdea.id)
        if (retry.error) throw retry.error
      }

      const updated: IdeaBankItem = { ...selectedIdea, ...payload }
      setIdeas((prev) => prev.map((i) => (i.id === selectedIdea.id ? updated : i)))
      setSelectedIdea(updated)
      setIsEditingIdea(false)
      showBanner("success", `Updated idea "${cleanTitle}".`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to update idea.")
    } finally {
      setSavingIdeaEdit(false)
    }
  }

  const handleAddCompetition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!compForm.title.trim() || !compForm.organizer.trim()) {
      showBanner("error", "Competition title and organizer are required.")
      return
    }

    setSubmittingCompetition(true)
    try {
      const payload = {
        title: compForm.title.trim(),
        organizer: compForm.organizer.trim(),
        status_badge: compForm.status_badge,
        category: compForm.category.trim(),
        jenjang: compForm.jenjang.trim(),
        level: compForm.level,
        schedule_type: compForm.schedule_type,
        location: compForm.location.trim(),
        fee_label: compForm.fee_label.trim() || null,
        official_url: compForm.official_url.trim() || null,
        start_date: compForm.start_date || null,
        deadline: compForm.deadline || null,
        description: compForm.description.trim() || null,
      }

      const { error } = await supabase.from("competitions").insert([payload])
      if (error) {
        const fallback = { ...payload }
        delete (fallback as { start_date?: string | null }).start_date
        const retry = await supabase.from("competitions").insert([fallback])
        if (retry.error) throw retry.error
      }

      setCompForm((prev) => ({
        ...prev,
        title: "",
        organizer: "",
        official_url: "",
        start_date: "",
        deadline: "",
        description: "",
      }))
      setShowAddCompetitionForm(false)
      await loadAllAdminData()
      showBanner("success", `"${payload.title}" added to Student Competition Target.`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to add competition.")
    } finally {
      setSubmittingCompetition(false)
    }
  }

  const handleSaveCompetitionEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCompetition) return
    if (!editCompForm.title.trim() || !editCompForm.organizer.trim()) {
      showBanner("error", "Competition title and organizer are required.")
      return
    }

    setSavingCompEdit(true)
    try {
      const payload = {
        title: editCompForm.title.trim(),
        organizer: editCompForm.organizer.trim(),
        status_badge: editCompForm.status_badge,
        category: editCompForm.category.trim(),
        jenjang: editCompForm.jenjang.trim(),
        level: editCompForm.level,
        schedule_type: editCompForm.schedule_type,
        location: editCompForm.location.trim(),
        fee_label: editCompForm.fee_label.trim() || null,
        official_url: editCompForm.official_url.trim() || null,
        deadline: editCompForm.deadline || null,
        description: editCompForm.description.trim() || null,
      }

      const { error } = await supabase
        .from("competitions")
        .update(payload)
        .eq("id", editingCompetition.id)
      if (error) throw error

      const updated: CompetitionItem = { ...editingCompetition, ...payload }
      setCompetitions((prev) => prev.map((c) => (c.id === editingCompetition.id ? updated : c)))
      setEditingCompetition(null)
      showBanner("success", `Updated "${payload.title}".`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to update competition.")
    } finally {
      setSavingCompEdit(false)
    }
  }

  const handleDeleteAccount = async (acc: ProfileAccount) => {
    const label = getAccountDisplayName(acc)
    if (!window.confirm(`Remove profile for "${label}"?`)) return
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", acc.id)
      if (error) throw error
      setAccounts((prev) => prev.filter((item) => item.id !== acc.id))
      if (selectedAccount?.id === acc.id) {
        setSelectedAccount(null)
        setIsEditingAccount(false)
      }
      if (selectedStudentRowId === acc.id) setSelectedStudentRowId(null)
      if (selectedMentorRowId === acc.id) setSelectedMentorRowId(null)
      showBanner("success", `Removed "${label}".`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to remove account.")
    }
  }

  const handleDeleteIdea = async (idea: IdeaBankItem) => {
    if (!window.confirm(`Delete "${idea.title}" from Idea Bank?`)) return
    try {
      const { error } = await supabase.from("ideas").delete().eq("id", idea.id)
      if (error) throw error
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
      if (selectedIdea?.id === idea.id) {
        setSelectedIdea(null)
        setIsEditingIdea(false)
      }
      showBanner("success", `Deleted "${idea.title}".`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to delete idea.")
    }
  }

  const handleDeleteCompetition = async (comp: CompetitionItem) => {
    if (!window.confirm(`Remove "${comp.title}" from Competition Calendar?`)) return
    try {
      const { error } = await supabase.from("competitions").delete().eq("id", comp.id)
      if (error) throw error
      setCompetitions((prev) => prev.filter((c) => c.id !== comp.id))
      if (editingCompetition?.id === comp.id) setEditingCompetition(null)
      showBanner("success", `Removed "${comp.title}".`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to remove competition.")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    router.replace("/login")
  }

  const filteredAndSortedAccounts = useMemo(() => {
    const filtered = accounts.filter((acc) => {
      const role = String(acc.role || "student").toLowerCase()
      if (accountFilter === "mentor" && role !== "mentor") return false
      if (accountFilter === "student" && (role === "mentor" || role === "admin")) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      const nameA = getAccountDisplayName(a).toLowerCase()
      const nameB = getAccountDisplayName(b).toLowerCase()
      const cmp = nameA.localeCompare(nameB, "id", { sensitivity: "base" })
      return alphaSort === "asc" ? cmp : -cmp
    })
  }, [accounts, accountFilter, alphaSort])

  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      const isCompleted = String(idea.status || "").toLowerCase().includes("complet")
      if (ideaStatusFilter === "completed") return isCompleted
      if (ideaStatusFilter === "active") return !isCompleted
      return true
    })
  }, [ideas, ideaStatusFilter])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    for (const c of competitions) {
      const d = c.deadline || c.start_date
      if (d && d.length >= 7) months.add(d.slice(0, 7))
    }
    return Array.from(months).sort()
  }, [competitions])

  const filteredCompetitions = useMemo(() => {
    if (selectedMonth === "all") return competitions
    return competitions.filter((c) => {
      const d = c.deadline || c.start_date
      return d && d.startsWith(selectedMonth)
    })
  }, [competitions, selectedMonth])

  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, CompetitionItem[]>()
    for (const comp of filteredCompetitions) {
      const rawDate = (comp.deadline || comp.start_date || "").slice(0, 10)
      if (!rawDate) continue
      const arr = map.get(rawDate) || []
      arr.push(comp)
      map.set(rawDate, arr)
    }
    return map
  }, [filteredCompetitions])

  const buildMonthGrid = useCallback(
    (year: number, monthIndex: number) => {
      const firstDay = new Date(year, monthIndex, 1)
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
      const startWeekday = firstDay.getDay()

      const cells: Array<{
        dayNum: number | null
        dateKey: string | null
        events: CompetitionItem[]
      }> = []

      for (let i = 0; i < startWeekday; i++) {
        cells.push({ dayNum: null, dateKey: null, events: [] })
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dk = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
        cells.push({
          dayNum: d,
          dateKey: dk,
          events: eventsByDateMap.get(dk) || [],
        })
      }

      const monthLabel = firstDay.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })

      return { monthLabel, cells }
    },
    [eventsByDateMap]
  )

  const currentMonthGrid = useMemo(
    () => buildMonthGrid(calendarCursor.year, calendarCursor.month),
    [buildMonthGrid, calendarCursor.month, calendarCursor.year]
  )

  const fullYearGrids = useMemo(() => {
    return Array.from({ length: 12 }, (_, mIdx) => ({
      monthIndex: mIdx,
      ...buildMonthGrid(calendarCursor.year, mIdx),
    }))
  }, [buildMonthGrid, calendarCursor.year])

  const handleStepCalendarMonth = (delta: number) => {
    setCalendarCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const recentMentorActivities = useMemo(() => {
    const items: Array<{
      id: string
      mentorName: string
      mentorCode: string
      badgeText: string
      title: string
      detail: string
      timestamp: string
      rawTime: number
    }> = []

    for (const [mId, stuIds] of Object.entries(mentorToStudents)) {
      if (!stuIds.length) continue
      const mentorAcc = accountById.get(mId)
      const mentorLabel = getAccountDisplayName(mentorAcc)
      const codeLabel = mentorAcc ? getDisplayMentorCode(mentorAcc) : "MENTOR"
      const studentNames = stuIds.map((id) => profileNameById.get(id) || "Student").join(", ")
      const ts = mentorAcc?.updated_at || mentorAcc?.created_at || ""

      items.push({
        id: `pair-${mId}`,
        mentorName: mentorLabel,
        mentorCode: codeLabel,
        badgeText: "Active Pairing",
        title: `Paired with ${stuIds.length} Student(s)`,
        detail: `Connected innovators: ${studentNames}`,
        timestamp: ts,
        rawTime: ts ? new Date(ts).getTime() : 0,
      })
    }

    for (const rep of mentorReports) {
      const mentorId = String(rep.mentor_id || "")
      const mentorAcc = mentorId ? accountById.get(mentorId) : undefined
      const mentorLabel =
        rep.mentor_name ||
        (mentorAcc ? getAccountDisplayName(mentorAcc) : "PLEGO Mentor")
      const codeLabel = mentorAcc ? getDisplayMentorCode(mentorAcc) : "EVALUATION"
      const ts = rep.created_at || ""

      items.push({
        id: `rep-${rep.id}`,
        mentorName: mentorLabel,
        mentorCode: codeLabel,
        badgeText: rep.status || "Evaluation Log",
        title: rep.project_title || "Mentor Evaluation Report",
        detail: rep.feedback || rep.message || "Mentoring evaluation recorded.",
        timestamp: ts,
        rawTime: ts ? new Date(ts).getTime() : 0,
      })
    }

    return items.sort((a, b) => b.rawTime - a.rawTime)
  }, [accountById, mentorReports, mentorToStudents, profileNameById])

  const navItems: Array<{ key: AdminNavKey; label: string; count?: number }> = [
    { key: "dashboard", label: "Dashboard" },
    { key: "users", label: "User Management", count: kpiStats.totalUsers },
    { key: "projects", label: "Projects", count: projects.length },
    { key: "portfolios", label: "Portfolios", count: portfolios.length },
    { key: "ideas", label: "Ideas", count: ideas.length },
    { key: "competitions", label: "Competitions", count: competitions.length },
    { key: "reports", label: "Mentor Reports", count: mentorReports.length },
  ]

  if (isCheckingAccess) {
    return (
      <div
        className={plusJakarta.className}
        style={{
          fontFamily: plusJakarta.style.fontFamily,
          minHeight: "100vh",
          backgroundColor: "#fffdfa",
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
          Loading Admin Console...
        </p>
      </div>
    )
  }

  return (
    <div
      className={plusJakarta.className}
      style={{
        fontFamily: plusJakarta.style.fontFamily,
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#fffdfa",
        color: "#0f172a",
        display: "flex",
        flexDirection: isDesktop ? "row" : "column",
        alignItems: "flex-start",
        // "clip" instead of "hidden": hidden turns this wrapper into a scroll
        // container, which stops the sticky header from sticking.
        overflowX: "clip",
      }}
    >
      <style>{ADMIN_MOTION_CSS}</style>
      {/* SIDEBAR */}
      <aside
        style={{
          width: isDesktop ? 240 : "100%",
          minWidth: isDesktop ? 240 : undefined,
          maxWidth: isDesktop ? 240 : "100%",
          flexShrink: 0,
          backgroundColor: "#ffffff",
          borderRight: isDesktop ? "1px solid #ebdcd0" : "none",
          borderBottom: isDesktop ? "none" : "1px solid #ebdcd0",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          // Desktop: pin the sidebar to the viewport so it stays put while the
          // main content scrolls. Mobile: normal stacked block on top.
          ...(isDesktop
            ? {
                position: "sticky" as const,
                top: 0,
                alignSelf: "flex-start",
                height: "100vh",
                overflowY: "auto" as const,
              }
            : { alignSelf: "stretch" }),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 0" }}>
            <Image
              src="/InnovaSeed-Logo.png"
              alt="InnovaSeed Logo"
              width={36}
              height={36}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                objectFit: "cover",
                flexShrink: 0,
              }}
              priority
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 14, color: "#0f172a" }}>InnovaSeed v2</b>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 6,
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                  }}
                >
                  Admin
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>PLEGO Indonesia</p>
            </div>
          </div>

          <nav aria-label="Admin Navigation" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => {
              const active = activeNav === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  className="adm-nav-btn"
                  data-active={active}
                  onClick={() => {
                    setActiveNav(item.key)
                    setGlobalSearch("")
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    backgroundColor: active ? "#f59e0b" : "transparent",
                    color: active ? "#090d16" : "#475569",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <NavIcon name={item.key} />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === "number" && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: active ? "rgba(0,0,0,0.12)" : "#f1f5f9",
                        color: active ? "#090d16" : "#475569",
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 12,
            borderTop: "1px solid #f3e8df",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 12,
          }}
        >
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #f2e7de",
              backgroundColor: "#fffdfa",
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
                color: "#090d16",
                fontWeight: 700,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {adminName.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>{adminName}</p>
              <p style={{ fontSize: 10, color: "#64748b", margin: 0 }}>
                {adminEmail || "PLEGO Admin"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <a
              href={PLEGO_ADMIN_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #ebdcd0",
                backgroundColor: "#fff8f4",
                color: "#334155",
                fontWeight: 600,
                fontSize: 11,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #fecaca",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                fontWeight: 600,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div
        style={{
          width: isDesktop ? "calc(100% - 240px)" : "100%",
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          alignSelf: "stretch",
          backgroundColor: "#fffdfa",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #ebdcd0",
            padding: "12px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1152,
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                maxWidth: 440,
                borderRadius: 12,
                border: "1px solid #ebdcd0",
                backgroundColor: "#fffdfa",
                padding: "8px 12px",
                gap: 8,
              }}
            >
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search anything: users, projects, ideas, competitions, reports..."
                aria-label="Global admin search"
                style={{
                  width: "100%",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: 12,
                  color: "#1e293b",
                  outline: "none",
                }}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch("")}
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    fontSize: 11,
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => void loadAllAdminData()}
                style={{
                  padding: "6px 12px",
                  borderRadius: 12,
                  border: "1px solid #ebdcd0",
                  backgroundColor: "#fffdfa",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  border: "1px solid #ebdcd0",
                  backgroundColor: "#fff8f4",
                  padding: "4px 12px 4px 6px",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    color: "#090d16",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {adminName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    {adminName}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#b45309", margin: 0 }}>
                    ADMIN
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1152, margin: "0 auto", padding: "20px 24px" }}>
          {banner && (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 16,
                border: banner.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca",
                backgroundColor: banner.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: banner.type === "success" ? "#065f46" : "#b91c1c",
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{banner.message}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {globalSearchResults && (
            <section
              style={{
                marginBottom: 20,
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #fcd34d",
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Global Search Results ({globalSearchResults.totalHits})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Matches across Users, Projects, Portfolios, Ideas, Competitions, and Mentor Reports for &ldquo;{globalSearch}&rdquo;
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalSearch("")}
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#b45309",
                    cursor: "pointer",
                  }}
                >
                  Clear Search
                </button>
              </div>

              {globalSearchResults.totalHits === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 16 }}>
                  No matching records found across the platform.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                  {globalSearchResults.matchedAccounts.map((acc) => (
                    <button
                      key={`gs-acc-${acc.id}`}
                      type="button"
                      onClick={() => openAccountModal(acc, false)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 4px",
                        border: "none",
                        borderBottom: "1px solid #f5ece5",
                        backgroundColor: "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#065f46" }}>
                          USER • {acc.role || "student"}
                        </span>
                        <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                          {getAccountDisplayName(acc)}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{acc.email}</span>
                    </button>
                  ))}

                  {globalSearchResults.matchedProjects.map((proj) => (
                    <button
                      key={`gs-proj-${proj.id}`}
                      type="button"
                      onClick={() => {
                        setActiveNav("projects")
                        setGlobalSearch("")
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 4px",
                        border: "none",
                        borderBottom: "1px solid #f5ece5",
                        backgroundColor: "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#3730a3" }}>
                          PROJECT
                        </span>
                        <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                          {proj.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {proj.category || "Innovation Workspace"}
                      </span>
                    </button>
                  ))}

                  {globalSearchResults.matchedIdeas.map((idea) => (
                    <button
                      key={`gs-idea-${idea.id}`}
                      type="button"
                      onClick={() => {
                        setActiveNav("ideas")
                        setGlobalSearch("")
                        openIdeaModal(idea, false)
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 4px",
                        border: "none",
                        borderBottom: "1px solid #f5ece5",
                        backgroundColor: "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e" }}>
                          IDEA BANK
                        </span>
                        <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                          {idea.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {idea.category || idea.research_field || "Prompt"}
                      </span>
                    </button>
                  ))}

                  {globalSearchResults.matchedCompetitions.map((comp) => (
                    <button
                      key={`gs-comp-${comp.id}`}
                      type="button"
                      onClick={() => {
                        setActiveNav("competitions")
                        setGlobalSearch("")
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 4px",
                        border: "none",
                        borderBottom: "1px solid #f5ece5",
                        backgroundColor: "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#6b21a8" }}>
                          COMPETITION
                        </span>
                        <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                          {comp.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {comp.organizer || "Organizer"}
                      </span>
                    </button>
                  ))}

                  {globalSearchResults.matchedPortfolios.map((pt) => (
                    <button
                      key={`gs-port-${pt.id}`}
                      type="button"
                      onClick={() => {
                        setActiveNav("portfolios")
                        setGlobalSearch("")
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 4px",
                        border: "none",
                        borderBottom: "1px solid #f5ece5",
                        backgroundColor: "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#115e59" }}>
                          PORTFOLIO
                        </span>
                        <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                          {pt.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {pt.student_name || "Student"}
                      </span>
                    </button>
                  ))}

                  {globalSearchResults.matchedReports.map((rep) => (
                    <button
                      key={`gs-rep-${rep.id}`}
                      type="button"
                      onClick={() => {
                        setActiveNav("reports")
                        setGlobalSearch("")
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 4px",
                        border: "none",
                        borderBottom: "1px solid #f5ece5",
                        backgroundColor: "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#9f1239" }}>
                          MENTOR REPORT
                        </span>
                        <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0" }}>
                          {rep.project_title || "Mentor Evaluation"}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        By {rep.mentor_name || "Mentor"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <div key={activeNav} className="adm-page-enter">
          {/* DASHBOARD */}
          {activeNav === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <section
                className="adm-fade-up"
                style={{
                  borderRadius: 16,
                  border: "1px solid #ebdcd0",
                  background: "linear-gradient(90deg, #fff8ec 0%, #ffffff 60%, #fffdf7 100%)",
                  padding: 18,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                    }}
                  >
                    Hi, {adminName.split(" ")[0]} 👋
                  </span>
                  <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "4px 0 2px" }}>
                    Welcome back, {adminName}!
                  </h1>
                  <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                    {referenceNowMs
                      ? new Date(referenceNowMs).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        }) + " · "
                      : ""}
                    Here is what changed on the platform and what needs you.
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={() => setActiveNav("users")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 12,
                      border: "none",
                      backgroundColor: "#f59e0b",
                      color: "#090d16",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Manage Users
                  </button>
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={() => setActiveNav("competitions")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      backgroundColor: "#ffffff",
                      color: "#1e293b",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Competition Schedule
                  </button>
                </div>
              </section>

              {/* HEADLINE NUMBERS: 4 cards instead of 7 overlapping tiles */}
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: 12,
                  }}
                >
                  {[
                    {
                      key: "users",
                      label: "Total Users",
                      value: kpiStats.totalUsers,
                      sub: `${kpiStats.studentCount} students · ${kpiStats.mentorCount} mentors`,
                      accent: "#d97706",
                      tint: "#fef3c7",
                      onClick: () => {
                        setActiveNav("users")
                        setAccountFilter("all")
                        setActiveDirectoryPanel(null)
                      },
                      icon: "users" as AdminNavKey,
                    },
                    {
                      key: "active",
                      label: "Active Today",
                      value: kpiStats.activeTodayCount,
                      sub: `${kpiStats.active7DaysCount} active in the last 7 days`,
                      accent: "#0f766e",
                      tint: "#ccfbf1",
                      live: true,
                      icon: "dashboard" as AdminNavKey,
                    },
                    {
                      key: "projects",
                      label: "Active Projects",
                      value: kpiStats.activeProjectsCount,
                      sub: "Not archived or cancelled",
                      accent: "#4338ca",
                      tint: "#e0e7ff",
                      onClick: () => setActiveNav("projects"),
                      icon: "projects" as AdminNavKey,
                    },
                    {
                      key: "connections",
                      label: "Mentor Connections",
                      value: kpiStats.mentorConnectionsCount,
                      sub: "Students linked to a mentor",
                      accent: "#0369a1",
                      tint: "#e0f2fe",
                      onClick: () => {
                        setActiveNav("users")
                        setActiveDirectoryPanel("mentors")
                      },
                      icon: "portfolios" as AdminNavKey,
                    },
                  ].map((card, idx) => {
                    const cardStyle: CSSProperties = {
                      ...admDelay(idx * 70),
                      textAlign: "left",
                      backgroundColor: "#ffffff",
                      borderRadius: 16,
                      border: "1px solid #ebdcd0",
                      padding: "14px 16px",
                      cursor: card.onClick ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }
                    const cardBody = (
                      <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{card.label}</span>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 10,
                              backgroundColor: card.tint,
                              color: card.accent,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <NavIcon name={card.icon} />
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                            <CountUp value={card.value} />
                          </span>
                          {card.live && (
                            <span
                              className="adm-live-dot"
                              aria-hidden="true"
                              style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }}
                            />
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{card.sub}</span>
                      </>
                    )
                    return card.onClick ? (
                      <button
                        key={card.key}
                        type="button"
                        onClick={card.onClick}
                        className="adm-fade-up adm-lift"
                        style={cardStyle}
                      >
                        {cardBody}
                      </button>
                    ) : (
                      <div key={card.key} className="adm-fade-up" style={cardStyle}>
                        {cardBody}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* NEEDS ATTENTION: what the admin can act on right now */}
              <section
                className="adm-fade-up"
                style={
                  {
                    ...admDelay(300),
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: "1px solid #ebdcd0",
                    padding: 18,
                  } as CSSProperties
                }
              >
                <div style={{ marginBottom: 12 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Needs your attention</h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Things that are waiting on an admin. Click one to jump straight to it.
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    {
                      key: "pending",
                      label: "Projects awaiting approval",
                      count: attentionStats.pendingProjects,
                      go: () => setActiveNav("projects"),
                    },
                    {
                      key: "deadlines",
                      label: "Competitions closing in 14 days",
                      count: attentionStats.closingSoon,
                      go: () => setActiveNav("competitions"),
                    },
                    {
                      key: "idle-mentors",
                      label: "Mentors with no students",
                      count: attentionStats.mentorsWithoutStudents,
                      go: () => {
                        setActiveNav("users")
                        setActiveDirectoryPanel("mentors")
                      },
                    },
                    {
                      key: "idle-students",
                      label: "Students without a mentor",
                      count: attentionStats.studentsWithoutMentor,
                      go: () => {
                        setActiveNav("users")
                        setActiveDirectoryPanel("students")
                      },
                    },
                  ].map((item, idx) => {
                    const hasWork = item.count > 0
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={item.go}
                        className="adm-lift adm-pop"
                        style={
                          {
                            ...admDelay(360 + idx * 60),
                            textAlign: "left",
                            borderRadius: 12,
                            border: `1px solid ${hasWork ? "#fde68a" : "#f2e7de"}`,
                            backgroundColor: hasWork ? "#fffbeb" : "#fffdfa",
                            padding: "12px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          } as CSSProperties
                        }
                      >
                        <span
                          style={{
                            minWidth: 34,
                            height: 34,
                            borderRadius: 10,
                            backgroundColor: hasWork ? "#f59e0b" : "#f1f5f9",
                            color: hasWork ? "#090d16" : "#94a3b8",
                            fontSize: 14,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {hasWork ? item.count : "✓"}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: hasWork ? "#92400e" : "#64748b" }}>
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop ? "1.15fr 1fr" : "1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <section
                  className="adm-fade-up"
                  style={{
                    ...admDelay(520),
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: "1px solid #ebdcd0",
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        Active Users Overview (Last {overviewRangeDays} Days)
                      </h2>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Daily active students &amp; mentors across the past {overviewRangeDays} days.
                      </p>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        borderRadius: 999,
                        backgroundColor: "#fef3c7",
                        padding: 2,
                        gap: 2,
                      }}
                    >
                      {([7, 14, 30] as const).map((daysOpt) => {
                        const activeOpt = overviewRangeDays === daysOpt
                        return (
                          <button
                            key={daysOpt}
                            type="button"
                            onClick={() => setOverviewRangeDays(daysOpt)}
                            style={{
                              border: "none",
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              backgroundColor: activeOpt ? "#f59e0b" : "transparent",
                              color: activeOpt ? "#090d16" : "#92400e",
                            }}
                          >
                            {daysOpt}d
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid #f2e7de",
                      backgroundColor: "#fffdfa",
                      padding: 12,
                      overflowX: "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${activityAnalytics.chartSeries.length}, minmax(${
                          overviewRangeDays === 30 ? 22 : overviewRangeDays === 14 ? 32 : 44
                        }px, 1fr))`,
                        gap: overviewRangeDays === 30 ? 3 : 6,
                        alignItems: "end",
                        height: 144,
                        paddingTop: 12,
                      }}
                    >
                      {activityAnalytics.chartSeries.map((day) => {
                        const pct = Math.max(
                          12,
                          Math.round((day.count / activityAnalytics.maxChartCount) * 100)
                        )
                        return (
                          <div
                            key={day.key}
                            title={`${day.shortDate}: ${day.count} active user(s)`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              height: "100%",
                              gap: 4,
                              minWidth: 0,
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#334155" }}>
                              {day.count}
                            </span>
                            <div
                              style={{
                                width: "100%",
                                maxWidth: 26,
                                height: 74,
                                backgroundColor: "rgba(254, 243, 199, 0.75)",
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "flex-end",
                                padding: 2,
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: `${day.count === 0 ? 10 : pct}%`,
                                  borderRadius: 3,
                                  backgroundColor: day.count > 0 ? "#f59e0b" : "#cbd5e1",
                                }}
                              />
                            </div>
                            <div style={{ textAlign: "center", width: "100%" }}>
                              <p
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: "#334155",
                                  margin: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {day.label}
                              </p>
                              {overviewRangeDays <= 14 && (
                                <p
                                  style={{
                                    fontSize: 9,
                                    color: "#94a3b8",
                                    margin: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {day.shortDate}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>Active Today</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: "#ccfbf1",
                            color: "#115e59",
                          }}
                        >
                          {activityAnalytics.activeTodayUsers.length}
                        </span>
                      </div>
                      {activityAnalytics.activeTodayUsers.length === 0 ? (
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                          No activity recorded today yet.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {activityAnalytics.activeTodayUsers.slice(0, 6).map((u) => (
                            <button
                              key={`today-${u.id}`}
                              type="button"
                              onClick={() => openAccountModal(u, false)}
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                padding: "2px 8px",
                                borderRadius: 8,
                                backgroundColor: "#ffffff",
                                border: "1px solid #ebdcd0",
                                color: "#1e293b",
                                cursor: "pointer",
                              }}
                            >
                              {getAccountDisplayName(u)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>
                          Active Last {overviewRangeDays}d
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: "#ede9fe",
                            color: "#5b21b6",
                          }}
                        >
                          {activityAnalytics.activeWindowUsers.length}
                        </span>
                      </div>
                      {activityAnalytics.activeWindowUsers.length === 0 ? (
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                          No activity in the last {overviewRangeDays} days.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {activityAnalytics.activeWindowUsers.slice(0, 6).map((u) => (
                            <button
                              key={`win-${u.id}`}
                              type="button"
                              onClick={() => openAccountModal(u, false)}
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                padding: "2px 8px",
                                borderRadius: 8,
                                backgroundColor: "#ffffff",
                                border: "1px solid #ebdcd0",
                                color: "#1e293b",
                                cursor: "pointer",
                              }}
                            >
                              {getAccountDisplayName(u)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section
                  className="adm-fade-up"
                  style={{
                    ...admDelay(610),
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: "1px solid #ebdcd0",
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        Activity Logs (Last 7 Days)
                      </h2>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Student, mentor, and registration logs from the last 7 days.
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                      }}
                    >
                      {last7DaysLogs.length} Logs
                    </span>
                  </div>

                  {loadingData ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                      Loading activity logs...
                    </p>
                  ) : last7DaysLogs.length === 0 ? (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px dashed #ebdcd0",
                        backgroundColor: "#fffdfa",
                        padding: 20,
                        textAlign: "center",
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      No activity logs recorded in the last 7 days.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        maxHeight: 360,
                        overflowY: "auto",
                        paddingRight: 4,
                      }}
                    >
                      {last7DaysLogs.slice(0, 15).map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #f2e7de",
                            backgroundColor: "#fffdfa",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor:
                                  log.actorRole === "Mentor"
                                    ? "#fef3c7"
                                    : log.actorRole === "Admin"
                                    ? "#ede9fe"
                                    : "#d1fae5",
                                color:
                                  log.actorRole === "Mentor"
                                    ? "#92400e"
                                    : log.actorRole === "Admin"
                                    ? "#5b21b6"
                                    : "#065f46",
                              }}
                            >
                              {log.actorRole}
                            </span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>
                              {formatRelativeTime(log.timestamp, referenceNowMs)}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "6px 0 2px" }}>
                            {log.actorName}
                          </p>
                          <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                            {log.action}: <b style={{ color: "#1e293b" }}>{log.targetTitle}</b>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {activeNav === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveDirectoryPanel(null)
                    setSelectedStudentRowId(null)
                    setSelectedMentorRowId(null)
                    setAccountFilter("all")
                  }}
                  style={{
                    textAlign: "left",
                    backgroundColor: activeDirectoryPanel === null ? "#fffaf0" : "#ffffff",
                    borderRadius: 14,
                    border: activeDirectoryPanel === null ? "1px solid #f59e0b" : "1px solid #ebdcd0",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", margin: 0 }}>
                    Total Users
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "4px 0 0" }}>
                    {kpiStats.totalUsers}
                  </p>
                  <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0" }}>
                    All registered accounts in list below
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDirectoryPanel((prev) => (prev === "students" ? null : "students"))
                    setSelectedMentorRowId(null)
                  }}
                  style={{
                    textAlign: "left",
                    backgroundColor: activeDirectoryPanel === "students" ? "#ecfdf5" : "#ffffff",
                    borderRadius: 14,
                    border:
                      activeDirectoryPanel === "students" ? "1px solid #10b981" : "1px solid #ebdcd0",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", margin: 0 }}>
                      Students
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                      }}
                    >
                      {activeDirectoryPanel === "students" ? "Hide List" : "Click to View"}
                    </span>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#047857", margin: "4px 0 0" }}>
                    {kpiStats.studentCount}
                  </p>
                  <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0" }}>
                    Grid list of students, projects, competitions &amp; mentor
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDirectoryPanel((prev) => (prev === "mentors" ? null : "mentors"))
                    setSelectedStudentRowId(null)
                  }}
                  style={{
                    textAlign: "left",
                    backgroundColor: activeDirectoryPanel === "mentors" ? "#fffbeb" : "#ffffff",
                    borderRadius: 14,
                    border:
                      activeDirectoryPanel === "mentors" ? "1px solid #f59e0b" : "1px solid #ebdcd0",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", margin: 0 }}>
                      Mentors
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: "#fef3c7",
                        color: "#92400e",
                      }}
                    >
                      {activeDirectoryPanel === "mentors" ? "Hide List" : "Click to View"}
                    </span>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#d97706", margin: "4px 0 0" }}>
                    {kpiStats.mentorCount}
                  </p>
                  <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0" }}>
                    Grid list of mentor codes &amp; connected students
                  </p>
                </button>
              </div>

              {/* STUDENTS GRID LIST */}
              {activeDirectoryPanel === "students" && (
                <section
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: "1px solid #ebdcd0",
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        Students List ({studentAccounts.length})
                      </h3>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Click a student row to inspect role, active projects, joined competitions, and mentor.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDirectoryPanel(null)
                        setSelectedStudentRowId(null)
                      }}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#64748b",
                        cursor: "pointer",
                      }}
                    >
                      Close ✕
                    </button>
                  </div>

                  {studentAccounts.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      No student accounts found.
                    </p>
                  ) : (
                    <div
                      style={{
                        borderTop: "1px solid #f2e7de",
                        borderBottom: "1px solid #f2e7de",
                        maxHeight: 320,
                        overflowY: "auto",
                      }}
                    >
                      {studentAccounts.map((stu, idx) => {
                        const isPicked = selectedStudentRowId === stu.id
                        const details = getStudentActivitySummary(stu)
                        return (
                          <div
                            key={`stu-row-${stu.id}`}
                            style={{
                              borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                              backgroundColor: isPicked ? "#fffdf7" : "transparent",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedStudentRowId((prev) => (prev === stu.id ? null : stu.id))
                              }
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "11px 8px",
                                border: "none",
                                backgroundColor: "transparent",
                                display: "grid",
                                gridTemplateColumns: isDesktop
                                  ? "minmax(180px, 1.4fr) minmax(140px, 1.2fr) minmax(130px, 1fr) auto"
                                  : "1fr auto",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                {getAccountDisplayName(stu)}
                              </span>
                              {isDesktop && (
                                <span style={{ fontSize: 11, color: "#64748b" }}>
                                  {stu.institution || "School not specified"}
                                </span>
                              )}
                              {isDesktop && (
                                <span style={{ fontSize: 11, color: "#475569" }}>
                                  {details.projects.length} project • {details.competitions.length} comp
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: isPicked ? "#b45309" : "#047857",
                                }}
                              >
                                {isPicked ? "Hide ▲" : "Details ▼"}
                              </span>
                            </button>

                            {isPicked && (
                              <div
                                style={{
                                  padding: "10px 12px 14px",
                                  backgroundColor: "#fffaf2",
                                  borderTop: "1px dashed #fde68a",
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                                  gap: 12,
                                  fontSize: 11,
                                }}
                              >
                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", margin: 0 }}>
                                    ROLE &amp; MENTOR
                                  </p>
                                  <p style={{ color: "#0f172a", margin: "4px 0 0" }}>
                                    Role: <b>{String(stu.role || "student").toUpperCase()}</b>
                                  </p>
                                  <p style={{ color: "#0f172a", margin: "2px 0 0" }}>
                                    Mentor:{" "}
                                    <b>
                                      {details.mentorNames.length > 0
                                        ? details.mentorNames.join(", ")
                                        : "Unassigned"}
                                    </b>
                                  </p>
                                </div>

                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", margin: 0 }}>
                                    CURRENT PROJECTS ({details.projects.length})
                                  </p>
                                  {details.projects.length === 0 ? (
                                    <p style={{ color: "#94a3b8", margin: "4px 0 0" }}>
                                      No active project recorded.
                                    </p>
                                  ) : (
                                    <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                                      {details.projects.map((proj) => (
                                        <li key={proj.id} style={{ color: "#0f172a", marginBottom: 2 }}>
                                          {proj.title}
                                          {proj.status ? ` (${proj.status})` : ""}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                <div>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", margin: 0 }}>
                                    COMPETITIONS JOINED ({details.competitions.length})
                                  </p>
                                  {details.competitions.length === 0 ? (
                                    <p style={{ color: "#94a3b8", margin: "4px 0 0" }}>
                                      No competition linked yet.
                                    </p>
                                  ) : (
                                    <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                                      {details.competitions.map((compName) => (
                                        <li key={compName} style={{ color: "#0f172a", marginBottom: 2 }}>
                                          {compName}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => openAccountModal(stu, true)}
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: 8,
                                      border: "1px solid #ebdcd0",
                                      backgroundColor: "#ffffff",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "#334155",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Edit Profile
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* MENTORS GRID LIST */}
              {activeDirectoryPanel === "mentors" && (
                <section
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: "1px solid #ebdcd0",
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        Mentors List ({mentorAccounts.length})
                      </h3>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Click a mentor row to inspect their mentor code and connected students.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDirectoryPanel(null)
                        setSelectedMentorRowId(null)
                      }}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#64748b",
                        cursor: "pointer",
                      }}
                    >
                      Close ✕
                    </button>
                  </div>

                  {mentorAccounts.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      No mentor accounts found.
                    </p>
                  ) : (
                    <div
                      style={{
                        borderTop: "1px solid #f2e7de",
                        borderBottom: "1px solid #f2e7de",
                        maxHeight: 320,
                        overflowY: "auto",
                      }}
                    >
                      {mentorAccounts.map((mtr, idx) => {
                        const isPicked = selectedMentorRowId === mtr.id
                        const code = getDisplayMentorCode(mtr)
                        const connectedIds = mentorToStudents[mtr.id] || []
                        return (
                          <div
                            key={`mtr-row-${mtr.id}`}
                            style={{
                              borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                              backgroundColor: isPicked ? "#fffdf7" : "transparent",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedMentorRowId((prev) => (prev === mtr.id ? null : mtr.id))
                              }
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "11px 8px",
                                border: "none",
                                backgroundColor: "transparent",
                                display: "grid",
                                gridTemplateColumns: isDesktop
                                  ? "minmax(180px, 1.4fr) minmax(130px, 1fr) minmax(130px, 1fr) auto"
                                  : "1fr auto",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                {getAccountDisplayName(mtr)}
                              </span>
                              {isDesktop && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e" }}>
                                  {code}
                                </span>
                              )}
                              {isDesktop && (
                                <span style={{ fontSize: 11, color: "#475569" }}>
                                  {connectedIds.length} connected student(s)
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: isPicked ? "#b45309" : "#d97706",
                                }}
                              >
                                {isPicked ? "Hide ▲" : "Details ▼"}
                              </span>
                            </button>

                            {isPicked && (
                              <div
                                style={{
                                  padding: "10px 12px 14px",
                                  backgroundColor: "#fffaf2",
                                  borderTop: "1px dashed #fde68a",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  fontSize: 11,
                                }}
                              >
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div>
                                    <span style={{ color: "#64748b" }}>Mentor Code: </span>
                                    <b style={{ color: "#92400e" }}>{code}</b>
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyMentorCode(mtr)}
                                      style={{
                                        marginLeft: 8,
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        border: "1px solid #fde68a",
                                        backgroundColor: "#ffffff",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "#78350f",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {copiedMentorId === mtr.id ? "Copied!" : "Copy Code"}
                                    </button>
                                  </div>
                                  <div>
                                    <span style={{ color: "#64748b" }}>Connected Students: </span>
                                    {connectedIds.length === 0 ? (
                                      <span style={{ color: "#94a3b8" }}>None yet</span>
                                    ) : (
                                      <b style={{ color: "#0f172a" }}>
                                        {connectedIds
                                          .map((stuId) => profileNameById.get(stuId) || "Student")
                                          .join(", ")}
                                      </b>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openAccountModal(mtr, true)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 8,
                                    border: "1px solid #ebdcd0",
                                    backgroundColor: "#ffffff",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#334155",
                                    cursor: "pointer",
                                  }}
                                >
                                  Edit Profile
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )}

              <section
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #ebdcd0",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      User Management ({filteredAndSortedAccounts.length})
                    </h2>
                    <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                      Scrollable frame (~4 users visible) showing Full Name, Email, Institution, and Edit action.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        borderRadius: 12,
                        backgroundColor: "#fff8f4",
                        border: "1px solid #ebdcd0",
                        padding: 3,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {(["all", "student", "mentor"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setAccountFilter(tab)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "none",
                            textTransform: "capitalize",
                            cursor: "pointer",
                            backgroundColor: accountFilter === tab ? "#f59e0b" : "transparent",
                            color: accountFilter === tab ? "#090d16" : "#475569",
                            fontWeight: accountFilter === tab ? 700 : 600,
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <select
                      aria-label="Sort users alphabetically"
                      value={alphaSort}
                      onChange={(e) => setAlphaSort(e.target.value as AlphaSort)}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#fffdfa",
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      <option value="asc">Name: A → Z</option>
                      <option value="desc">Name: Z → A</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowAddMentorForm((prev) => !prev)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#f59e0b",
                        color: "#090d16",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {showAddMentorForm ? "Close Form" : "+ Add New Mentor"}
                    </button>
                  </div>
                </div>

                {showAddMentorForm && (
                  <form
                    onSubmit={handleCreateMentor}
                    style={{
                      borderRadius: 16,
                      border: "1px solid #fcd34d",
                      backgroundColor: "#fffaf2",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    <b style={{ color: "#0f172a" }}>New Mentor Account</b>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <input
                        type="text"
                        required
                        value={mentorForm.fullName}
                        onChange={(e) => setMentorForm({ ...mentorForm, fullName: e.target.value })}
                        placeholder="Full Name *"
                        style={{
                          borderRadius: 12,
                          border: "1px solid #ebdcd0",
                          backgroundColor: "#ffffff",
                          padding: "8px 12px",
                        }}
                      />
                      <input
                        type="email"
                        required
                        value={mentorForm.email}
                        onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })}
                        placeholder="Email *"
                        style={{
                          borderRadius: 12,
                          border: "1px solid #ebdcd0",
                          backgroundColor: "#ffffff",
                          padding: "8px 12px",
                        }}
                      />
                      <div style={{ position: "relative" }}>
                        <input
                          type={showMentorPassword ? "text" : "password"}
                          value={mentorForm.password}
                          onChange={(e) =>
                            setMentorForm({ ...mentorForm, password: e.target.value })
                          }
                          placeholder="Login Password (min. 6)"
                          minLength={6}
                          style={{
                            width: "100%",
                            borderRadius: 12,
                            border: "1px solid #ebdcd0",
                            backgroundColor: "#ffffff",
                            padding: "8px 34px 8px 12px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowMentorPassword((prev) => !prev)}
                          title={showMentorPassword ? "Hide password" : "Show password"}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          <i
                            className={`fa-solid ${showMentorPassword ? "fa-eye-slash" : "fa-eye"}`}
                          ></i>
                        </button>
                      </div>
                      <input
                        type="tel"
                        value={mentorForm.phone}
                        onChange={(e) => setMentorForm({ ...mentorForm, phone: e.target.value })}
                        placeholder="Phone (+62...)"
                        style={{
                          borderRadius: 12,
                          border: "1px solid #ebdcd0",
                          backgroundColor: "#ffffff",
                          padding: "8px 12px",
                        }}
                      />
                      <input
                        type="text"
                        value={mentorForm.institution}
                        onChange={(e) =>
                          setMentorForm({ ...mentorForm, institution: e.target.value })
                        }
                        placeholder="Institution"
                        style={{
                          borderRadius: 12,
                          border: "1px solid #ebdcd0",
                          backgroundColor: "#ffffff",
                          padding: "8px 12px",
                        }}
                      />
                      <input
                        type="text"
                        value={mentorForm.mentorCode}
                        onChange={(e) =>
                          setMentorForm({ ...mentorForm, mentorCode: e.target.value })
                        }
                        placeholder="Mentor Code (Optional)"
                        style={{
                          borderRadius: 12,
                          border: "1px solid #ebdcd0",
                          backgroundColor: "#ffffff",
                          padding: "8px 12px",
                          textTransform: "uppercase",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setShowAddMentorForm(false)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 12,
                          border: "1px solid #ebdcd0",
                          backgroundColor: "#ffffff",
                          color: "#334155",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingMentor}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 12,
                          border: "none",
                          backgroundColor: "#f59e0b",
                          color: "#090d16",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {submittingMentor ? "Creating..." : "Create Mentor"}
                      </button>
                    </div>
                  </form>
                )}

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f2e7de",
                    backgroundColor: "#fffdfa",
                    maxHeight: 268,
                    overflowY: "auto",
                  }}
                >
                  {filteredAndSortedAccounts.map((acc, idx) => {
                    const role = String(acc.role || "student").toLowerCase()
                    const isMentor = role === "mentor"
                    const code = isMentor ? getDisplayMentorCode(acc) : null

                    return (
                      <div
                        key={acc.id}
                        style={{
                          padding: "13px 16px",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                            {getAccountDisplayName(acc)}
                          </p>
                          <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0" }}>
                            {acc.email || "-"}
                            {acc.institution ? ` • ${acc.institution}` : ""}
                          </p>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isMentor && code && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 6,
                                backgroundColor: "#fffbeb",
                                border: "1px solid #fde68a",
                                color: "#78350f",
                              }}
                            >
                              {code}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openAccountModal(acc, true)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: "1px solid #ebdcd0",
                              backgroundColor: "#ffffff",
                              color: "#334155",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "3px 10px",
                              borderRadius: 999,
                              backgroundColor:
                                role === "mentor"
                                  ? "#fef3c7"
                                  : role === "admin"
                                  ? "#ede9fe"
                                  : "#d1fae5",
                              color:
                                role === "mentor"
                                  ? "#92400e"
                                  : role === "admin"
                                  ? "#5b21b6"
                                  : "#065f46",
                            }}
                          >
                            {role}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}

          {/* PROJECTS */}
          {activeNav === "projects" && (
            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #ebdcd0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Student Innovation Projects ({projects.length})
                </h2>
                <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                  Active and ongoing student projects. Completed &amp; mentor-approved projects automatically move to Portfolios.
                </p>
              </div>

              {projects.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No active workspace projects right now.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                  {projects.map((proj, idx) => {
                    const ownerId = String(proj.user_id || proj.author_id || "")
                    const ownerMentors = (studentToMentors[ownerId] || [])
                      .map((mId) => profileNameById.get(mId))
                      .filter(Boolean)
                    return (
                      <div
                        key={proj.id}
                        style={{
                          padding: "13px 6px",
                          borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <b style={{ fontSize: 13, color: "#0f172a" }}>{proj.title}</b>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                              }}
                            >
                              {proj.status || "Active"}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>
                            {proj.summary || proj.description || proj.category || "Workspace project"}
                          </p>
                        </div>

                        <div style={{ textAlign: isDesktop ? "right" : "left", fontSize: 11, color: "#64748b" }}>
                          <p style={{ margin: 0, fontWeight: 600, color: "#334155" }}>
                            {profileNameById.get(ownerId) || "Student"}
                            {ownerMentors.length > 0 ? ` • Mentor: ${ownerMentors.join(", ")}` : ""}
                          </p>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>
                            {formatRelativeTime(proj.updated_at || proj.created_at, referenceNowMs)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* PORTFOLIOS */}
          {activeNav === "portfolios" && (
            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #ebdcd0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Student Digital Portfolios ({portfolios.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Completed &amp; mentor-approved innovation portfolios. Download PDF per portfolio or select multiple in bulk.
                  </p>
                </div>

                {portfolios.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkPortfolioMode((prev) => !prev)
                        setSelectedPortfolioIds([])
                      }}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 10,
                        border: "1px solid #ebdcd0",
                        backgroundColor: isBulkPortfolioMode ? "#fffbeb" : "#fffdfa",
                        color: "#334155",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {isBulkPortfolioMode ? "Cancel Bulk Select" : "Bulk Select"}
                    </button>

                    {isBulkPortfolioMode && selectedPortfolioIds.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleExportPortfoliosPdf(
                            portfolios.filter((p) =>
                              selectedPortfolioIds.includes(String(p.id))
                            )
                          )
                        }
                        style={{
                          padding: "7px 14px",
                          borderRadius: 10,
                          border: "none",
                          backgroundColor: "#f59e0b",
                          color: "#090d16",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Download Selected PDF ({selectedPortfolioIds.length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleExportPortfoliosPdf(portfolios)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 10,
                          border: "none",
                          backgroundColor: "#f59e0b",
                          color: "#090d16",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Download All PDF ({portfolios.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {portfolios.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No student portfolios published yet.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                  {portfolios.map((pt, idx) => {
                    const idStr = String(pt.id)
                    const isChecked = selectedPortfolioIds.includes(idStr)
                    return (
                      <div
                        key={pt.id}
                        style={{
                          padding: "13px 6px",
                          borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                          backgroundColor: isChecked ? "#fffaf0" : "transparent",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: "1 1 280px", minWidth: 0 }}>
                          {isBulkPortfolioMode && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setSelectedPortfolioIds((prev) =>
                                  prev.includes(idStr)
                                    ? prev.filter((item) => item !== idStr)
                                    : [...prev, idStr]
                                )
                              }
                              aria-label={`Select ${pt.title}`}
                              style={{ marginTop: 3 }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <b style={{ fontSize: 13, color: "#0f172a" }}>{pt.title}</b>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  backgroundColor: "#ccfbf1",
                                  color: "#115e59",
                                }}
                              >
                                {pt.status || "Completed"}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>
                              {pt.summary ||
                                pt.description ||
                                "Completed innovation project verified by mentor."}
                            </p>
                            <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
                              {pt.student_name ||
                                profileNameById.get(String(pt.user_id || "")) ||
                                "Student"}
                              {pt.mentor_name ? ` • Mentor: ${pt.mentor_name}` : ""} •{" "}
                              {formatFullDate(pt.created_at)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExportPortfoliosPdf([pt])}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #fde68a",
                            backgroundColor: "#fffbeb",
                            color: "#92400e",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          Download PDF
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* IDEA BANK (ADMIN: MONITOR, OPEN DETAIL POP-UP, EDIT & DELETE ONLY) */}
          {activeNav === "ideas" && (
            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #ebdcd0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Idea Bank Monitor ({filteredIdeas.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Click an idea to read its full explanation in a pop-up, or edit and delete existing ideas.
                  </p>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 12,
                    backgroundColor: "#fff8f4",
                    border: "1px solid #ebdcd0",
                    padding: 3,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {(["all", "active", "completed"] as const).map((stTab) => (
                    <button
                      key={stTab}
                      type="button"
                      onClick={() => setIdeaStatusFilter(stTab)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        textTransform: "capitalize",
                        cursor: "pointer",
                        backgroundColor: ideaStatusFilter === stTab ? "#f59e0b" : "transparent",
                        color: ideaStatusFilter === stTab ? "#090d16" : "#475569",
                        fontWeight: ideaStatusFilter === stTab ? 700 : 600,
                      }}
                    >
                      {stTab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredIdeas.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No ideas found in this filter.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                  {filteredIdeas.map((idea, idx) => {
                    const isCompleted = String(idea.status || "").toLowerCase().includes("complet")
                    return (
                      <div
                        key={idea.id}
                        style={{
                          padding: "13px 6px",
                          borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openIdeaModal(idea, false)}
                          style={{
                            flex: "1 1 300px",
                            minWidth: 0,
                            textAlign: "left",
                            border: "none",
                            backgroundColor: "transparent",
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                              }}
                            >
                              {idea.category || idea.research_field || "General"}
                            </span>
                            {isCompleted && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  backgroundColor: "#dcfce7",
                                  color: "#166534",
                                }}
                              >
                                Completed
                              </span>
                            )}
                            {idea.difficulty && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>
                                {idea.difficulty}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "5px 0 2px" }}>
                            {idea.title}
                          </p>
                          <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                            {idea.summary || idea.description || "-"}
                          </p>
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => openIdeaModal(idea, false)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "1px solid #fde68a",
                              backgroundColor: "#fffbeb",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#92400e",
                              cursor: "pointer",
                            }}
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => openIdeaModal(idea, true)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "1px solid #ebdcd0",
                              backgroundColor: "#ffffff",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#334155",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteIdea(idea)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              border: "1px solid #fecaca",
                              backgroundColor: "#fef2f2",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#dc2626",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* COMPETITIONS */}
          {activeNav === "competitions" && (
            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #ebdcd0",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Competition Calendar &amp; Details ({filteredCompetitions.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Switch between Monthly or Full Year calendar view, or List view.
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      borderRadius: 12,
                      backgroundColor: "#fff8f4",
                      border: "1px solid #ebdcd0",
                      padding: 2,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCompViewMode("calendar")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: compViewMode === "calendar" ? "#f59e0b" : "transparent",
                        color: compViewMode === "calendar" ? "#090d16" : "#475569",
                        fontWeight: compViewMode === "calendar" ? 700 : 600,
                      }}
                    >
                      Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompViewMode("list")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: compViewMode === "list" ? "#f59e0b" : "transparent",
                        color: compViewMode === "list" ? "#090d16" : "#475569",
                        fontWeight: compViewMode === "list" ? 700 : 600,
                      }}
                    >
                      List
                    </button>
                  </div>

                  {compViewMode === "calendar" && (
                    <div
                      style={{
                        display: "inline-flex",
                        borderRadius: 12,
                        backgroundColor: "#fff8f4",
                        border: "1px solid #ebdcd0",
                        padding: 2,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setCalendarPeriodMode("month")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: calendarPeriodMode === "month" ? "#fef3c7" : "transparent",
                          color: calendarPeriodMode === "month" ? "#92400e" : "#475569",
                          fontWeight: calendarPeriodMode === "month" ? 700 : 600,
                        }}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarPeriodMode("year")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: calendarPeriodMode === "year" ? "#fef3c7" : "transparent",
                          color: calendarPeriodMode === "year" ? "#92400e" : "#475569",
                          fontWeight: calendarPeriodMode === "year" ? 700 : 600,
                        }}
                      >
                        Full Year
                      </button>
                    </div>
                  )}

                  <select
                    aria-label="Filter by month"
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedMonth(val)
                      if (val !== "all" && val.includes("-")) {
                        const [yStr, mStr] = val.split("-")
                        const yNum = Number(yStr)
                        const mNum = Number(mStr) - 1
                        if (!Number.isNaN(yNum) && !Number.isNaN(mNum)) {
                          setCalendarCursor({ year: yNum, month: mNum })
                        }
                      }
                    }}
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      backgroundColor: "#fffdfa",
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    <option value="all">All Months</option>
                    {availableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {ym}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCompetition(null)
                      setShowAddCompetitionForm((prev) => !prev)
                    }}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 12,
                      border: "none",
                      backgroundColor: "#f59e0b",
                      color: "#090d16",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {showAddCompetitionForm ? "Close Form" : "+ Add Competition"}
                  </button>
                </div>
              </div>

              {showAddCompetitionForm && (
                <form
                  onSubmit={handleAddCompetition}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #fcd34d",
                    backgroundColor: "#fffaf2",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <b style={{ color: "#0f172a" }}>Create Competition Schedule</b>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <input
                      type="text"
                      required
                      value={compForm.title}
                      onChange={(e) => setCompForm({ ...compForm, title: e.target.value })}
                      placeholder="Competition Title *"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={compForm.organizer}
                      onChange={(e) => setCompForm({ ...compForm, organizer: e.target.value })}
                      placeholder="Organizer *"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="date"
                      required
                      value={compForm.deadline}
                      onChange={(e) => setCompForm({ ...compForm, deadline: e.target.value })}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <input
                      type="text"
                      value={compForm.category}
                      onChange={(e) => setCompForm({ ...compForm, category: e.target.value })}
                      placeholder="Category"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="text"
                      value={compForm.jenjang}
                      onChange={(e) => setCompForm({ ...compForm, jenjang: e.target.value })}
                      placeholder="Target Level (e.g. SMA/SMK)"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="url"
                      value={compForm.official_url}
                      onChange={(e) => setCompForm({ ...compForm, official_url: e.target.value })}
                      placeholder="Official URL (https://...)"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={compForm.description}
                    onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                    placeholder="Competition details, rules, or submission notes..."
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      backgroundColor: "#ffffff",
                      padding: "8px 12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddCompetitionForm(false)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        color: "#334155",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCompetition}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#f59e0b",
                        color: "#090d16",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {submittingCompetition ? "Publishing..." : "Publish Competition"}
                    </button>
                  </div>
                </form>
              )}

              {editingCompetition && (
                <form
                  onSubmit={handleSaveCompetitionEdit}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #f59e0b",
                    backgroundColor: "#fffbeb",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <b style={{ color: "#0f172a" }}>Edit Competition: {editingCompetition.title}</b>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <input
                      type="text"
                      required
                      value={editCompForm.title}
                      onChange={(e) => setEditCompForm({ ...editCompForm, title: e.target.value })}
                      placeholder="Competition Title *"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={editCompForm.organizer}
                      onChange={(e) =>
                        setEditCompForm({ ...editCompForm, organizer: e.target.value })
                      }
                      placeholder="Organizer *"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="date"
                      value={editCompForm.deadline}
                      onChange={(e) =>
                        setEditCompForm({ ...editCompForm, deadline: e.target.value })
                      }
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <input
                      type="text"
                      value={editCompForm.category}
                      onChange={(e) =>
                        setEditCompForm({ ...editCompForm, category: e.target.value })
                      }
                      placeholder="Category"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="text"
                      value={editCompForm.jenjang}
                      onChange={(e) =>
                        setEditCompForm({ ...editCompForm, jenjang: e.target.value })
                      }
                      placeholder="Jenjang"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <input
                      type="url"
                      value={editCompForm.official_url}
                      onChange={(e) =>
                        setEditCompForm({ ...editCompForm, official_url: e.target.value })
                      }
                      placeholder="Official URL"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={editCompForm.description}
                    onChange={(e) =>
                      setEditCompForm({ ...editCompForm, description: e.target.value })
                    }
                    placeholder="Description / Notes"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      backgroundColor: "#ffffff",
                      padding: "8px 12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditingCompetition(null)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        color: "#334155",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingCompEdit}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#f59e0b",
                        color: "#090d16",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {savingCompEdit ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {compViewMode === "calendar" ? (
                calendarPeriodMode === "month" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleStepCalendarMonth(-1)}
                          aria-label="Previous month"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid #ebdcd0",
                            backgroundColor: "#fffdfa",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ←
                        </button>
                        <b style={{ fontSize: 13, color: "#0f172a" }}>
                          {currentMonthGrid.monthLabel}
                        </b>
                        <button
                          type="button"
                          onClick={() => handleStepCalendarMonth(1)}
                          aria-label="Next month"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid #ebdcd0",
                            backgroundColor: "#fffdfa",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          →
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Dates with highlighted badges have competition deadlines/schedules
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: 6,
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((wd) => (
                        <div key={wd} style={{ padding: "4px 0" }}>
                          {wd}
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: 6,
                      }}
                    >
                      {currentMonthGrid.cells.map((cell, idx) => {
                        const hasEvents = cell.events.length > 0
                        return (
                          <div
                            key={cell.dateKey || `empty-${idx}`}
                            style={{
                              minHeight: 88,
                              borderRadius: 10,
                              border: hasEvents ? "1px solid #f59e0b" : "1px solid #f2e7de",
                              backgroundColor: cell.dayNum
                                ? hasEvents
                                  ? "#fffaf0"
                                  : "#fffdfa"
                                : "#faf7f4",
                              padding: 6,
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              minWidth: 0,
                            }}
                          >
                            {cell.dayNum && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: hasEvents ? 800 : 600,
                                  color: hasEvents ? "#92400e" : "#475569",
                                }}
                              >
                                {cell.dayNum}
                              </span>
                            )}

                            {cell.events.map((comp) => (
                              <div
                                key={comp.id}
                                style={{
                                  borderRadius: 6,
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #fde68a",
                                  padding: "4px 6px",
                                  fontSize: 10,
                                }}
                              >
                                <p
                                  style={{
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    margin: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={comp.title}
                                >
                                  {comp.title}
                                </p>
                                <p
                                  style={{
                                    color: "#64748b",
                                    margin: "2px 0 0",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {comp.organizer || "-"}
                                </p>
                                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => startEditCompetition(comp)}
                                    style={{
                                      border: "none",
                                      backgroundColor: "transparent",
                                      padding: 0,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: "#b45309",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteCompetition(comp)}
                                    style={{
                                      border: "none",
                                      backgroundColor: "transparent",
                                      padding: 0,
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: "#dc2626",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarCursor((prev) => ({ ...prev, year: prev.year - 1 }))
                          }
                          aria-label="Previous year"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid #ebdcd0",
                            backgroundColor: "#fffdfa",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ←
                        </button>
                        <b style={{ fontSize: 13, color: "#0f172a" }}>
                          Full Year Calendar • {calendarCursor.year}
                        </b>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarCursor((prev) => ({ ...prev, year: prev.year + 1 }))
                          }
                          aria-label="Next year"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid #ebdcd0",
                            backgroundColor: "#fffdfa",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          →
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Click any month to focus on that month
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {fullYearGrids.map((mg) => {
                        const monthEventCount = mg.cells.reduce(
                          (sum, c) => sum + c.events.length,
                          0
                        )
                        return (
                          <div
                            key={mg.monthIndex}
                            onClick={() => {
                              setCalendarCursor((prev) => ({ ...prev, month: mg.monthIndex }))
                              setCalendarPeriodMode("month")
                            }}
                            style={{
                              borderRadius: 12,
                              border: monthEventCount > 0 ? "1px solid #fcd34d" : "1px solid #f2e7de",
                              backgroundColor: "#fffdfa",
                              padding: 12,
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <b style={{ fontSize: 12, color: "#0f172a" }}>{mg.monthLabel}</b>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: 999,
                                  backgroundColor: monthEventCount > 0 ? "#fef3c7" : "#f1f5f9",
                                  color: monthEventCount > 0 ? "#92400e" : "#64748b",
                                }}
                              >
                                {monthEventCount}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                                gap: 3,
                                textAlign: "center",
                                fontSize: 10,
                              }}
                            >
                              {mg.cells.map((cell, cIdx) => {
                                const hasEv = cell.events.length > 0
                                return (
                                  <div
                                    key={cell.dateKey || `yr-empty-${cIdx}`}
                                    title={
                                      hasEv
                                        ? cell.events.map((e) => e.title).join(", ")
                                        : undefined
                                    }
                                    style={{
                                      padding: "3px 0",
                                      borderRadius: 4,
                                      fontWeight: hasEv ? 800 : 500,
                                      backgroundColor: hasEv ? "#f59e0b" : "transparent",
                                      color: hasEv ? "#ffffff" : cell.dayNum ? "#475569" : "transparent",
                                    }}
                                  >
                                    {cell.dayNum || "."}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              ) : filteredCompetitions.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No competitions found.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                  {filteredCompetitions.map((comp, idx) => (
                    <div
                      key={comp.id}
                      style={{
                        padding: "13px 6px",
                        borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <b style={{ fontSize: 13, color: "#0f172a" }}>{comp.title}</b>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              backgroundColor: "#fef3c7",
                              color: "#92400e",
                            }}
                          >
                            {comp.status_badge || "Open"}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#b45309" }}>
                            {comp.deadline ? `Deadline: ${comp.deadline}` : "Open Schedule"}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>
                          Organizer: <b>{comp.organizer || "-"}</b> • {comp.level || "National"} •{" "}
                          {comp.category || "-"} • {comp.jenjang || "-"}
                        </p>
                        {(comp.description || comp.notes) && (
                          <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0" }}>
                            {comp.description || comp.notes}
                          </p>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, flexShrink: 0 }}>
                        {comp.official_url && (
                          <a
                            href={comp.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontWeight: 600, color: "#b45309", textDecoration: "none" }}
                          >
                            Website ↗
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditCompetition(comp)}
                          style={{
                            border: "1px solid #ebdcd0",
                            borderRadius: 8,
                            padding: "4px 10px",
                            backgroundColor: "#ffffff",
                            fontWeight: 600,
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCompetition(comp)}
                          style={{
                            border: "1px solid #fecaca",
                            borderRadius: 8,
                            padding: "4px 10px",
                            backgroundColor: "#fef2f2",
                            fontWeight: 600,
                            color: "#dc2626",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* MENTOR REPORTS */}
          {activeNav === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <section
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #ebdcd0",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Recent Mentor Activities &amp; Status ({recentMentorActivities.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Live mentor pairing status and recent mentoring evaluation updates.
                  </p>
                </div>

                {recentMentorActivities.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 16 }}>
                    No recent mentor activities recorded yet.
                  </p>
                ) : (
                  <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                    {recentMentorActivities.map((act, idx) => (
                      <div
                        key={act.id}
                        style={{
                          padding: "12px 6px",
                          borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                              }}
                            >
                              {act.mentorName} ({act.mentorCode})
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                backgroundColor: "#e0f2fe",
                                color: "#0369a1",
                              }}
                            >
                              {act.badgeText}
                            </span>
                            <b style={{ color: "#0f172a" }}>{act.title}</b>
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {formatRelativeTime(act.timestamp, referenceNowMs)}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: "#475569", margin: "6px 0 0" }}>
                          {act.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #ebdcd0",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Mentor Reports &amp; Evaluation Logs ({mentorReports.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Mentoring feedback, coaching notes, and project evaluation reports submitted by mentors.
                  </p>
                </div>

                {mentorReports.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                    No mentor reports submitted yet.
                  </p>
                ) : (
                  <div style={{ borderTop: "1px solid #f2e7de", fontSize: 12 }}>
                    {mentorReports.map((rep, idx) => {
                      const mentorLabel =
                        rep.mentor_name ||
                        (rep.mentor_id ? profileNameById.get(String(rep.mentor_id)) : null) ||
                        "PLEGO Mentor"
                      const studentLabel =
                        rep.student_name ||
                        (rep.student_id ? profileNameById.get(String(rep.student_id)) : null)
                      return (
                        <div
                          key={rep.id}
                          style={{
                            padding: "13px 6px",
                            borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  backgroundColor: "#fef3c7",
                                  color: "#92400e",
                                }}
                              >
                                {mentorLabel}
                              </span>
                              <b style={{ color: "#0f172a" }}>
                                {rep.project_title || "Student Project Evaluation"}
                              </b>
                              {studentLabel && (
                                <span style={{ fontSize: 11, color: "#64748b" }}>
                                  • Student: {studentLabel}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>
                              {formatFullDate(rep.created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: "#475569", margin: "6px 0 0" }}>
                            {rep.feedback || rep.message || "Mentoring evaluation recorded."}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* USER DETAIL + EDIT MODAL */}
      {selectedAccount && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          onClick={() => {
            setSelectedAccount(null)
            setIsEditingAccount(false)
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 16,
              border: "1px solid #ebdcd0",
              backgroundColor: "#ffffff",
              padding: 20,
              fontSize: 12,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #f2e7de",
              }}
            >
              <div>
                <h3 id="account-modal-title" style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {getAccountDisplayName(selectedAccount)}
                </h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                  Role: <b>{String(selectedAccount.role || "student").toUpperCase()}</b> (Locked)
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAccount(null)
                  setIsEditingAccount(false)
                }}
                aria-label="Close profile pop-up"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid #ebdcd0",
                  backgroundColor: "#fffdfa",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {isEditingAccount ? (
              <form
                onSubmit={handleSaveAccountEdit}
                style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editAccountForm.fullName}
                    onChange={(e) =>
                      setEditAccountForm({ ...editAccountForm, fullName: e.target.value })
                    }
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editAccountForm.email}
                    onChange={(e) =>
                      setEditAccountForm({ ...editAccountForm, email: e.target.value })
                    }
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editAccountForm.phone}
                    onChange={(e) =>
                      setEditAccountForm({ ...editAccountForm, phone: e.target.value })
                    }
                    placeholder="+62..."
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Institution
                  </label>
                  <input
                    type="text"
                    value={editAccountForm.institution}
                    onChange={(e) =>
                      setEditAccountForm({ ...editAccountForm, institution: e.target.value })
                    }
                    placeholder="School / University / Organization"
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    borderRadius: 10,
                    border: "1px solid #fde68a",
                    backgroundColor: "#fffbeb",
                    padding: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#78350f", margin: 0 }}>
                      Account Password
                    </p>
                    <p style={{ fontSize: 10, color: "#92400e", margin: "2px 0 0" }}>
                      Send recovery link to {editAccountForm.email || selectedAccount.email || "user email"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={sendingPasswordReset}
                    onClick={() =>
                      void handleSendPasswordReset(editAccountForm.email || selectedAccount.email)
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #f59e0b",
                      backgroundColor: "#ffffff",
                      color: "#92400e",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {sendingPasswordReset ? "Sending..." : "Reset Password"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingAccount(false)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAccount}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "none",
                      backgroundColor: "#f59e0b",
                      color: "#090d16",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {savingAccount ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <dl
                  style={{
                    margin: "14px 0",
                    borderRadius: 12,
                    border: "1px solid #f2e7de",
                    backgroundColor: "#fffdfa",
                    padding: "0 14px",
                  }}
                >
                  <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <dt style={{ color: "#94a3b8" }}>Full Name</dt>
                    <dd style={{ fontWeight: 600, color: "#0f172a", margin: 0, textAlign: "right" }}>
                      {selectedAccount.full_name || selectedAccount.name || "-"}
                    </dd>
                  </div>
                  <div
                    style={{
                      padding: "10px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      borderTop: "1px solid #f5ece5",
                    }}
                  >
                    <dt style={{ color: "#94a3b8" }}>Email</dt>
                    <dd style={{ fontWeight: 600, color: "#0f172a", margin: 0, textAlign: "right" }}>
                      {selectedAccount.email || "-"}
                    </dd>
                  </div>
                  <div
                    style={{
                      padding: "10px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      borderTop: "1px solid #f5ece5",
                    }}
                  >
                    <dt style={{ color: "#94a3b8" }}>Phone</dt>
                    <dd style={{ fontWeight: 600, color: "#0f172a", margin: 0, textAlign: "right" }}>
                      {selectedAccount.phone || "-"}
                    </dd>
                  </div>
                  <div
                    style={{
                      padding: "10px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      borderTop: "1px solid #f5ece5",
                    }}
                  >
                    <dt style={{ color: "#94a3b8" }}>Institution</dt>
                    <dd style={{ fontWeight: 600, color: "#0f172a", margin: 0, textAlign: "right" }}>
                      {selectedAccount.institution || "-"}
                    </dd>
                  </div>

                  {String(selectedAccount.role || "").toLowerCase() === "mentor" ? (
                    <>
                      <div
                        style={{
                          padding: "10px 0",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          borderTop: "1px solid #f5ece5",
                        }}
                      >
                        <dt style={{ color: "#94a3b8" }}>Mentor Code</dt>
                        <dd style={{ fontWeight: 700, color: "#92400e", margin: 0, textAlign: "right" }}>
                          {getDisplayMentorCode(selectedAccount)}
                        </dd>
                      </div>
                      <div
                        style={{
                          padding: "10px 0",
                          borderTop: "1px solid #f5ece5",
                        }}
                      >
                        <dt style={{ color: "#94a3b8", marginBottom: 6 }}>
                          Connected Students ({(mentorToStudents[selectedAccount.id] || []).length})
                        </dt>
                        <dd style={{ margin: 0 }}>
                          {(mentorToStudents[selectedAccount.id] || []).length === 0 ? (
                            <span style={{ color: "#94a3b8", fontSize: 11 }}>
                              No students connected yet.
                            </span>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {(mentorToStudents[selectedAccount.id] || []).map((stuId) => {
                                const stuAcc = accountById.get(stuId)
                                return (
                                  <button
                                    key={stuId}
                                    type="button"
                                    onClick={() => {
                                      if (stuAcc) openAccountModal(stuAcc, false)
                                    }}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: "3px 8px",
                                      borderRadius: 8,
                                      border: "1px solid #ebdcd0",
                                      backgroundColor: "#ffffff",
                                      color: "#0f172a",
                                      cursor: stuAcc ? "pointer" : "default",
                                    }}
                                  >
                                    {profileNameById.get(stuId) || "Student"}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </dd>
                      </div>
                    </>
                  ) : String(selectedAccount.role || "").toLowerCase() !== "admin" ? (
                    <div
                      style={{
                        padding: "10px 0",
                        borderTop: "1px solid #f5ece5",
                      }}
                    >
                      <dt style={{ color: "#94a3b8", marginBottom: 6 }}>Connected Mentor</dt>
                      <dd style={{ margin: 0 }}>
                        {(studentToMentors[selectedAccount.id] || []).length === 0 ? (
                          <span style={{ color: "#94a3b8", fontSize: 11 }}>
                            Not connected to a mentor yet.
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(studentToMentors[selectedAccount.id] || []).map((mId) => {
                              const mAcc = accountById.get(mId)
                              return (
                                <button
                                  key={mId}
                                  type="button"
                                  onClick={() => {
                                    if (mAcc) openAccountModal(mAcc, false)
                                  }}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: "1px solid #fde68a",
                                    backgroundColor: "#fffbeb",
                                    color: "#92400e",
                                    cursor: mAcc ? "pointer" : "default",
                                  }}
                                >
                                  {profileNameById.get(mId) || "Mentor"}
                                  {mAcc ? ` (${getDisplayMentorCode(mAcc)})` : ""}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </dd>
                    </div>
                  ) : null}

                  <div
                    style={{
                      padding: "10px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      borderTop: "1px solid #f5ece5",
                    }}
                  >
                    <dt style={{ color: "#94a3b8" }}>Joined</dt>
                    <dd style={{ fontWeight: 500, color: "#334155", margin: 0, textAlign: "right" }}>
                      {formatFullDate(selectedAccount.created_at)}
                    </dd>
                  </div>
                </dl>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  {String(selectedAccount.role || "").toLowerCase() !== "admin" ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteAccount(selectedAccount)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      Remove Account
                    </button>
                  ) : (
                    <span />
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingAccount(true)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#fffdfa",
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Edit User
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccount(null)
                        setIsEditingAccount(false)
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#f59e0b",
                        color: "#090d16",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* IDEA BANK POP-UP DETAIL + EDIT MODAL */}
      {selectedIdea && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idea-modal-title"
          onClick={() => {
            setSelectedIdea(null)
            setIsEditingIdea(false)
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 500,
              borderRadius: 16,
              border: "1px solid #ebdcd0",
              backgroundColor: "#ffffff",
              padding: 20,
              fontSize: 12,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #f2e7de",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    marginBottom: 4,
                  }}
                >
                  {selectedIdea.category || selectedIdea.research_field || "Idea Bank"}
                </span>
                <h3 id="idea-modal-title" style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {selectedIdea.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedIdea(null)
                  setIsEditingIdea(false)
                }}
                aria-label="Close idea pop-up"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid #ebdcd0",
                  backgroundColor: "#fffdfa",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {isEditingIdea ? (
              <form
                onSubmit={handleSaveIdeaEdit}
                style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}
              >
                <input
                  type="text"
                  required
                  value={editIdeaForm.title}
                  onChange={(e) => setEditIdeaForm({ ...editIdeaForm, title: e.target.value })}
                  placeholder="Idea Title *"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #ebdcd0",
                    padding: "8px 10px",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input
                    type="text"
                    value={editIdeaForm.category}
                    onChange={(e) => setEditIdeaForm({ ...editIdeaForm, category: e.target.value })}
                    placeholder="Category"
                    style={{
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                    }}
                  />
                  <select
                    value={editIdeaForm.difficulty}
                    onChange={(e) => setEditIdeaForm({ ...editIdeaForm, difficulty: e.target.value })}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                    }}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                  <select
                    value={editIdeaForm.status}
                    onChange={(e) => setEditIdeaForm({ ...editIdeaForm, status: e.target.value })}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      padding: "8px 10px",
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <textarea
                  rows={4}
                  required
                  value={editIdeaForm.summary}
                  onChange={(e) => setEditIdeaForm({ ...editIdeaForm, summary: e.target.value })}
                  placeholder="Idea summary & prototype description *"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #ebdcd0",
                    padding: "8px 10px",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="text"
                  value={editIdeaForm.tagsText}
                  onChange={(e) => setEditIdeaForm({ ...editIdeaForm, tagsText: e.target.value })}
                  placeholder="Tags (comma separated)"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #ebdcd0",
                    padding: "8px 10px",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingIdea(false)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid #ebdcd0",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingIdeaEdit}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "none",
                      backgroundColor: "#f59e0b",
                      color: "#090d16",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {savingIdeaEdit ? "Saving..." : "Save Idea"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f2e7de",
                    backgroundColor: "#fffdfa",
                    padding: 14,
                    lineHeight: 1.6,
                    color: "#334155",
                  }}
                >
                  {selectedIdea.summary || selectedIdea.description || "No description provided."}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11 }}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      backgroundColor: "#f1f5f9",
                      color: "#334155",
                      fontWeight: 600,
                    }}
                  >
                    Difficulty: {selectedIdea.difficulty || "General"}
                  </span>
                  {String(selectedIdea.status || "").toLowerCase().includes("complet") && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        fontWeight: 700,
                      }}
                    >
                      Completed
                    </span>
                  )}
                  {parseIdeaTags(selectedIdea.tags).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a",
                        color: "#92400e",
                        fontWeight: 600,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 10,
                    borderTop: "1px solid #f2e7de",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleDeleteIdea(selectedIdea)}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    Delete Idea
                  </button>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingIdea(true)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#fffdfa",
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Edit Idea
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIdea(null)
                        setIsEditingIdea(false)
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 12,
                        border: "none",
                        backgroundColor: "#f59e0b",
                        color: "#090d16",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}