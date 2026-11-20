"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type TimelineStep = {
  title: string
  status: string
  due_date?: string | null
}

type PortfolioProject = {
  id: number | string
  raw_project_id?: string | number | null
  title: string
  tagline: string
  problem_statement: string
  how_it_works: string
  step_by_step_guide: string
  sketch_image_url?: string | null
  category: string
  feasibility_score: string
  status: string
  materials_and_tech: string[]
  timeline_steps: TimelineStep[]
  lead_name: string
  team_name: string
  demo_url?: string
  team_id?: string | number | null
  lead_id?: string | null
  user_id?: string | null
}

function capitalizeMaterialItem(label: string): string {
  const cleaned = label.trim()
  if (!cleaned) return ''

  const wordsCapitalized = cleaned
    .split(/(\s+|-|:)/)
    .map((part) => {
      if (!part || /^(\s+|-|:)$/.test(part)) return part
      const lower = part.toLowerCase()
      if (lower === 'bit') return 'Bit'
      if (lower === 'iot') return 'IoT'
      if (lower === 'ai') return 'AI'
      if (lower === 'led') return 'LED'
      if (lower === 'pcb') return 'PCB'
      if (lower === 'usb') return 'USB'
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')

  return wordsCapitalized.replace(/\bbit\b/gi, 'Bit')
}

function parseListField(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => capitalizeMaterialItem(String(item)))
      .filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .replace(/[{}]/g, '')
      .split(/,|\n/)
      .map((item) => capitalizeMaterialItem(item.replace(/^["']|["']$/g, '')))
      .filter(Boolean)
  }
  return []
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const DEFAULT_WORKSPACE_FLOW: TimelineStep[] = [
  { title: '1. Concept Capture & Problem Framing (Idea Bank)', status: 'Completed' },
  { title: '2. Material Preparation & Sketch Design', status: 'Completed' },
  { title: '3. Core Prototype Assembly (Project Workspace)', status: 'Completed' },
  { title: '4. Testing, Iteration & Prototype Notes', status: 'Completed' },
  { title: '5. Final Mentor Review & Approval', status: 'Approved' },
]

export default function PortfolioPage() {
  const { isDarkMode } = useTheme()
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [currentLeadName, setCurrentLeadName] = useState<string>('Lead')
  const [currentTeamName, setCurrentTeamName] = useState<string>('Innovation Team')
  const [teamMemberCount, setTeamMemberCount] = useState<number>(1)

  // State untuk Modal Add Project
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTagline, setNewTagline] = useState('')
  const [newCategory, setNewCategory] = useState('EdTech & AI')
  const [newScore, setNewScore] = useState('')
  const [newStatus, setNewStatus] = useState('Approved by Mentor')
  const [newMaterials, setNewMaterials] = useState('')
  const [newLeadName, setNewLeadName] = useState('')
  const [newDemoUrl, setNewDemoUrl] = useState('')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const loadTeamPortfolio = useCallback(async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      setProjects([])
      setLoading(false)
      return
    }

    const userId = session.user.id
    const userEmail = (session.user.email || '').trim().toLowerCase()
    setCurrentUserId(userId)

    const authFullName =
      typeof session.user.user_metadata?.full_name === 'string' &&
      session.user.user_metadata.full_name.trim()
        ? session.user.user_metadata.full_name.trim()
        : userEmail
        ? userEmail.split('@')[0]
        : 'Lead'

    const [
      { data: teamsData },
      { data: allTeamMembers },
      { data: profilesData },
      { data: ideasData },
      { data: projectTasksData },
    ] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('team_members').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('ideas').select('*'),
      supabase.from('project_tasks').select('*').order('id', { ascending: true }),
    ])

    const profileNameById = new Map<string, string>()
    for (const pr of Array.isArray(profilesData) ? profilesData : []) {
      const rec = (pr || {}) as Record<string, unknown>
      const pName =
        typeof rec.full_name === 'string' && rec.full_name.trim()
          ? rec.full_name.trim()
          : typeof rec.name === 'string' && rec.name.trim()
          ? rec.name.trim()
          : ''
      if (rec.id && pName) profileNameById.set(String(rec.id), pName)
    }

    const ideasList: Record<string, unknown>[] = (
      Array.isArray(ideasData) ? ideasData : []
    ).map((item) => (item || {}) as Record<string, unknown>)

    const ideaById = new Map<string, Record<string, unknown>>()
    const ideaByTitle = new Map<string, Record<string, unknown>>()
    for (const idea of ideasList) {
      if (idea.id !== undefined && idea.id !== null) {
        ideaById.set(String(idea.id), idea)
      }
      if (typeof idea.title === 'string' && idea.title.trim()) {
        ideaByTitle.set(idea.title.trim().toLowerCase(), idea)
      }
    }

    // Ambil timeline progress dari tabel project_tasks (fleksibel untuk project_id, project_code, atau team_id)
    const tasksList: Record<string, unknown>[] = (
      Array.isArray(projectTasksData) ? projectTasksData : []
    ).map((t) => (t || {}) as Record<string, unknown>)

    const tasksByKey = new Map<string, TimelineStep[]>()
    for (const task of tasksList) {
      const keys = [
        task.project_id !== undefined && task.project_id !== null ? `id:${task.project_id}` : '',
        typeof task.project_code === 'string' && task.project_code.trim()
          ? `code:${task.project_code.trim()}`
          : '',
        task.team_id !== undefined && task.team_id !== null ? `team:${task.team_id}` : '',
      ].filter(Boolean)

      if (keys.length === 0) continue

      const rawStatus = String(
        task.status || (task.is_completed ? 'Completed' : 'In Progress')
      )
      const stepItem: TimelineStep = {
        title: String(task.title || task.task_name || task.name || 'Workspace Task'),
        status:
          rawStatus.toLowerCase() === 'done' || rawStatus.toLowerCase() === 'completed'
            ? 'Completed'
            : rawStatus,
        due_date: typeof task.due_date === 'string' ? task.due_date : null,
      }

      for (const k of keys) {
        const list = tasksByKey.get(k) || []
        list.push(stepItem)
        tasksByKey.set(k, list)
      }
    }

    const teamsArr: Record<string, unknown>[] = (
      Array.isArray(teamsData) ? teamsData : []
    ).map((t) => (t || {}) as Record<string, unknown>)

    const allMembersArr: Record<string, unknown>[] = (
      Array.isArray(allTeamMembers) ? allTeamMembers : []
    ).map((m) => (m || {}) as Record<string, unknown>)

    const profileSelfName = profileNameById.get(userId) || authFullName

    // Cari keanggotaan user di team_members secara fleksibel (id / email / nama)
    const matchedMemberRow = allMembersArr.find((m) => {
      const mUid = String(m.user_id ?? m.student_id ?? m.member_id ?? m.profile_id ?? '')
      const mEmail = typeof m.email === 'string' ? m.email.trim().toLowerCase() : ''
      const mName = typeof m.name === 'string' ? m.name.trim().toLowerCase() : ''
      return (
        (mUid && mUid === userId) ||
        (userEmail && mEmail && mEmail === userEmail) ||
        (profileSelfName && mName && mName === profileSelfName.toLowerCase())
      )
    })

    const matchedTeam: Record<string, unknown> | null =
      (matchedMemberRow?.team_id
        ? teamsArr.find((t) => String(t.id) === String(matchedMemberRow.team_id))
        : null) ||
      teamsArr.find((t) => {
        const lead = String(t.lead_id ?? t.leader_id ?? t.user_id ?? t.student_id ?? '')
        return lead && lead === userId
      }) ||
      teamsArr[0] ||
      null

    const resolvedTeamId = matchedTeam?.id ? String(matchedTeam.id) : null
    setCurrentTeamId(resolvedTeamId)

    const resolvedTeamName: string = String(
      (typeof matchedTeam?.team_name === 'string' && matchedTeam.team_name.trim()) ||
        (typeof matchedTeam?.name === 'string' && matchedTeam.name.trim()) ||
        'Innovation Team'
    )

    const sameTeamMembers = resolvedTeamId
      ? allMembersArr.filter((m) => m.team_id && String(m.team_id) === resolvedTeamId)
      : []

    const leaderMember = sameTeamMembers.find((m) => {
      const roleStr = typeof m.role === 'string' ? m.role.toLowerCase() : ''
      return roleStr.includes('lead') || roleStr.includes('ketua')
    })

    const teamLeadId =
      matchedTeam?.lead_id ??
      matchedTeam?.leader_id ??
      matchedTeam?.user_id ??
      matchedTeam?.student_id ??
      leaderMember?.user_id ??
      leaderMember?.student_id ??
      null

    const profileLeadName = teamLeadId ? profileNameById.get(String(teamLeadId)) : undefined

    const resolvedLeadName: string = String(
      (typeof matchedTeam?.lead_name === 'string' && matchedTeam.lead_name.trim()) ||
        (typeof leaderMember?.name === 'string' && leaderMember.name.trim()) ||
        profileLeadName ||
        (typeof matchedMemberRow?.name === 'string' && matchedMemberRow.name.trim()) ||
        profileSelfName
    )

    setCurrentTeamName(resolvedTeamName)
    setCurrentLeadName(resolvedLeadName)
    setNewLeadName((prev) => prev || resolvedLeadName)

    const allowedIds = new Set<string>([userId])
    if (teamLeadId) allowedIds.add(String(teamLeadId))

    const allowedTokens = new Set<string>([
      resolvedLeadName.toLowerCase(),
      resolvedTeamName.toLowerCase(),
      profileSelfName.toLowerCase(),
    ])

    let memberCount = 1
    if (sameTeamMembers.length > 0) {
      memberCount = sameTeamMembers.length
      for (const m of sameTeamMembers) {
        const mUid = String(m.user_id ?? m.student_id ?? m.member_id ?? m.profile_id ?? '')
        if (mUid) allowedIds.add(mUid)
        if (typeof m.name === 'string' && m.name.trim()) {
          allowedTokens.add(m.name.trim().toLowerCase())
        }
      }
    }
    setTeamMemberCount(memberCount)

    const [{ data: portfolioData, error: portfolioErr }, { data: approvedProjectsData }] =
      await Promise.all([
        supabase.from('portfolio_projects').select('*').order('id', { ascending: false }),
        supabase
          .from('projects')
          .select('*')
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false }),
      ])

    const belongsToCurrentTeam = (rawRow: unknown): boolean => {
      const row = (rawRow || {}) as Record<string, unknown>
      const rowTeamId = row.team_id ? String(row.team_id) : null
      if (resolvedTeamId && rowTeamId && rowTeamId === resolvedTeamId) {
        return true
      }

      const ownerId = String(row.lead_id ?? row.user_id ?? row.author_id ?? row.owner_id ?? '')
      if (ownerId && allowedIds.has(ownerId)) {
        return true
      }

      const authorField =
        typeof row.author_name === 'string' ? row.author_name.trim().toLowerCase() : ''
      if (authorField) {
        for (const token of allowedTokens) {
          if (token && (authorField === token || authorField.includes(token))) {
            return true
          }
        }
      }

      return false
    }

    const approvedRows: Record<string, unknown>[] = (
      Array.isArray(approvedProjectsData) ? approvedProjectsData : []
    ).map((p) => (p || {}) as Record<string, unknown>)

    const approvedItems: PortfolioProject[] = approvedRows
      .filter((proj) => belongsToCurrentTeam(proj))
      .map((proj, idx) => {
        const pct = Number(proj.progress_percentage ?? 100) || 100
        const titleStr = String(proj.title || 'Validated Innovation Project')
        const linkedIdea =
          (proj.id !== undefined && ideaById.get(String(proj.id))) ||
          ideaByTitle.get(titleStr.trim().toLowerCase()) ||
          null

        const rawMaterials = parseListField(
          linkedIdea?.materials_needed ?? proj.materials_needed ?? proj.tech_stack
        )

        const rawId = proj.id
        const safeId: string | number =
          typeof rawId === 'string' || typeof rawId === 'number'
            ? `approved-${rawId}`
            : `approved-${idx}`

        const projectTasks =
          (rawId !== undefined && rawId !== null && tasksByKey.get(`id:${rawId}`)) ||
          (typeof proj.project_code === 'string' &&
            proj.project_code.trim() &&
            tasksByKey.get(`code:${proj.project_code.trim()}`)) ||
          (resolvedTeamId && tasksByKey.get(`team:${resolvedTeamId}`)) ||
          []

        const overviewText = String(
          proj.subtitle ||
            proj.description ||
            linkedIdea?.description ||
            'Completed and mentor-approved innovation project published to team portfolio.'
        )

        return {
          id: safeId,
          raw_project_id:
            typeof rawId === 'string' || typeof rawId === 'number' ? rawId : null,
          title: titleStr,
          tagline: overviewText,
          problem_statement: String(
            linkedIdea?.problem_statement || proj.subtitle || overviewText
          ),
          how_it_works: String(
            linkedIdea?.how_it_works ||
              proj.description ||
              'Built and validated step-by-step through the InnovaSeed Project Workspace.'
          ),
          step_by_step_guide: String(
            linkedIdea?.step_by_step_guide ||
              '1. Ideation & Problem Discovery\n2. Sketching & Material Selection\n3. Prototype Assembly & Testing\n4. Mentor Evaluation & Approval'
          ),
          sketch_image_url:
            typeof linkedIdea?.sketch_image_url === 'string'
              ? linkedIdea.sketch_image_url
              : null,
          category: String(proj.category || 'EdTech & AI'),
          feasibility_score: `${pct}%`,
          status: 'Approved by Mentor',
          materials_and_tech:
            rawMaterials.length > 0 ? rawMaterials : ['Project Materials & Prototype Kit'],
          timeline_steps:
            projectTasks.length > 0 ? projectTasks : DEFAULT_WORKSPACE_FLOW,
          lead_name: resolvedLeadName,
          team_name: resolvedTeamName,
          demo_url:
            typeof proj.demo_url === 'string' && proj.demo_url.trim() ? proj.demo_url : '#',
          team_id:
            typeof proj.team_id === 'string' || typeof proj.team_id === 'number'
              ? proj.team_id
              : resolvedTeamId,
          lead_id:
            typeof proj.lead_id === 'string'
              ? proj.lead_id
              : typeof proj.user_id === 'string'
              ? proj.user_id
              : null,
        }
      })

    const portfolioRows: Record<string, unknown>[] =
      !portfolioErr && Array.isArray(portfolioData)
        ? portfolioData.map((r) => (r || {}) as Record<string, unknown>)
        : []

    const manualTeamItems: PortfolioProject[] = portfolioRows
      .filter((row) => belongsToCurrentTeam(row))
      .map((row, idx) => {
        const rawId = row.id
        const safeId: string | number =
          typeof rawId === 'string' || typeof rawId === 'number' ? rawId : `pf-${idx}`

        const parsedItems = parseListField(row.tech_stack)
        const rawAuthor = typeof row.author_name === 'string' ? row.author_name.trim() : ''
        const displayLead =
          rawAuthor && rawAuthor.toLowerCase() !== resolvedTeamName.toLowerCase()
            ? rawAuthor
            : resolvedLeadName

        const overviewText = String(row.tagline || '')

        return {
          id: safeId,
          title: String(row.title || 'Team Project'),
          tagline: overviewText,
          problem_statement: overviewText,
          how_it_works: overviewText,
          step_by_step_guide:
            '1. Concept & Planning\n2. Prototype Construction\n3. Testing & Refinement\n4. Final Presentation',
          category: String(row.category || 'EdTech & AI'),
          feasibility_score: String(row.feasibility_score || '100%'),
          status: String(row.status || 'Prototype Validated'),
          materials_and_tech:
            parsedItems.length > 0 ? parsedItems : ['Project Materials & Prototype Kit'],
          timeline_steps: DEFAULT_WORKSPACE_FLOW,
          lead_name: displayLead,
          team_name: resolvedTeamName,
          demo_url: typeof row.demo_url === 'string' ? row.demo_url : '#',
          team_id:
            typeof row.team_id === 'string' || typeof row.team_id === 'number'
              ? row.team_id
              : resolvedTeamId,
          lead_id:
            typeof row.lead_id === 'string'
              ? row.lead_id
              : typeof row.user_id === 'string'
              ? row.user_id
              : null,
        }
      })

    const seenTitles = new Set(approvedItems.map((p) => p.title.trim().toLowerCase()))
    const uniqueManualItems = manualTeamItems.filter(
      (m) => !seenTitles.has(m.title.trim().toLowerCase())
    )

    setProjects([...approvedItems, ...uniqueManualItems])
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      if (!isMounted) return
      await loadTeamPortfolio()
    }

    void init()

    const channel = supabase
      .channel('realtime-team-private-portfolio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        if (isMounted) void loadTeamPortfolio()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_projects' }, () => {
        if (isMounted) void loadTeamPortfolio()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, () => {
        if (isMounted) void loadTeamPortfolio()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, () => {
        if (isMounted) void loadTeamPortfolio()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        if (isMounted) void loadTeamPortfolio()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        if (isMounted) void loadTeamPortfolio()
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [loadTeamPortfolio])

  function openPdfPrintWindow(targetProjects: PortfolioProject[], docTitle: string) {
    if (targetProjects.length === 0) {
      showToast('Belum ada proyek yang disetujui untuk dicetak ke PDF.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=960,height=780')
    if (!printWindow) {
      showToast('Pop-up diblokir browser. Izinkan pop-up untuk menyimpan PDF.')
      return
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const cardsHtml = targetProjects
      .map((proj, index) => {
        const materialsChips = proj.materials_and_tech
          .map(
            (m) =>
              `<span class="chip">${escapeHtml(capitalizeMaterialItem(m))}</span>`
          )
          .join('')

        const timelineRows = proj.timeline_steps
          .map(
            (step, stepIdx) => `
              <div class="timeline-item">
                <div class="timeline-dot">${stepIdx + 1}</div>
                <div class="timeline-content">
                  <div class="timeline-title">${escapeHtml(step.title)}</div>
                  <div class="timeline-meta">
                    <span class="status-pill">${escapeHtml(step.status)}</span>
                    ${step.due_date ? `<span>• ${escapeHtml(step.due_date)}</span>` : ''}
                  </div>
                </div>
              </div>
            `
          )
          .join('')

        return `
          <section class="project-card ${index > 0 ? 'page-break' : ''}">
            <div class="card-top">
              <div>
                <span class="badge-category">${escapeHtml(proj.category)}</span>
                <span class="badge-status">✓ ${escapeHtml(proj.status)}</span>
              </div>
              <div class="score-box">
                <span class="score-label">FEASIBILITY SCORE</span>
                <span class="score-val">${escapeHtml(proj.feasibility_score)}</span>
              </div>
            </div>

            <h2 class="project-title">${escapeHtml(proj.title)}</h2>

            <div class="meta-strip">
              <div>
                <span class="meta-label">LEAD</span>
                <strong>${escapeHtml(proj.lead_name)}</strong>
              </div>
              <div>
                <span class="meta-label">TEAM</span>
                <strong>${escapeHtml(proj.team_name)}</strong>
              </div>
              <div>
                <span class="meta-label">LEVEL</span>
                <strong>Young Innovator (SD / SMP)</strong>
              </div>
            </div>

            <div class="grid-two">
              <div class="box">
                <h3>1. Project Overview &amp; Problem</h3>
                <p>${escapeHtml(proj.tagline)}</p>
              </div>
              <div class="box">
                <h3>2. How Our Innovation Works</h3>
                <p>${escapeHtml(proj.how_it_works)}</p>
              </div>
            </div>

            <div class="box">
              <h3>3. Materials Used</h3>
              <div class="chip-wrap">${materialsChips}</div>
            </div>

            <div class="box">
              <h3>4. Project Workspace Flow &amp; Timeline</h3>
              <div class="timeline-list">${timelineRows}</div>
            </div>

            <div class="box">
              <h3>5. Build Steps &amp; Prototype Summary</h3>
              <p class="pre-line">${escapeHtml(proj.step_by_step_guide)}</p>
            </div>
          </section>
        `
      })
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(docTitle)}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fffaf5;
            color: #221a12;
            padding: 28px;
            line-height: 1.5;
          }
          .header-banner {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #0f172a;
            border-radius: 18px;
            padding: 22px 26px;
            margin-bottom: 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-banner h1 { font-size: 22px; font-weight: 800; }
          .header-banner p { font-size: 12px; font-weight: 600; opacity: 0.9; margin-top: 2px; }
          .header-right { text-align: right; font-size: 11px; font-weight: 700; }
          .project-card {
            background: #ffffff;
            border: 1.5px solid #e7d5c3;
            border-radius: 18px;
            padding: 22px;
            margin-bottom: 22px;
          }
          .page-break { page-break-before: always; }
          .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .badge-category {
            background: #fff1e5;
            color: #855300;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 8px;
            margin-right: 6px;
          }
          .badge-status {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 8px;
          }
          .score-box { text-align: right; }
          .score-label { display: block; font-size: 9px; color: #78716c; font-weight: 700; }
          .score-val { font-size: 16px; font-weight: 800; color: #d97706; }
          .project-title { font-size: 20px; font-weight: 800; margin-bottom: 12px; color: #1c1917; }
          .meta-strip {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            background: #fff5eb;
            border: 1px solid #ecd9c6;
            border-radius: 12px;
            padding: 10px 14px;
            margin-bottom: 14px;
            font-size: 12px;
          }
          .meta-label { display: block; font-size: 9px; color: #78716c; font-weight: 700; }
          .grid-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .box {
            border: 1px solid #efe2d4;
            background: #fffdfb;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 12px;
          }
          .box h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #b45309;
            margin-bottom: 6px;
          }
          .box p { font-size: 12px; color: #3f3326; }
          .pre-line { white-space: pre-line; }
          .chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
          .chip {
            background: #fbebdd;
            border: 1px solid #d8c3ad;
            border-radius: 6px;
            padding: 3px 9px;
            font-size: 11px;
            font-weight: 600;
          }
          .timeline-list { display: flex; flex-direction: column; gap: 8px; }
          .timeline-item { display: flex; align-items: flex-start; gap: 10px; }
          .timeline-dot {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #f59e0b;
            color: #0f172a;
            font-size: 10px;
            font-weight: 800;
            display: grid;
            place-items: center;
            flex-shrink: 0;
            margin-top: 2px;
          }
          .timeline-title { font-size: 12px; font-weight: 700; }
          .timeline-meta { font-size: 10px; color: #78716c; }
          .status-pill { color: #047857; font-weight: 700; }
          @media print {
            body { background: #ffffff; padding: 0; }
            .project-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <h1>InnovaSeed — Student Innovation Portfolio</h1>
            <p>Team: ${escapeHtml(currentTeamName)} • Lead: ${escapeHtml(currentLeadName)}</p>
          </div>
          <div class="header-right">
            <div>Young Innovator Showcase</div>
            <div>Issued: ${escapeHtml(generatedDate)}</div>
          </div>
        </div>
        ${cardsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    showToast('Menyiapkan tampilan PDF — pilih "Save as PDF" di dialog cetak!')
  }

  function handleDownloadPortfolioPdf() {
    openPdfPrintWindow(projects, `${currentTeamName} - Innovation Portfolio`)
  }

  function handleDownloadSingleProjectPdf(proj: PortfolioProject) {
    openPdfPrintWindow([proj], `${proj.title} - Project Portfolio`)
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault()

    const materialArray = newMaterials
      .split(',')
      .map((t) => capitalizeMaterialItem(t))
      .filter(Boolean)

    const resolvedLead = newLeadName.trim() || currentLeadName

    const basePayload: Record<string, unknown> = {
      title: newTitle,
      tagline: newTagline,
      category: newCategory,
      feasibility_score: newScore || '100%',
      status: newStatus,
      tech_stack: materialArray,
      author_name: resolvedLead,
      demo_url: newDemoUrl || '#',
    }

    const withTeamAndLeadPayload: Record<string, unknown> = {
      ...basePayload,
      ...(currentTeamId ? { team_id: currentTeamId } : {}),
      ...(currentUserId ? { lead_id: currentUserId } : {}),
    }

    let { data, error } = await supabase
      .from('portfolio_projects')
      .insert([withTeamAndLeadPayload])
      .select()

    if (error && (error.code === '42703' || error.message.toLowerCase().includes('column'))) {
      const retry = await supabase.from('portfolio_projects').insert([basePayload]).select()
      data = retry.data
      error = retry.error
    }

    if (!error && Array.isArray(data) && data[0]) {
      const inserted = data[0] as Record<string, unknown>
      const rawId = inserted.id
      const overviewText = String(inserted.tagline || newTagline)
      const createdItem: PortfolioProject = {
        id:
          typeof rawId === 'string' || typeof rawId === 'number'
            ? rawId
            : `pf-${Date.now()}`,
        title: String(inserted.title || newTitle),
        tagline: overviewText,
        problem_statement: overviewText,
        how_it_works: overviewText,
        step_by_step_guide:
          '1. Concept & Planning\n2. Prototype Construction\n3. Testing & Refinement\n4. Final Presentation',
        category: String(inserted.category || newCategory),
        feasibility_score: String(inserted.feasibility_score || newScore || '100%'),
        status: String(inserted.status || newStatus),
        materials_and_tech:
          parseListField(inserted.tech_stack).length > 0
            ? parseListField(inserted.tech_stack)
            : materialArray.length > 0
            ? materialArray
            : ['Project Materials & Prototype Kit'],
        timeline_steps: DEFAULT_WORKSPACE_FLOW,
        lead_name: String(inserted.author_name || resolvedLead),
        team_name: currentTeamName,
        demo_url:
          typeof inserted.demo_url === 'string' ? inserted.demo_url : newDemoUrl || '#',
      }

      setProjects([createdItem, ...projects])
      setIsAddModalOpen(false)
      setNewTitle('')
      setNewTagline('')
      setNewScore('')
      setNewMaterials('')
      setNewLeadName(currentLeadName)
      setNewDemoUrl('')
      showToast('Project saved to your team portfolio!')
    } else {
      showToast('Failed to add project. Periksa skema atau RLS tabel portfolio_projects.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 mb-1.5">
            <i className="fa-solid fa-lock text-[10px]"></i>
            <span>
              {currentTeamName} • Lead: {currentLeadName}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold">Team Portfolio &amp; Showcase 🌟</h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDarkMode ? 'text-slate-400' : 'text-[#534434]'
            }`}
          >
            Student Innovation Portfolio for {currentTeamName} ({teamMemberCount}{' '}
            {teamMemberCount === 1 ? 'member' : 'members'}). Displays mentor-approved projects &amp;
            workspace journey.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewLeadName(currentLeadName)
              setIsAddModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> Add Project
          </button>

          <button
            type="button"
            onClick={handleDownloadPortfolioPdf}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border transition shadow-sm cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
            }`}
          >
            <i className="fa-solid fa-file-pdf text-rose-500"></i> Download PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">
          Loading your team portfolio...
        </div>
      ) : projects.length === 0 ? (
        <div
          className={`border rounded-2xl p-12 text-center space-y-2 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <p className="text-sm font-bold">No mentor-approved projects in your portfolio yet</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Complete your milestones, request mentor review, and once your mentor approves the
            project, it will appear here for your team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`border rounded-2xl p-6 flex flex-col justify-between shadow-xs transition-colors ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-amber-500/50'
                  : 'bg-white border-[#d8c3ad] hover:border-amber-400'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${
                      isDarkMode
                        ? 'bg-slate-800 text-amber-400'
                        : 'bg-[#fff1e5] text-[#855300]'
                    }`}
                  >
                    {proj.category}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    {proj.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold tracking-tight">{proj.title}</h3>
                <p
                  className={`text-xs leading-relaxed ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  {proj.tagline}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {proj.materials_and_tech?.map((item, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isDarkMode
                          ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                          : 'bg-[#fbebdd]/60 border-[#d8c3ad] text-slate-700'
                      }`}
                    >
                      {capitalizeMaterialItem(item)}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={`mt-6 pt-4 border-t flex items-center justify-between gap-2 ${
                  isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'
                }`}
              >
                <div className="text-[11px]">
                  <span className="text-slate-400 block uppercase text-[9px]">
                    Feasibility Score
                  </span>
                  <b className="text-amber-500 font-extrabold">{proj.feasibility_score}</b>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProject(proj)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <div
              className={`flex justify-between items-center border-b pb-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'
              }`}
            >
              <h3 className="font-bold text-base flex items-center gap-2">
                <i className="fa-solid fa-circle-plus text-amber-500"></i> Add Project to Team
                Portfolio
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={(e) => void handleAddProject(e)} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Recycled Cardboard Marble Maze Challenge"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Project Overview</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ringkasan masalah, solusi, dan dampak proyek..."
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <option value="EdTech & AI">EdTech &amp; AI</option>
                    <option value="IoT & Environmental">IoT &amp; Environmental</option>
                    <option value="Mobile Application">Mobile Application</option>
                    <option value="Robotics & Hardware">Robotics &amp; Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <option value="Approved by Mentor">Approved by Mentor</option>
                    <option value="Prototype Validated">Prototype Validated</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Feasibility Rating</label>
                  <input
                    placeholder="e.g. 100%"
                    type="text"
                    value={newScore}
                    onChange={(e) => setNewScore(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Lead</label>
                  <input
                    placeholder="e.g. Nama Lead"
                    type="text"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 outline-none border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Materials Used (pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Recycled Cardboard, Marbles, Micro:Bit, Ruler"
                  value={newMaterials}
                  onChange={(e) => setNewMaterials(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Live Demo URL (Opsional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newDemoUrl}
                  onChange={(e) => setNewDemoUrl(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 outline-none border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4 border ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <div
              className={`flex justify-between items-center border-b pb-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'
              }`}
            >
              <div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    isDarkMode
                      ? 'bg-slate-800 text-amber-400'
                      : 'bg-[#fff1e5] text-[#855300]'
                  }`}
                >
                  {selectedProject.category}
                </span>
                <h3 className="font-bold text-lg mt-1">{selectedProject.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <h4 className="font-semibold text-slate-400 uppercase text-[10px] mb-1">
                  Project Overview
                </h4>
                <p>{selectedProject.tagline}</p>
              </div>

              <div
                className={`p-3 rounded-xl border grid grid-cols-2 gap-3 ${
                  isDarkMode
                    ? 'bg-slate-800/60 border-slate-700'
                    : 'bg-[#fff1e5]/60 border-[#d8c3ad]'
                }`}
              >
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Lead</span>
                  <b className="text-xs block">{selectedProject.lead_name}</b>
                  <span className="text-[10px] text-slate-500">
                    Team: {selectedProject.team_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Feasibility Rating
                  </span>
                  <b className="text-xs text-amber-500 font-extrabold">
                    {selectedProject.feasibility_score}
                  </b>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-400 uppercase text-[10px] mb-1">
                  Materials Used
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.materials_and_tech?.map((item, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-[#fbebdd] border-[#d8c3ad] text-slate-700'
                      }`}
                    >
                      {capitalizeMaterialItem(item)}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-400 uppercase text-[10px] mb-1.5">
                  Project Workspace Timeline &amp; Flow
                </h4>
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    isDarkMode
                      ? 'bg-slate-800/40 border-slate-700'
                      : 'bg-[#fff8f4] border-[#d8c3ad]'
                  }`}
                >
                  {selectedProject.timeline_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center text-[9px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{step.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadSingleProjectPdf(selectedProject)}
                className={`px-4 py-2 text-xs font-semibold border rounded-xl cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-[#fff8f4] border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
                }`}
              >
                <i className="fa-solid fa-file-pdf text-rose-500"></i> Download PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">Success</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}