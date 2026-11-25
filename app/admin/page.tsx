"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  user_id?: string | null
  author_id?: string | null
  mentor_id?: string | null
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
  category?: string | null
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
  tags?: string[] | string | null
  created_at?: string | null
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
  project_id?: string | null
  project_title?: string | null
  feedback?: string | null
  message?: string | null
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
type ChartRange = "7d" | "14d" | "30d" | "90d"
type CompetitionViewMode = "calendar" | "list"

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
  if (diffDays < 7) return `${diffDays}d ago`
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

export default function AdminDashboardPage() {
  const router = useRouter()

  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [isDesktop, setIsDesktop] = useState(true)
  const [referenceNowMs, setReferenceNowMs] = useState<number | null>(null)
  const [adminName, setAdminName] = useState("PLEGO Admin")
  const [adminEmail, setAdminEmail] = useState("")
  const [activeNav, setActiveNav] = useState<AdminNavKey>("dashboard")
  const [globalSearch, setGlobalSearch] = useState("")
  const [chartRange, setChartRange] = useState<ChartRange>("7d")
  const [compViewMode, setCompViewMode] = useState<CompetitionViewMode>("calendar")

  // Core data states
  const [accounts, setAccounts] = useState<ProfileAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<ProfileAccount | null>(null)
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all")
  const [loadingData, setLoadingData] = useState(false)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([])
  const [ideas, setIdeas] = useState<IdeaBankItem[]>([])
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([])
  const [mentorReports, setMentorReports] = useState<MentorReportItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
  const [mentorConnections, setMentorConnections] = useState<Record<string, string[]>>({})
  const [copiedMentorId, setCopiedMentorId] = useState<string | null>(null)

  // On-demand forms
  const [showAddMentorForm, setShowAddMentorForm] = useState(false)
  const [showAddIdeaForm, setShowAddIdeaForm] = useState(false)
  const [showAddCompetitionForm, setShowAddCompetitionForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  const [mentorForm, setMentorForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    institution: "PLEGO Indonesia",
    mentorCode: "",
  })
  const [submittingMentor, setSubmittingMentor] = useState(false)

  const [ideaForm, setIdeaForm] = useState({
    title: "",
    category: "Computer Science & IoT",
    difficulty: "Intermediate",
    summary: "",
    tagsText: "AI, Prototype, Competition",
  })
  const [submittingIdea, setSubmittingIdea] = useState(false)

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
          .limit(30),
        supabase
          .from("mentor_feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(40),
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
      setProjects(projectRows)
      setIdeas(ideaRows)
      setCompetitions(competitionRows)
      setMentorReports(feedbackRows)

      const nameById = new Map<string, string>()
      const connMap = new Map<string, Set<string>>()

      for (const p of profileRows) {
        nameById.set(p.id, p.full_name || p.name || p.email || "User")
        if (String(p.role || "").toLowerCase() === "mentor") {
          connMap.set(p.id, new Set<string>())
        }
      }

      for (const p of profileRows) {
        if (String(p.role || "").toLowerCase() === "mentor") continue
        const linkedMentor = p.connected_mentor_id || p.mentor_id
        if (linkedMentor && connMap.has(String(linkedMentor))) {
          connMap.get(String(linkedMentor))?.add(p.id)
        }
      }

      if (!portfoliosRes.error && Array.isArray(portfoliosRes.data)) {
        setPortfolios(portfoliosRes.data as PortfolioItem[])
      } else {
        const derivedPortfolios: PortfolioItem[] = projectRows
          .filter((proj) => {
            const st = String(proj.status || "").toLowerCase()
            return (
              st.includes("complete") ||
              st.includes("done") ||
              st.includes("submit") ||
              st.includes("ready")
            )
          })
          .map((proj) => {
            const ownerId = String(proj.user_id || proj.author_id || "")
            return {
              id: `proj-port-${proj.id}`,
              title: proj.title,
              student_name: nameById.get(ownerId) || "Student Innovator",
              user_id: ownerId,
              category: proj.category || "Innovation Prototype",
              status: proj.status || "Published",
              created_at: proj.updated_at || proj.created_at,
            }
          })
        setPortfolios(derivedPortfolios)
      }

      const projectOwnerById = new Map<string, string>()
      const logs: ActivityLogItem[] = []

      for (const proj of projectRows) {
        const ownerId = String(proj.user_id || proj.author_id || "")
        if (proj.id && ownerId) {
          projectOwnerById.set(String(proj.id), ownerId)
        }
        if (proj.mentor_id && ownerId && connMap.has(String(proj.mentor_id))) {
          connMap.get(String(proj.mentor_id))?.add(ownerId)
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
        if (mentorId && linkedStudentId && connMap.has(mentorId)) {
          connMap.get(mentorId)?.add(linkedStudentId)
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

      for (const acc of profileRows.slice(0, 12)) {
        if (!acc.created_at) continue
        const roleStr = String(acc.role || "student").toLowerCase()
        const roleLabel: "Student" | "Mentor" | "Admin" =
          roleStr === "mentor" ? "Mentor" : roleStr === "admin" ? "Admin" : "Student"
        logs.push({
          id: `signup-${acc.id}`,
          actorId: acc.id,
          actorRole: roleLabel,
          actorName: acc.full_name || acc.name || acc.email || "New User",
          action: "Joined InnovaSeed workspace",
          targetTitle: acc.institution || "PLEGO Indonesia",
          timestamp: acc.created_at,
          rawTime: new Date(acc.created_at).getTime(),
        })
      }

      const serializedConn: Record<string, string[]> = {}
      connMap.forEach((set, mId) => {
        serializedConn[mId] = Array.from(set)
      })
      setMentorConnections(serializedConn)

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

    async function verifyAdmin() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const user = session.user
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      const role = String(profile?.role || user.user_metadata?.role || "")
        .trim()
        .toLowerCase()
      const emailLower = String(user.email || "").trim().toLowerCase()
      const isAdminEmail = emailLower === "plego@gmail.com" || emailLower.includes("admin")

      if (role !== "admin" && !isAdminEmail) {
        router.replace(role === "mentor" ? "/mentor" : "/dashboard/student")
        return
      }

      if (!active) return
      setReferenceNowMs(Date.now())
      setAdminName(profile?.full_name || profile?.name || "PLEGO Admin")
      setAdminEmail(user.email || "")
      setIsCheckingAccess(false)
      await loadAllAdminData()
    }

    void verifyAdmin()
    return () => {
      active = false
    }
  }, [loadAllAdminData, router])

  useEffect(() => {
    if (!selectedAccount) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAccount(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedAccount])

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of accounts) {
      map.set(a.id, a.full_name || a.name || a.email || "User")
    }
    return map
  }, [accounts])

  const activityAnalytics = useMemo(() => {
    if (!referenceNowMs) {
      return {
        activeTodayUsers: [] as ProfileAccount[],
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

    const latestActivityByUser = new Map<string, number>()
    const dailyActiveSets = new Map<string, Set<string>>()

    const dayBuckets: Array<{ key: string; label: string; shortDate: string }> = []
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(referenceNowMs)
      d.setDate(d.getDate() - offset)
      const dk = toDayKey(d)
      dayBuckets.push({
        key: dk,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
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
    const active7DaysUsers: ProfileAccount[] = []

    for (const acc of accounts) {
      const lastMs = latestActivityByUser.get(acc.id)
      if (!lastMs) continue
      if (toDayKey(new Date(lastMs)) === todayKey) {
        activeTodayUsers.push(acc)
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
      active7DaysUsers,
      chartSeries,
      maxChartCount,
    }
  }, [accounts, activityLogs, profileNameById, referenceNowMs])

  const kpiStats = useMemo(() => {
    const mentors = accounts.filter((a) => String(a.role || "").toLowerCase() === "mentor")
    const students = accounts.filter(
      (a) =>
        String(a.role || "").toLowerCase() !== "mentor" &&
        String(a.role || "").toLowerCase() !== "admin"
    )
    const connectedStudentIds = new Set<string>()
    Object.values(mentorConnections).forEach((ids) => ids.forEach((id) => connectedStudentIds.add(id)))

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
  }, [accounts, mentorConnections, projects, activityAnalytics])

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

    setSubmittingMentor(true)
    try {
      const generatedId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

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

      const { error } = await supabase.from("profiles").insert([payloadWithCode])
      if (error) {
        const fallback = { ...payloadWithCode }
        delete (fallback as { mentor_code?: string }).mentor_code
        const retry = await supabase.from("profiles").insert([fallback])
        if (retry.error) throw retry.error
      }

      setMentorForm({
        fullName: "",
        email: "",
        phone: "",
        institution: cleanInstitution,
        mentorCode: "",
      })
      setShowAddMentorForm(false)
      await loadAllAdminData()
      showBanner("success", `Mentor "${cleanName}" created (${finalMentorCode}).`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to create mentor.")
    } finally {
      setSubmittingMentor(false)
    }
  }

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTitle = ideaForm.title.trim()
    const cleanSummary = ideaForm.summary.trim()
    if (!cleanTitle || !cleanSummary) {
      showBanner("error", "Idea title and summary are required.")
      return
    }

    const parsedTags = ideaForm.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    setSubmittingIdea(true)
    try {
      const { error } = await supabase.from("ideas").insert([
        {
          title: cleanTitle,
          summary: cleanSummary,
          description: cleanSummary,
          category: ideaForm.category,
          research_field: ideaForm.category,
          difficulty: ideaForm.difficulty,
          tags: parsedTags,
          author_name: adminName,
        },
      ])
      if (error) {
        const retry = await supabase.from("ideas").insert([
          {
            title: cleanTitle,
            summary: cleanSummary,
            category: ideaForm.category,
            difficulty: ideaForm.difficulty,
          },
        ])
        if (retry.error) throw retry.error
      }

      setIdeaForm({
        title: "",
        category: ideaForm.category,
        difficulty: ideaForm.difficulty,
        summary: "",
        tagsText: "AI, Prototype, Competition",
      })
      setShowAddIdeaForm(false)
      await loadAllAdminData()
      showBanner("success", `Idea "${cleanTitle}" published to Idea Bank.`)
    } catch (err: unknown) {
      showBanner("error", err instanceof Error ? err.message : "Failed to publish idea.")
    } finally {
      setSubmittingIdea(false)
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

  const handleDeleteAccount = async (acc: ProfileAccount) => {
    const label = acc.full_name || acc.name || acc.email || "this account"
    if (!window.confirm(`Remove profile for "${label}"?`)) return
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", acc.id)
      if (error) throw error
      setAccounts((prev) => prev.filter((item) => item.id !== acc.id))
      if (selectedAccount?.id === acc.id) setSelectedAccount(null)
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

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const role = String(acc.role || "student").toLowerCase()
      if (accountFilter === "mentor" && role !== "mentor") return false
      if (accountFilter === "student" && role !== "student") return false
      return true
    })
  }, [accounts, accountFilter])

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

  const competitionsByDate = useMemo(() => {
    const map = new Map<string, CompetitionItem[]>()
    for (const c of filteredCompetitions) {
      const dateKey = c.deadline || c.start_date || "No Date"
      const list = map.get(dateKey) || []
      list.push(c)
      map.set(dateKey, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredCompetitions])

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
        alignItems: "stretch",
        overflowX: "hidden",
      }}
    >
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  {globalSearchResults.matchedAccounts.map((acc) => (
                    <button
                      key={`gs-acc-${acc.id}`}
                      type="button"
                      onClick={() => setSelectedAccount(acc)}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#065f46" }}>
                        USER • {acc.role || "student"}
                      </span>
                      <p style={{ fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                        {acc.full_name || acc.name || "Unnamed User"}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{acc.email}</p>
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
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#3730a3" }}>
                        PROJECT
                      </span>
                      <p style={{ fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                        {proj.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        {proj.category || "Innovation Workspace"}
                      </p>
                    </button>
                  ))}

                  {globalSearchResults.matchedIdeas.map((idea) => (
                    <button
                      key={`gs-idea-${idea.id}`}
                      type="button"
                      onClick={() => {
                        setActiveNav("ideas")
                        setGlobalSearch("")
                      }}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e" }}>
                        IDEA BANK
                      </span>
                      <p style={{ fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                        {idea.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        {idea.category || idea.research_field || "Prompt"}
                      </p>
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
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#6b21a8" }}>
                        COMPETITION
                      </span>
                      <p style={{ fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                        {comp.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        {comp.organizer || "Organizer"}
                      </p>
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
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#115e59" }}>
                        PORTFOLIO
                      </span>
                      <p style={{ fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                        {pt.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        {pt.student_name || "Student"}
                      </p>
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
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9f1239" }}>
                        MENTOR REPORT
                      </span>
                      <p style={{ fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                        {rep.project_title || "Mentor Evaluation"}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        By {rep.mentor_name || "Mentor"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeNav === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Welcome Card */}
              <section
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
                    Monitor active innovators, mentor connections, ongoing student projects, and 7-day engagement.
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
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

              {/* Compact 2-Row KPI Cards */}
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav("users")
                      setAccountFilter("all")
                    }}
                    style={{
                      textAlign: "left",
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Total Users</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "4px 0 0" }}>
                      {kpiStats.totalUsers}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav("users")
                      setAccountFilter("student")
                    }}
                    style={{
                      textAlign: "left",
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Students</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#047857", margin: "4px 0 0" }}>
                      {kpiStats.studentCount}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav("users")
                      setAccountFilter("mentor")
                    }}
                    style={{
                      textAlign: "left",
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Mentors</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#d97706", margin: "4px 0 0" }}>
                      {kpiStats.mentorCount}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav("users")
                      setAccountFilter("mentor")
                    }}
                    style={{
                      textAlign: "left",
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Mentor Connections</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#0369a1", margin: "4px 0 0" }}>
                      {kpiStats.mentorConnectionsCount}
                    </p>
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Active Today</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#0f766e", margin: "4px 0 0" }}>
                      {kpiStats.activeTodayCount}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveNav("projects")}
                    style={{
                      textAlign: "left",
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Active Projects</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#4338ca", margin: "4px 0 0" }}>
                      {kpiStats.activeProjectsCount}
                    </p>
                  </button>

                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #ebdcd0",
                      padding: "12px 14px",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Active (7 Days)</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#6d28d9", margin: "4px 0 0" }}>
                      {kpiStats.active7DaysCount}
                    </p>
                  </div>
                </div>
              </section>

              {/* 2-Column Chart + Activity Logs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <section
                  style={{
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
                        Active Users Overview (Last 7 Days)
                      </h2>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Daily active students &amp; mentors across the past 7 days.
                      </p>
                    </div>

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
                      {(["7d", "14d", "30d", "90d"] as const).map((range) => {
                        const is7d = range === "7d"
                        return (
                          <button
                            key={range}
                            type="button"
                            onClick={() => {
                              setChartRange("7d")
                              if (!is7d) {
                                showBanner(
                                  "success",
                                  "Currently displaying 7-day active user analytics while historical data accumulates."
                                )
                              }
                            }}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 8,
                              border: "none",
                              textTransform: "uppercase",
                              cursor: "pointer",
                              backgroundColor: chartRange === range ? "#f59e0b" : "transparent",
                              color: chartRange === range ? "#090d16" : "#64748b",
                              fontWeight: chartRange === range ? 700 : 600,
                            }}
                          >
                            {range}
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
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: 6,
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
                                maxWidth: 28,
                                height: 76,
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
                                  fontSize: 10,
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
                              onClick={() => setSelectedAccount(u)}
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
                              {u.full_name || u.name || u.email}
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
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>Active Last 7 Days</span>
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
                          {activityAnalytics.active7DaysUsers.length}
                        </span>
                      </div>
                      {activityAnalytics.active7DaysUsers.length === 0 ? (
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                          No activity in the last 7 days.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {activityAnalytics.active7DaysUsers.slice(0, 6).map((u) => (
                            <button
                              key={`7d-${u.id}`}
                              type="button"
                              onClick={() => setSelectedAccount(u)}
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
                              {u.full_name || u.name || u.email}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section
                  style={{
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
                        Activity Logs
                      </h2>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Recent student, mentor, and registration activity.
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
                      {activityLogs.length} Logs
                    </span>
                  </div>

                  {loadingData ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                      Loading activity logs...
                    </p>
                  ) : activityLogs.length === 0 ? (
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
                      No activity logs recorded yet.
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
                      {activityLogs.slice(0, 12).map((log) => (
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

          {activeNav === "users" && (
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
                    User Management ({filteredAccounts.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Click any user row to open full account details in a pop-up. Roles are locked.
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
                      onChange={(e) => setMentorForm({ ...mentorForm, institution: e.target.value })}
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
                      onChange={(e) => setMentorForm({ ...mentorForm, mentorCode: e.target.value })}
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
                  overflow: "hidden",
                }}
              >
                {filteredAccounts.map((acc, idx) => {
                  const role = String(acc.role || "student").toLowerCase()
                  const isMentor = role === "mentor"
                  const code = isMentor ? getDisplayMentorCode(acc) : null
                  const connectedCount = isMentor ? (mentorConnections[acc.id] || []).length : 0

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc)}
                      style={{
                        padding: "12px 16px",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        cursor: "pointer",
                        borderTop: idx === 0 ? "none" : "1px solid #f5ece5",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                          {acc.full_name || acc.name || "Unnamed User"}
                        </p>
                        <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                          {acc.email || "-"}
                          {acc.institution ? ` • ${acc.institution}` : ""}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isMentor && code && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleCopyMentorCode(acc)
                            }}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 6,
                              backgroundColor: "#fffbeb",
                              border: "1px solid #fde68a",
                              color: "#78350f",
                              cursor: "pointer",
                            }}
                          >
                            {copiedMentorId === acc.id ? "Copied!" : code}
                          </button>
                        )}
                        {isMentor && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 6,
                              backgroundColor: "#f1f5f9",
                              color: "#334155",
                            }}
                          >
                            {connectedCount} Students
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 10px",
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
          )}

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
                  Active and ongoing student projects across InnovaSeed workspaces.
                </p>
              </div>

              {projects.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No projects found yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {projects.map((proj) => {
                    const ownerId = String(proj.user_id || proj.author_id || "")
                    return (
                      <div
                        key={proj.id}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: "1px solid #f2e7de",
                          backgroundColor: "#fffdfa",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
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
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>
                            {formatRelativeTime(proj.updated_at || proj.created_at, referenceNowMs)}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                          {proj.title}
                        </p>
                        <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                          {proj.summary || proj.description || proj.category || "Workspace project"}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "#64748b",
                            margin: 0,
                            paddingTop: 8,
                            borderTop: "1px solid #f2e7de",
                          }}
                        >
                          Innovator: {profileNameById.get(ownerId) || "Student"}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

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
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Student Digital Portfolios ({portfolios.length})
                </h2>
                <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                  Showcased innovation prototypes and competition-ready student portfolios.
                </p>
              </div>

              {portfolios.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No student portfolios published yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {portfolios.map((pt) => (
                    <div
                      key={pt.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
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
                          {pt.status || "Verified Portfolio"}
                        </span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                          {formatFullDate(pt.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        {pt.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                        {pt.student_name || profileNameById.get(String(pt.user_id || "")) || "Student"} •{" "}
                        {pt.category || "STEM Innovation"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

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
                    Idea Bank ({ideas.length})
                  </h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Curated innovation prompts published to student workspaces.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddIdeaForm((prev) => !prev)}
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
                  {showAddIdeaForm ? "Close Form" : "+ Add New Idea"}
                </button>
              </div>

              {showAddIdeaForm && (
                <form
                  onSubmit={handleAddIdea}
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
                      value={ideaForm.title}
                      onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                      placeholder="Idea Title *"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    />
                    <select
                      value={ideaForm.category}
                      onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    >
                      <option>Computer Science &amp; IoT</option>
                      <option>Environmental Engineering</option>
                      <option>Biotechnology &amp; Health</option>
                      <option>STEM Simulation &amp; EdTech</option>
                    </select>
                    <select
                      value={ideaForm.difficulty}
                      onChange={(e) => setIdeaForm({ ...ideaForm, difficulty: e.target.value })}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#ffffff",
                        padding: "8px 12px",
                      }}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={ideaForm.summary}
                    onChange={(e) => setIdeaForm({ ...ideaForm, summary: e.target.value })}
                    placeholder="Problem statement & expected prototype *"
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
                      onClick={() => setShowAddIdeaForm(false)}
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
                      disabled={submittingIdea}
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
                      {submittingIdea ? "Publishing..." : "Publish Idea"}
                    </button>
                  </div>
                </form>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {ideas.map((idea) => (
                  <div
                    key={idea.id}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid #f2e7de",
                      backgroundColor: "#fffdfa",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                        {idea.title}
                      </p>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          marginBottom: 6,
                        }}
                      >
                        {idea.category || idea.research_field || "General"}
                      </span>
                      <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                        {idea.summary || idea.description || "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteIdea(idea)}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                    Complete competition schedules synced to Student Competition Target.
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
                      Cards
                    </button>
                  </div>

                  <select
                    aria-label="Filter by month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
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
                    onClick={() => setShowAddCompetitionForm((prev) => !prev)}
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

              {filteredCompetitions.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 24 }}>
                  No competitions found.
                </p>
              ) : compViewMode === "calendar" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {competitionsByDate.map(([dateKey, items]) => (
                    <div
                      key={dateKey}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #ebdcd0",
                        backgroundColor: "#fffdfa",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingBottom: 8,
                          borderBottom: "1px solid #f2e7de",
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}>
                          {dateKey}
                        </span>
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
                          {items.length} event{items.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {items.map((comp) => (
                          <div
                            key={comp.id}
                            style={{
                              borderRadius: 10,
                              border: "1px solid #f2e7de",
                              backgroundColor: "#ffffff",
                              padding: 12,
                              fontSize: 12,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
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
                                {comp.status_badge || "Open"}
                              </span>
                              <span style={{ fontSize: 10, color: "#64748b" }}>
                                {comp.level || "National"}
                              </span>
                            </div>
                            <p style={{ fontWeight: 700, color: "#0f172a", margin: "6px 0 2px" }}>
                              {comp.title}
                            </p>
                            <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                              Organizer: <b>{comp.organizer || "-"}</b>
                            </p>
                            <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                              {comp.category || "STEM"} • {comp.jenjang || "Students"} •{" "}
                              {comp.schedule_type || comp.location || "Online"}
                            </p>
                            {comp.fee_label && (
                              <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                                Fee: {comp.fee_label}
                              </p>
                            )}
                            {(comp.description || comp.notes) && (
                              <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>
                                {comp.description || comp.notes}
                              </p>
                            )}
                            <div
                              style={{
                                marginTop: 8,
                                paddingTop: 6,
                                borderTop: "1px solid #f5ece5",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 11,
                              }}
                            >
                              {comp.official_url ? (
                                <a
                                  href={comp.official_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontWeight: 600, color: "#b45309", textDecoration: "none" }}
                                >
                                  Official Link ↗
                                </a>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>No link</span>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleDeleteCompetition(comp)}
                                style={{
                                  border: "none",
                                  backgroundColor: "transparent",
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
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {filteredCompetitions.map((comp) => (
                    <div
                      key={comp.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: "1px solid #f2e7de",
                        backgroundColor: "#fffdfa",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
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
                      <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 13, margin: "8px 0 2px" }}>
                        {comp.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                        Organizer: <b>{comp.organizer || "-"}</b> • {comp.level || "National"}
                      </p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                        Category: {comp.category || "-"} | Level: {comp.jenjang || "-"} | Mode:{" "}
                        {comp.schedule_type || comp.location || "-"}
                      </p>
                      {comp.fee_label && (
                        <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                          Registration: {comp.fee_label}
                        </p>
                      )}
                      {(comp.description || comp.notes) && (
                        <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>
                          {comp.description || comp.notes}
                        </p>
                      )}
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid #f2e7de",
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                        }}
                      >
                        {comp.official_url ? (
                          <a
                            href={comp.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontWeight: 600, color: "#b45309", textDecoration: "none" }}
                          >
                            Official Website ↗
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Synced to Student Target</span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteCompetition(comp)}
                          style={{
                            border: "none",
                            backgroundColor: "transparent",
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

          {activeNav === "reports" && (
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
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mentorReports.map((rep) => {
                    const mentorLabel =
                      rep.mentor_name ||
                      (rep.mentor_id ? profileNameById.get(String(rep.mentor_id)) : null) ||
                      "PLEGO Mentor"
                    return (
                      <div
                        key={rep.id}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: "1px solid #f2e7de",
                          backgroundColor: "#fffdfa",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          )}
        </main>
      </div>

      {selectedAccount && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          onClick={() => setSelectedAccount(null)}
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
              maxWidth: 448,
              borderRadius: 16,
              border: "1px solid #ebdcd0",
              backgroundColor: "#ffffff",
              padding: 20,
              fontSize: 12,
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
                  {selectedAccount.full_name || selectedAccount.name || "Unnamed User"}
                </h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                  {selectedAccount.email || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
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
              {String(selectedAccount.role || "").toLowerCase() === "mentor" && (
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
              )}
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
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
  )
}