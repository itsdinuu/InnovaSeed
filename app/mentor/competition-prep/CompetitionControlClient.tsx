"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

type CompetitionOption = {
  id: string
  title: string
}

type ChecklistRecord = {
  id: string
  competitionId: string
  competitionTitle: string
  title: string
  category: string
  dueDate?: string | null
  instructions?: string | null
  isCompleted: boolean
}

const LS_PREP_ITEMS = 'innovaseed_prep_items_v2'

const DEFAULT_COMPETITIONS: CompetitionOption[] = [
  { id: 'comp-1', title: 'NYIA (National Young Inventors Award)' },
  { id: 'comp-2', title: 'National Science Fair (NSF) 2026' },
  { id: 'comp-3', title: 'Indonesian Youth Science Association (IYSA) Expo' },
  { id: 'comp-4', title: 'Invention & Young Innovators Challenge' },
]

const MENTORSHIP_STAGES = [
  'Idea',
  'Research',
  'Prototype',
  'Presentation',
  'Pitching',
] as const

export default function MentorCompetitionControlPage() {
  const { isDarkMode } = useTheme()

  const [mentorName, setMentorName] = useState<string>('Mentor')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [competitionOptions, setCompetitionOptions] =
    useState<CompetitionOption[]>(DEFAULT_COMPETITIONS)
  const [checklistItems, setChecklistItems] = useState<ChecklistRecord[]>([])

  // Form states for assigning a new preparation checklist item
  const [selectedCompId, setSelectedCompId] = useState<string>(DEFAULT_COMPETITIONS[0].id)
  const [taskTitle, setTaskTitle] = useState<string>('')
  const [taskCategory, setTaskCategory] = useState<string>(MENTORSHIP_STAGES[0])
  const [taskDueDate, setTaskDueDate] = useState<string>('')
  const [taskNotes, setTaskNotes] = useState<string>('')
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false)

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const notify = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const loadMentorControlData = useCallback(async () => {
    setIsLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    let resolvedMentor =
      typeof session?.user?.user_metadata?.full_name === 'string' &&
      session.user.user_metadata.full_name.trim()
        ? session.user.user_metadata.full_name.trim()
        : session?.user?.email
        ? session.user.email.split('@')[0]
        : 'Mentor'

    if (session?.user?.id) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileRow) {
        const p = profileRow as Record<string, unknown>
        if (typeof p.full_name === 'string' && p.full_name.trim()) {
          resolvedMentor = p.full_name.trim()
        } else if (typeof p.name === 'string' && p.name.trim()) {
          resolvedMentor = p.name.trim()
        }
      }
    }
    setMentorName(resolvedMentor)

    // 1. Load target competition options from Supabase `competitions`
    const { data: compRows, error: compErr } = await supabase
      .from('competitions')
      .select('id, title')

    let activeOptions = DEFAULT_COMPETITIONS
    if (!compErr && Array.isArray(compRows) && compRows.length > 0) {
      activeOptions = compRows.map((raw, idx) => {
        const r = (raw || {}) as Record<string, unknown>
        return {
          id: r.id !== undefined && r.id !== null ? String(r.id) : `comp-${idx}`,
          title:
            typeof r.title === 'string' && r.title.trim()
              ? r.title.trim()
              : 'Untitled Competition',
        }
      })
    }
    setCompetitionOptions(activeOptions)
    setSelectedCompId((prev) =>
      activeOptions.some((c) => c.id === prev) ? prev : activeOptions[0]?.id || ''
    )

    // 2. Load assigned preparation checklists
    const itemsList: ChecklistRecord[] = []
    const { data: dbPrep, error: prepErr } = await supabase
      .from('competition_prep_materials')
      .select('*')

    if (!prepErr && Array.isArray(dbPrep) && dbPrep.length > 0) {
      for (let i = 0; i < dbPrep.length; i++) {
        const r = (dbPrep[i] || {}) as Record<string, unknown>
        const stRaw = String(r.status || '').toLowerCase()
        itemsList.push({
          id: r.id ? String(r.id) : `db-prep-${i}`,
          competitionId: String(r.competition_id || ''),
          competitionTitle: String(
            r.competition_title || r.competition_name || 'Target Competition'
          ),
          title: String(r.title || r.material_title || 'Preparation Deliverable'),
          category: String(r.category || r.track || MENTORSHIP_STAGES[0]),
          dueDate: r.due_date ? String(r.due_date) : null,
          instructions: r.notes || r.description ? String(r.notes || r.description) : null,
          isCompleted:
            Boolean(r.is_completed) || stRaw === 'completed' || stRaw === 'done',
        })
      }
    } else {
      try {
        const rawPrep = localStorage.getItem(LS_PREP_ITEMS)
        if (rawPrep) {
          const parsedPrep = JSON.parse(rawPrep) as Record<string, unknown>[]
          if (Array.isArray(parsedPrep)) {
            parsedPrep.forEach((r, idx) => {
              const stRaw = String(r.status || '').toLowerCase()
              itemsList.push({
                id: r.id ? String(r.id) : `ls-prep-${idx}`,
                competitionId: String(r.competitionId || r.competition_id || ''),
                competitionTitle: String(
                  r.competitionTitle || r.competition_title || 'Target Competition'
                ),
                title: String(r.title || 'Preparation Deliverable'),
                category: String(r.category || MENTORSHIP_STAGES[0]),
                dueDate: r.dueDate ? String(r.dueDate) : null,
                instructions: r.notes ? String(r.notes) : null,
                isCompleted:
                  Boolean(r.isCompleted) || stRaw === 'completed' || stRaw === 'done',
              })
            })
          }
        }
      } catch {
        // Ignore storage error
      }
    }

    setChecklistItems(itemsList)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (active) {
        void loadMentorControlData()
      }
    })

    return () => {
      active = false
    }
  }, [loadMentorControlData])

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    const matchedComp =
      competitionOptions.find((c) => c.id === selectedCompId) || competitionOptions[0]

    const compId = matchedComp ? matchedComp.id : selectedCompId || 'general'
    const compTitle = matchedComp ? matchedComp.title : 'Assigned Competition'

    setIsSubmittingTask(true)

    const newItem: ChecklistRecord = {
      id: `ls-prep-${Date.now()}`,
      competitionId: compId,
      competitionTitle: compTitle,
      title: taskTitle.trim(),
      category: taskCategory,
      dueDate: taskDueDate || null,
      instructions: taskNotes.trim() || null,
      isCompleted: false,
    }

    const { data: insertedRows, error: insertErr } = await supabase
      .from('competition_prep_materials')
      .insert([
        {
          competition_id: compId,
          competition_title: compTitle,
          title: newItem.title,
          category: newItem.category,
          due_date: newItem.dueDate,
          notes: newItem.instructions,
          status: 'todo',
        },
      ])
      .select()

    if (!insertErr && Array.isArray(insertedRows) && insertedRows[0]?.id) {
      newItem.id = String(insertedRows[0].id)
    }

    const updatedItems = [newItem, ...checklistItems]
    setChecklistItems(updatedItems)

    try {
      localStorage.setItem(
        LS_PREP_ITEMS,
        JSON.stringify(
          updatedItems.map((it) => ({
            ...it,
            status: it.isCompleted ? 'completed' : 'todo',
          }))
        )
      )
    } catch {
      // Ignore storage error
    }

    setTaskTitle('')
    setTaskDueDate('')
    setTaskNotes('')
    setIsSubmittingTask(false)
    notify(`Assigned checklist "${newItem.title}" for ${compTitle}!`)
  }

  const handleDeleteChecklistItem = async (item: ChecklistRecord) => {
    const filtered = checklistItems.filter((c) => c.id !== item.id)
    setChecklistItems(filtered)

    try {
      localStorage.setItem(
        LS_PREP_ITEMS,
        JSON.stringify(
          filtered.map((it) => ({
            ...it,
            status: it.isCompleted ? 'completed' : 'todo',
          }))
        )
      )
    } catch {
      // Ignore storage error
    }

    if (!item.id.startsWith('ls-prep-') && !item.id.startsWith('db-prep-')) {
      await supabase.from('competition_prep_materials').delete().eq('id', item.id)
    }

    notify(`Removed checklist item "${item.title}".`)
  }

  const completedCount = checklistItems.filter((i) => i.isCompleted).length

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-500">
            <span>
              <i className="fa-solid fa-sliders mr-1"></i> Mentor Competition Control
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] tracking-normal normal-case bg-amber-500/15 text-amber-600 border border-amber-500/30">
              {mentorName} • Mentor Supervisor
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 wrap-break-words">
            Competition Prep Checklist Control
          </h1>
          <p
            className={`text-xs mt-1 leading-relaxed wrap-break-words ${
              isDarkMode ? 'text-slate-400' : 'text-[#534434]'
            }`}
          >
            Assign and manage preparation deliverables across Idea → Research → Prototype →
            Presentation → Pitching that sync to the student Competition Prep page.
          </p>
        </div>

        {/* Summary Counters */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className={`px-3.5 py-2 rounded-2xl border text-xs font-bold ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-amber-400'
                : 'bg-white border-[#d8c3ad] text-amber-600'
            }`}
          >
            Total Checklists: <b>{checklistItems.length}</b>
          </div>
          <div
            className={`px-3.5 py-2 rounded-2xl border text-xs font-bold ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                : 'bg-white border-[#d8c3ad] text-emerald-600'
            }`}
          >
            Completed: <b>{completedCount}</b>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Assign Checklist Form, Right = Assigned Checklists */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Assign Checklist Form (5 Cols) */}
        <div
          className={`xl:col-span-5 rounded-2xl border p-5 sm:p-6 shadow-sm space-y-5 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="border-b pb-3 border-inherit">
            <h2 className="text-sm font-extrabold flex items-center gap-2">
              <i className="fa-solid fa-list-check text-amber-500"></i> Assign Prep Checklist
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Create checklist items that appear live in the student&apos;s Competition Prep
              page.
            </p>
          </div>

          <form onSubmit={(e) => void handleAddChecklistItem(e)} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1">Target Competition</label>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                disabled={competitionOptions.length === 0}
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12]'
                }`}
              >
                {competitionOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1">Checklist Deliverable Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Problem Statement & Novelty Matrix"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12]'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold mb-1">Mentorship Stage</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12]'
                  }`}
                >
                  {MENTORSHIP_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Mentor Instructions</label>
              <textarea
                rows={2}
                placeholder="Write brief guidance for the preparation stage..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-[#fffcf9] border-[#d8c3ad] text-[#221a12]'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingTask || competitionOptions.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 transition cursor-pointer shadow-sm"
            >
              {isSubmittingTask ? 'Assigning...' : '+ Add to Student Prep Checklist'}
            </button>
          </form>
        </div>

        {/* Right Column: Assigned Checklists List (7 Cols) */}
        <div
          className={`xl:col-span-7 rounded-2xl border p-5 sm:p-6 shadow-sm space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit">
            <h2 className="text-sm font-extrabold flex items-center gap-2">
              <i className="fa-solid fa-clipboard-list text-amber-500"></i> Assigned
              Checklists ({checklistItems.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Idea → Research → Prototype → Presentation → Pitching
            </span>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Loading preparation checklists...
            </div>
          ) : checklistItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-1">
              <p className="font-bold">No checklist items assigned yet.</p>
              <p>
                Use the form on the left to add preparation deliverables for competitions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 flex items-start justify-between gap-3 ${
                    isDarkMode
                      ? 'bg-slate-800/60 border-slate-700'
                      : 'bg-[#fffcf9] border-[#d8c3ad]'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        {item.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isCompleted
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-slate-500/15 text-slate-500'
                        }`}
                      >
                        {item.isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                      {item.dueDate && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Due {item.dueDate}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-extrabold wrap-break-words">{item.title}</h3>
                    <p className="text-[11px] font-semibold text-amber-600 wrap-break-words">
                      {item.competitionTitle}
                    </p>
                    {item.instructions && (
                      <p className="text-xs text-slate-400 leading-relaxed pt-0.5 wrap-break-words">
                        {item.instructions}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeleteChecklistItem(item)}
                    className="text-rose-500 hover:text-rose-600 text-xs px-2 py-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                    title="Delete checklist item"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}