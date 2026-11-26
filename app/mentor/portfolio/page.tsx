"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'
import { CountUp } from '@/components/motion/count-up'

type MentoredCompetition = {
  id: string
  competitionTitle: string
  studentName: string
  studentId: string
  completedItems: number
  totalItems: number
  firstAssigned?: string | null
  lastActivity?: string | null
}

type PrepDetailItem = {
  id: string
  studentId: string
  competitionTitle: string
  title: string
  category: string
  dueDate?: string | null
  instructions?: string | null
  isCompleted: boolean
}

type MentoringExperience = {
  studentId: string
  studentName: string
  competitionCount: number
  competitions: string[]
  checklistDone: number
  checklistTotal: number
  firstActivity?: string | null
  lastActivity?: string | null
}

function formatMonthYear(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default function MentorPortfolioPage() {
  const { isDarkMode } = useTheme()

  const [loading, setLoading] = useState(true)
  const [mentorName, setMentorName] = useState('Mentor')
  const [mentorCode, setMentorCode] = useState('')
  const [competitions, setCompetitions] = useState<MentoredCompetition[]>([])
  const [experiences, setExperiences] = useState<MentoringExperience[]>([])
  const [projectsApproved, setProjectsApproved] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [prepDetails, setPrepDetails] = useState<PrepDetailItem[]>([])
  const [detailTarget, setDetailTarget] = useState<MentoredCompetition | null>(null)

  const notify = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const loadPortfolio = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return
      const mentorId = session.user.id

      // 1. Mentor profile (name + code)
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, name, mentor_code')
        .eq('id', mentorId)
        .maybeSingle()
      const p = (prof || {}) as Record<string, unknown>
      const resolvedName =
        (typeof p.full_name === 'string' && p.full_name.trim()) ||
        (typeof p.name === 'string' && p.name.trim()) ||
        (typeof session.user.email === 'string' ? session.user.email.split('@')[0] : 'Mentor')
      setMentorName(resolvedName)
      const rawCode = typeof p.mentor_code === 'string' ? p.mentor_code.trim().toUpperCase() : ''
      setMentorCode(rawCode)

      // 2. Connected students (pairing gate)
      const studentMap = new Map<string, string>()

      const { data: linkRows } = await supabase
        .from('mentor_students')
        .select('*')
        .eq('mentor_id', mentorId)

      const linkedIds = new Set<string>()
      for (const row of (linkRows || []) as Record<string, unknown>[]) {
        const st = String(row.status || '').toLowerCase()
        const sId = String(row.student_id || row.user_id || '')
        if (sId && (!st || st === 'accepted' || st === 'active')) linkedIds.add(sId)
      }

      if (rawCode) {
        const { data: teamRows } = await supabase.from('teams').select('*')
        for (const tRow of (teamRows || []) as Record<string, unknown>[]) {
          const tCode = String(tRow.mentor_code || '').trim().toUpperCase()
          const leadId = String(tRow.lead_id ?? tRow.leader_id ?? tRow.user_id ?? '')
          if (tCode === rawCode && leadId) linkedIds.add(leadId)
        }
      }

      if (linkedIds.size > 0) {
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, name, email')
          .in('id', Array.from(linkedIds))
        for (const sp of (studentProfiles || []) as Record<string, unknown>[]) {
          const nm =
            (typeof sp.full_name === 'string' && sp.full_name.trim()) ||
            (typeof sp.name === 'string' && sp.name.trim()) ||
            (typeof sp.email === 'string' ? sp.email.split('@')[0] : '') ||
            'Student'
          studentMap.set(String(sp.id), nm)
        }
      }

      const visibleIds = new Set(studentMap.keys())

      // 3. Competition prep checklists assigned to my students = competition history
      const { data: prepRows } = await supabase
        .from('competition_prep_materials')
        .select('*')
        .order('created_at', { ascending: true })

      const compAgg = new Map<
        string,
        {
          title: string
          students: Map<
            string,
            { name: string; done: number; total: number; first?: string; last?: string }
          >
        }
      >()

      const scopedDetails: PrepDetailItem[] = []

      for (const [idx, raw] of ((prepRows || []) as Record<string, unknown>[]).entries()) {
        const rowStudent = String(
          raw.student_id ?? raw.studentId ?? raw.assigned_student_id ?? raw.target_student_id ?? ''
        )
        if (!rowStudent || !visibleIds.has(rowStudent)) continue

        const compTitle = String(
          raw.competition_title ?? raw.competitionTitle ?? raw.competition_name ?? 'General Prep'
        )
        const compKey = compTitle.toLowerCase()
        if (!compAgg.has(compKey)) {
          compAgg.set(compKey, { title: compTitle, students: new Map() })
        }
        const agg = compAgg.get(compKey)!
        const stRaw = String(raw.status || '').toLowerCase()
        const isDone =
          Boolean(raw.is_completed) || stRaw === 'completed' || stRaw === 'done'

        const st = agg.students.get(rowStudent) || {
          name: studentMap.get(rowStudent) || 'Student',
          done: 0,
          total: 0,
          first: (raw.created_at as string | undefined) || undefined,
          last: (raw.created_at as string | undefined) || undefined,
        }
        st.total += 1
        if (isDone) st.done += 1
        const created = raw.created_at as string | undefined
        if (created) {
          if (!st.first || new Date(created) < new Date(st.first)) st.first = created
          if (!st.last || new Date(created) > new Date(st.last)) st.last = created
        }
        agg.students.set(rowStudent, st)

        scopedDetails.push({
          id: String(raw.id ?? `prep-${idx}`),
          studentId: rowStudent,
          competitionTitle: compTitle,
          title: String(raw.title ?? raw.material_title ?? 'Preparation Deliverable'),
          category: String(raw.category ?? raw.track ?? 'Mentor Checklist'),
          dueDate: raw.due_date ? String(raw.due_date) : null,
          instructions: raw.notes
            ? String(raw.notes)
            : raw.description
            ? String(raw.description)
            : null,
          isCompleted: isDone,
        })
      }

      const compList: MentoredCompetition[] = []
      const expMap = new Map<string, MentoringExperience>()

      for (const [key, agg] of compAgg) {
        for (const [studentId, st] of agg.students) {
          compList.push({
            id: `${key}-${studentId}`,
            competitionTitle: agg.title,
            studentName: st.name,
            studentId,
            completedItems: st.done,
            totalItems: st.total,
            firstAssigned: st.first || null,
            lastActivity: st.last || null,
          })

          const exp =
            expMap.get(studentId) ||
            ({
              studentId,
              studentName: st.name,
              competitionCount: 0,
              competitions: [],
              checklistDone: 0,
              checklistTotal: 0,
              firstActivity: st.first || null,
              lastActivity: st.last || null,
            } satisfies MentoringExperience)
          exp.competitionCount += 1
          if (!exp.competitions.includes(agg.title)) exp.competitions.push(agg.title)
          exp.checklistDone += st.done
          exp.checklistTotal += st.total
          if (st.first && (!exp.firstActivity || new Date(st.first) < new Date(exp.firstActivity)))
            exp.firstActivity = st.first
          if (st.last && (!exp.lastActivity || new Date(st.last) > new Date(exp.lastActivity)))
            exp.lastActivity = st.last
          expMap.set(studentId, exp)
        }
      }

      compList.sort((a, b) => {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
        return tb - ta
      })

      setCompetitions(compList)
      setExperiences(Array.from(expMap.values()))
      setPrepDetails(scopedDetails)

      // 4. Approved projects published to portfolios for my students
      if (visibleIds.size > 0) {
        const { count, error } = await supabase
          .from('portfolio_projects')
          .select('*', { count: 'exact', head: true })
          .in('lead_id', Array.from(visibleIds))
        if (!error) setProjectsApproved(count || 0)
        else setProjectsApproved(0)
      } else {
        setProjectsApproved(0)
      }
    } catch (err) {
      console.error('Error loading mentor portfolio:', err)
      notify('Failed to load mentoring history.')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
  }, [loadPortfolio])

  const filteredModalItems = useMemo(() => {
    if (!detailTarget) return []
    return prepDetails.filter(
      (item) =>
        item.studentId === detailTarget.studentId &&
        item.competitionTitle.toLowerCase() === detailTarget.competitionTitle.toLowerCase()
    )
  }, [detailTarget, prepDetails])

  function handleDownloadHistoryPdf() {
    if (experiences.length === 0) {
      notify('No mentoring history to export yet.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=960,height=780')
    if (!printWindow) {
      notify('Pop-up blocked by the browser. Allow pop-ups to save the PDF.')
      return
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const studentRows = experiences
      .map((exp) => {
        const compChips = exp.competitions
          .map((c) => `<span class="chip">${escapeHtml(c)}</span>`)
          .join('')
        const pct =
          exp.checklistTotal > 0
            ? Math.round((exp.checklistDone / exp.checklistTotal) * 100)
            : 0
        return `
          <section class="card">
            <div class="row">
              <div>
                <h2>${escapeHtml(exp.studentName)}</h2>
                <p class="muted">${exp.competitionCount} competition(s) • since ${escapeHtml(
          formatMonthYear(exp.firstActivity) || '—'
        )}</p>
              </div>
              <div class="score-box"><span class="score-label">MILESTONES</span><span class="score-val">${exp.checklistDone}/${exp.checklistTotal}</span></div>
            </div>
            <div class="chip-wrap">${compChips}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </section>`
      })
      .join('')

    const compRows = competitions
      .map(
        (comp) => `
        <tr>
          <td><b>${escapeHtml(comp.competitionTitle)}</b><br /><span class="muted">${escapeHtml(
          formatMonthYear(comp.firstAssigned)
        )}${
          comp.firstAssigned !== comp.lastActivity
            ? ` → ${escapeHtml(formatMonthYear(comp.lastActivity))}`
            : ''
        }</span></td>
          <td>${escapeHtml(comp.studentName)}</td>
          <td class="center">${comp.completedItems} / ${comp.totalItems}</td>
        </tr>`
      )
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(`${mentorName} - Mentoring Portfolio`)}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fffaf5; color: #221a12; padding: 28px; line-height: 1.5; }
          .header-banner { background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; border-radius: 18px; padding: 22px 26px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; }
          .header-banner h1 { font-size: 22px; font-weight: 800; }
          .header-banner p { font-size: 12px; font-weight: 600; opacity: .9; margin-top: 2px; }
          .header-right { text-align: right; font-size: 11px; font-weight: 700; }
          .card { background: #fff; border: 1.5px solid #e7d5c3; border-radius: 18px; padding: 18px 22px; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
          h2 { font-size: 15px; font-weight: 800; }
          .muted { color: #64748b; font-size: 11px; }
          .chip { display: inline-block; background: #fff1e5; color: #855300; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 7px; margin: 2px 4px 2px 0; }
          .chip-wrap { margin-top: 8px; }
          .score-box { text-align: right; }
          .score-label { display: block; font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: .08em; }
          .score-val { font-size: 16px; font-weight: 800; color: #d97706; }
          .bar-track { height: 7px; background: #ede3d8; border-radius: 99px; overflow: hidden; margin-top: 10px; }
          .bar-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #10b981); border-radius: 99px; }
          table { width: 100%; border-collapse: collapse; background: #fff; border: 1.5px solid #e7d5c3; overflow: hidden; }
          th { background: #fff1e5; color: #855300; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; padding: 10px 12px; text-align: left; }
          td { font-size: 12px; padding: 10px 12px; border-top: 1px solid #f0e5d8; vertical-align: top; }
          .center { text-align: center; }
          @media print { body { padding: 10px; } .card, table { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div><h1>Mentoring Portfolio — ${escapeHtml(mentorName)}</h1><p>Competition mentoring history &amp; student journeys</p></div>
          <div class="header-right">${escapeHtml(generatedDate)}<br />${escapeHtml(
      mentorCode ? `Code: ${mentorCode}` : 'InnovaSeed Evaluator'
    )}</div>
        </div>
        <h2 style="margin: 0 0 10px; font-size: 14px;">Mentoring Experience</h2>
        ${studentRows}
        <h2 style="margin: 18px 0 10px; font-size: 14px;">Competition Involvement History</h2>
        <table>
          <thead><tr><th>Competition</th><th>Student</th><th class="center">Milestones</th></tr></thead>
          <tbody>${compRows}</tbody>
        </table>
        <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
      </body>
      </html>`

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    notify('Preparing PDF view — choose "Save as PDF" in the print dialog!')
  }

  const totalStudents = experiences.length
  const totalCompetitions = new Set(competitions.map((c) => c.competitionTitle.toLowerCase())).size
  const totalMilestones = competitions.reduce((sum, c) => sum + c.completedItems, 0)

  const cardCls = isDarkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-[#d8c3ad] text-[#221a12]'
  const subCls = isDarkMode ? 'text-slate-400' : 'text-[#534434]'

  return (
    <div className="mo-stagger space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-600 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className={`rounded-2xl border p-6 shadow-xs ${cardCls}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-500">
              <span>
                <i className="fa-solid fa-medal mr-1"></i> Mentor Portfolio
              </span>
              {mentorCode && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-normal normal-case bg-amber-500/15 text-amber-600 border border-amber-500/30 font-mono">
                  {mentorCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1 wrap-break-words">
              {mentorName}&apos;s Mentoring Journey
            </h1>
            <p className={`text-xs mt-1 leading-relaxed ${subCls}`}>
              Your history of mentoring students through competitions — every pairing, prep
              checklist, and milestone you guided.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadHistoryPdf}
            disabled={loading || experiences.length === 0}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shrink-0"
          >
            <i className="fa-solid fa-file-pdf"></i>
            <span>Export PDF</span>
          </button>
        </div>

        {/* Stats Ribbon */}
        <div className="mo-stagger grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div
            className={`mo-lift rounded-xl border p-4 ${
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'
            }`}
          >
            <i className="fa-solid fa-users text-amber-500"></i>
            <div className="text-xl font-extrabold mt-1">
              <CountUp value={totalStudents} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Students Mentored
            </div>
          </div>
          <div
            className={`mo-lift rounded-xl border p-4 ${
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'
            }`}
          >
            <i className="fa-solid fa-trophy text-amber-500"></i>
            <div className="text-xl font-extrabold mt-1">
              <CountUp value={totalCompetitions} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Competitions Supported
            </div>
          </div>
          <div
            className={`mo-lift rounded-xl border p-4 ${
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'
            }`}
          >
            <i className="fa-solid fa-list-check text-amber-500"></i>
            <div className="text-xl font-extrabold mt-1">
              <CountUp value={totalMilestones} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Prep Milestones Guided
            </div>
          </div>
          <div
            className={`mo-lift rounded-xl border p-4 ${
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'
            }`}
          >
            <i className="fa-solid fa-circle-check text-emerald-500"></i>
            <div className="text-xl font-extrabold mt-1">
              <CountUp value={projectsApproved} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Projects Published
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`rounded-2xl border p-12 text-center text-xs text-slate-400 ${cardCls}`}>
          Loading your mentoring history...
        </div>
      ) : totalStudents === 0 ? (
        <div className={`rounded-2xl border p-8 sm:p-10 text-center space-y-3 shadow-sm ${cardCls}`}>
          <i className="fa-solid fa-seedling text-2xl text-amber-500"></i>
          <h3 className="text-sm font-extrabold">No Mentoring History Yet</h3>
          <p className={`text-xs max-w-md mx-auto leading-relaxed ${subCls}`}>
            Once students pair with your mentor code and you assign competition prep checklists,
            your mentoring journey will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Mentoring Experience Timeline (per student) */}
          <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm space-y-4 ${cardCls}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <i className="fa-solid fa-timeline text-amber-500"></i> Mentoring Experience
              </h2>
              <span className="text-[11px] text-slate-400">Per student journey</span>
            </div>

            <div className="space-y-3">
              {experiences.map((exp) => (
                <div
                  key={exp.studentId}
                  className={`mo-lift rounded-xl border p-4 space-y-2.5 ${
                    isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 font-extrabold text-xs grid place-items-center shrink-0">
                        {exp.studentName
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm wrap-break-words">
                          {exp.studentName}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {exp.competitionCount} competition{exp.competitionCount !== 1 ? 's' : ''}
                          {exp.firstActivity &&
                            ` • since ${formatMonthYear(exp.firstActivity)}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                      {exp.checklistDone}/{exp.checklistTotal} milestones completed
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {exp.competitions.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/25"
                      >
                        <i className="fa-solid fa-trophy mr-1"></i>
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div
                    className={`h-1.5 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-slate-700' : 'bg-[#ebdcd0]'
                    }`}
                  >
                    <div
                      className="mo-bar h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-500"
                      style={{
                        width: `${
                          exp.checklistTotal > 0
                            ? Math.round((exp.checklistDone / exp.checklistTotal) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competition History (chronological) */}
          <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm space-y-4 ${cardCls}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <i className="fa-solid fa-flag-checkered text-amber-500"></i> Competition
                Involvement History
              </h2>
              <span className="text-[11px] text-slate-400">
                {competitions.length} mentoring record{competitions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {competitions.map((comp) => (
                <div
                  key={comp.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailTarget(comp)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setDetailTarget(comp)
                  }}
                  className={`mo-lift rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                    isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-[#fffcf9] border-[#d8c3ad]'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        <i className="fa-solid fa-trophy mr-1"></i> Competition
                      </span>
                      {comp.lastActivity && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {formatMonthYear(comp.firstAssigned)}
                          {comp.firstAssigned !== comp.lastActivity
                            ? ` → ${formatMonthYear(comp.lastActivity)}`
                            : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-extrabold wrap-break-words">
                      {comp.competitionTitle}
                    </h3>
                    <p className={`text-[11px] ${subCls}`}>
                      Mentored <b className="text-amber-600">{comp.studentName}</b> —{' '}
                      {comp.completedItems} of {comp.totalItems} prep milestones completed
                      {comp.completedItems === comp.totalItems && comp.totalItems > 0 && (
                        <span className="text-emerald-600 font-bold"> • Fully prepared 🎉</span>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 w-full sm:w-32">
                    <div
                      className={`h-1.5 rounded-full overflow-hidden ${
                        isDarkMode ? 'bg-slate-700' : 'bg-[#ebdcd0]'
                      }`}
                    >
                      <div
                        className="mo-bar h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-500"
                        style={{
                          width: `${
                            comp.totalItems > 0
                              ? Math.round((comp.completedItems / comp.totalItems) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 text-right font-bold">
                      {comp.totalItems > 0
                        ? Math.round((comp.completedItems / comp.totalItems) * 100)
                        : 0}
                      % ready
                    </p>
                  </div>

                  <i className="fa-solid fa-chevron-right text-slate-400 text-xs shrink-0 self-center"></i>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Competition Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="mo-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailTarget(null)}
          />
          <div
            className={`mo-pop relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl max-h-[80vh] flex flex-col ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#d8c3ad]'
            }`}
          >
            <div
              className={`p-5 border-b flex items-start justify-between gap-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]'
              }`}
            >
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <i className="fa-solid fa-trophy mr-1"></i> Competition Detail
                </span>
                <h3 className="text-base font-extrabold mt-1.5 wrap-break-words">
                  {detailTarget.competitionTitle}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Mentoring <b className="text-amber-600">{detailTarget.studentName}</b> •{' '}
                  {detailTarget.completedItems}/{detailTarget.totalItems} milestones completed
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 cursor-pointer shrink-0"
                aria-label="Close detail"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5">
              {filteredModalItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No prep items recorded for this competition.
                </p>
              ) : (
                filteredModalItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                      item.isCompleted
                        ? isDarkMode
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-emerald-50/70 border-emerald-300'
                        : isDarkMode
                        ? 'bg-slate-800/50 border-slate-700'
                        : 'bg-[#fffcf9] border-[#d8c3ad]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        item.isCompleted
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : isDarkMode
                          ? 'border-slate-600 bg-slate-900'
                          : 'border-[#d8c3ad] bg-white'
                      }`}
                    >
                      {item.isCompleted && <i className="fa-solid fa-check text-[10px]"></i>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-extrabold wrap-break-words ${
                            item.isCompleted ? 'line-through opacity-75' : ''
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600">
                          {item.category}
                        </span>
                        {item.dueDate && (
                          <span className="text-[9px] text-slate-400 font-semibold">
                            Due {item.dueDate}
                          </span>
                        )}
                      </div>
                      {item.instructions && (
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1 wrap-break-words">
                          {item.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}