"use client"

import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'
import { saveAs } from 'file-saver'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

type Project = {
  id: string
  title: string
  description?: string | null
  user_id?: string | null
  created_at?: string
}

type PrototypeNoteRow = {
  id: string
  project_id: string
  author_id: string | null
  version_tag: string
  status: 'working_well' | 'needs_revision' | 'critical_issue'
  what_was_tested: string
  observations_issues: string | null
  next_steps: string | null
  evidence_url: string | null
  is_review_requested: boolean
  created_at: string
  updated_at?: string
}

type PrototypeNote = PrototypeNoteRow & {
  author_name: string
}

export default function PrototypeNotesPage() {
  const { isDarkMode } = useTheme()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [notes, setNotes] = useState<PrototypeNote[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('Student')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Form State for New Prototype Note
  const [versionTag, setVersionTag] = useState('V1.0 - Prototype Test')
  const [status, setStatus] = useState<'working_well' | 'needs_revision' | 'critical_issue'>('working_well')
  const [whatWasTested, setWhatWasTested] = useState('')
  const [observationsIssues, setObservationsIssues] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // 1. Fetch Authenticated User & Real Projects from Supabase
  useEffect(() => {
    let active = true

    async function initProjects() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!active) return

      if (sessionError) {
        console.error('Session error:', sessionError)
      }

      const user = session?.user
      if (!user) {
        setCurrentUserId('')
        setProjects([])
        setSelectedProjectId('')
        setLoadingProjects(false)
        return
      }

      setCurrentUserId(user.id)
      const resolvedName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split('@')[0] ||
        'Student'
      setCurrentUserName(resolvedName)

      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')

      if (!active) return

      if (projError) {
        console.error('Error fetching projects:', projError)
        showToast(projError.message || 'Failed to load projects from database.')
        setProjects([])
        setSelectedProjectId('')
      } else {
        const rows = (projData || []) as Record<string, unknown>[]
        const ownedRows = rows.filter((row) => {
          const ownerVal = row.user_id ?? row.author_id ?? row.owner_id
          if (ownerVal === undefined || ownerVal === null) return true
          return String(ownerVal) === user.id
        })

        const mappedProjects: Project[] = ownedRows.map((row) => ({
          id: String(row.id),
          title: String(row.title ?? 'Untitled Project'),
          description: (row.description as string | null | undefined) ?? null,
          user_id: (row.user_id as string | null | undefined) ?? null,
          created_at: row.created_at as string | undefined,
        }))

        setProjects(mappedProjects)
        setSelectedProjectId((prev) => prev || (mappedProjects[0]?.id ?? ''))
      }

      setLoadingProjects(false)
    }

    void initProjects()
    return () => {
      active = false
    }
  }, [])

  // 2. Fetch Real Prototype Notes for Selected Project & Current User
  useEffect(() => {
    if (!selectedProjectId || !currentUserId) return

    let active = true

    async function fetchNotes() {
      setLoadingNotes(true)

      const { data, error } = await supabase
        .from('prototype_notes')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('author_id', currentUserId)
        .order('created_at', { ascending: false })

      if (!active) return

      if (error) {
        console.error('Error fetching prototype notes:', error)
        showToast('Failed to load prototype notes from database.')
        setNotes([])
      } else {
        const rows = (data || []) as PrototypeNoteRow[]
        const formatted: PrototypeNote[] = rows.map((item) => ({
          ...item,
          author_name: currentUserName,
        }))
        setNotes(formatted)
      }

      setLoadingNotes(false)
    }

    void fetchNotes()
    return () => {
      active = false
    }
  }, [selectedProjectId, currentUserId, currentUserName])

  const visibleNotes = !selectedProjectId || !currentUserId ? [] : notes

  function resetForm() {
    setVersionTag('V1.1 - Iteration Test')
    setStatus('working_well')
    setWhatWasTested('')
    setObservationsIssues('')
    setNextSteps('')
    setEvidenceUrl('')
  }

  // 3. Create New Prototype Note in Supabase
  async function handleCreateNote(e: FormEvent) {
    e.preventDefault()
    if (!whatWasTested.trim() || !selectedProjectId || !currentUserId || isSubmitting) return

    setIsSubmitting(true)

    const payload = {
      project_id: selectedProjectId,
      author_id: currentUserId,
      version_tag: versionTag.trim(),
      status,
      what_was_tested: whatWasTested.trim(),
      observations_issues: observationsIssues.trim() || null,
      next_steps: nextSteps.trim() || null,
      evidence_url: evidenceUrl.trim() || null,
      is_review_requested: false,
    }

    const { data, error } = await supabase
      .from('prototype_notes')
      .insert([payload])
      .select()
      .single()

    setIsSubmitting(false)

    if (error) {
      console.error('Error inserting prototype note:', error)
      showToast(error.message || 'Failed to save prototype note.')
      return
    }

    if (data) {
      const createdRow = data as PrototypeNoteRow
      const newEntry: PrototypeNote = {
        ...createdRow,
        author_name: currentUserName,
      }
      setNotes((prev) => [newEntry, ...prev])
      setShowModal(false)
      resetForm()
      showToast('Prototype note saved to database!')
    }
  }

  // 4. Toggle Mentor Review Request in Supabase
  async function handleRequestReview(noteId: string, currentFlag: boolean) {
    if (!currentUserId) return
    const updatedFlag = !currentFlag

    const { error } = await supabase
      .from('prototype_notes')
      .update({
        is_review_requested: updatedFlag,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('author_id', currentUserId)

    if (error) {
      console.error('Error updating review request:', error)
      showToast('Failed to update mentor review status.')
      return
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, is_review_requested: updatedFlag } : n))
    )
    showToast(updatedFlag ? 'Review requested for mentor feedback.' : 'Review request cancelled.')
  }

  // 5. Export Real Logbook Notes to .docx
  async function handleExportDocx() {
    if (visibleNotes.length === 0) {
      showToast('No prototype notes available to export.')
      return
    }

    setIsExporting(true)
    showToast('Generating Engineering Logbook Word document...')

    try {
      const activeProj = projects.find((p) => p.id === selectedProjectId)
      const projTitle = activeProj ? activeProj.title : 'InnovaSeed_Project'
      const dateStr = new Date().toISOString().split('T')[0]

      const chronologicalNotes = [...visibleNotes].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      const docChildren: Paragraph[] = [
        new Paragraph({
          text: projTitle,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Prototype & Engineering Logbook\n', bold: true, size: 24, color: '333333' }),
            new TextRun({
              text: `Author: ${currentUserName} | Exported: ${dateStr}`,
              italics: true,
              size: 20,
              color: '666666',
            }),
          ],
          spacing: { after: 240 },
        }),
        new Paragraph({
          text: '_________________________________________________________________________________',
          spacing: { after: 240 },
        }),
      ]

      chronologicalNotes.forEach((note, idx) => {
        const statusLabel =
          note.status === 'working_well'
            ? 'Working Well'
            : note.status === 'needs_revision'
            ? 'Needs Revision'
            : 'Critical Issue'
        const formattedDate = new Date(note.created_at).toLocaleDateString('id-ID', {
          dateStyle: 'medium',
        })

        docChildren.push(
          new Paragraph({
            text: `Iteration ${idx + 1}: ${note.version_tag}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Status: ${statusLabel} | Logged: ${formattedDate} by ${note.author_name}`,
                bold: true,
                size: 18,
                color: '555555',
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'What Was Tested:\n', bold: true }),
              new TextRun({ text: `${note.what_was_tested}\n\n` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Observations & Issues:\n', bold: true }),
              new TextRun({ text: `${note.observations_issues || 'None recorded'}\n\n` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Next Steps / Improvements:\n', bold: true }),
              new TextRun({ text: `${note.next_steps || 'None recorded'}\n\n` }),
            ],
          })
        )

        if (note.evidence_url) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Attachment / Evidence Link: ', bold: true }),
                new TextRun({ text: note.evidence_url, color: '0000FF' }),
              ],
              spacing: { after: 160 },
            })
          )
        }

        docChildren.push(
          new Paragraph({
            text: '---------------------------------------------------------------------------------',
            spacing: { after: 160 },
          })
        )
      })

      const doc = new Document({
        sections: [{ properties: {}, children: docChildren }],
      })

      const blob = await Packer.toBlob(doc)
      const safeTitle = projTitle.replace(/[^a-zA-Z0-9_-]+/g, '_')
      const fileName = `Prototype_Notes_${safeTitle}_${dateStr}.docx`
      saveAs(blob, fileName)

      showToast('Engineering Logbook .docx downloaded!')
    } catch (err) {
      console.error('Export error:', err)
      showToast('Failed to generate Word document.')
    } finally {
      setIsExporting(false)
    }
  }

  const selectedProjectObj = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="mo-stagger space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Card */}
      <div
        className={`border rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
        }`}
      >
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold">Prototype Notes &amp; Engineering Logbook 📓</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/30">
              ISO/IEC Lab Log
            </span>
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Record experiments, telemetry, observations, and version iterations for your innovation project.
          </p>

          {/* Project Selector Dropdown */}
          <div className="pt-2 flex items-center gap-3">
            <label
              className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}
            >
              Active Project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={loadingProjects || projects.length === 0}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium outline-none transition border cursor-pointer disabled:opacity-60 ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                  : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
              }`}
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handleExportDocx}
            disabled={isExporting || visibleNotes.length === 0}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer border disabled:opacity-50 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
            }`}
          >
            <i className={`fa-solid fa-file-word text-blue-500 ${isExporting ? 'animate-spin' : ''}`}></i>
            {isExporting ? 'Exporting...' : 'Export for Google Docs'}
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={!selectedProjectId || !currentUserId}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-plus"></i> Add Prototype Note
          </button>
        </div>
      </div>

      {/* Project Description Banner */}
      {selectedProjectObj?.description && (
        <div
          className={`text-xs px-5 py-3 rounded-xl border ${
            isDarkMode
              ? 'bg-slate-800/40 border-slate-800 text-slate-300'
              : 'bg-[#fff1e5]/60 border-[#d8c3ad]/55 text-[#534434]'
          }`}
        >
          <b>Project Focus:</b> {selectedProjectObj.description}
        </div>
      )}

      {/* Timeline Cards List */}
      {loadingProjects || loadingNotes ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">
          Loading engineering logbook entries...
        </div>
      ) : !currentUserId ? (
        <div
          className={`border rounded-2xl p-12 text-center shadow-xs space-y-2 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <h3 className="font-bold">Sign In Required</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Please sign in to access your personal projects and prototype engineering logbook.
          </p>
        </div>
      ) : !selectedProjectId ? (
        <div
          className={`border rounded-2xl p-12 text-center shadow-xs space-y-2 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <h3 className="font-bold">No Active Project</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Create a project in Project Workspace first to start recording prototype notes.
          </p>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div
          className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-flask"></i>
          </div>
          <h3 className="font-bold">No Prototype Notes Recorded Yet</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Click &quot;Add Prototype Note&quot; above to log your first experiment or version test for this project.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleNotes.map((n) => {
            const statusConfig =
              n.status === 'working_well'
                ? {
                    label: 'Working Well',
                    bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                    icon: 'fa-check',
                  }
                : n.status === 'needs_revision'
                ? {
                    label: 'Needs Revision',
                    bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                    icon: 'fa-triangle-exclamation',
                  }
                : {
                    label: 'Critical Issue',
                    bg: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
                    icon: 'fa-circle-xmark',
                  }

            return (
              <div
                key={n.id}
                className={`border rounded-2xl p-6 shadow-xs transition-colors space-y-4 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
                }`}
              >
                {/* Card Top Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-inherit">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                        isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-[#fff1e5] text-[#221a12]'
                      }`}
                    >
                      {n.version_tag}
                    </span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 ${statusConfig.bg}`}
                    >
                      <i className={`fa-solid ${statusConfig.icon}`}></i> {statusConfig.label}
                    </span>
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                    Logged by{' '}
                    <b className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{n.author_name}</b> •{' '}
                    {new Date(n.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </div>
                </div>

                {/* 3 Main Pointers Grid */}
                <div className="grid md:grid-cols-3 gap-4 text-xs">
                  <div
                    className={`p-3 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/50 border-slate-800'
                        : 'bg-[#fbebdd]/30 border-[#d8c3ad]/50'
                    }`}
                  >
                    <p className="font-semibold text-amber-500 uppercase tracking-wide text-[10px] mb-1">
                      What Was Tested
                    </p>
                    <p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                      {n.what_was_tested}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/50 border-slate-800'
                        : 'bg-[#fbebdd]/30 border-[#d8c3ad]/50'
                    }`}
                  >
                    <p className="font-semibold text-amber-500 uppercase tracking-wide text-[10px] mb-1">
                      Observations &amp; Issues
                    </p>
                    <p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                      {n.observations_issues || 'None recorded'}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/50 border-slate-800'
                        : 'bg-[#fbebdd]/30 border-[#d8c3ad]/50'
                    }`}
                  >
                    <p className="font-semibold text-amber-500 uppercase tracking-wide text-[10px] mb-1">
                      Next Action / Plan
                    </p>
                    <p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
                      {n.next_steps || 'None recorded'}
                    </p>
                  </div>
                </div>

                {/* Evidence Link if available */}
                {n.evidence_url && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      Attached Evidence / Link
                    </p>
                    <a
                      href={n.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700'
                          : 'bg-[#fff1e5] border-[#d8c3ad] text-blue-600 hover:bg-[#fbebdd]'
                      }`}
                    >
                      <i className="fa-solid fa-paperclip"></i> {n.evidence_url}
                    </a>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-inherit">
                  <div className="text-[11px] text-slate-400">
                    {n.is_review_requested ? (
                      <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check"></i> Review requested from mentor
                      </span>
                    ) : (
                      <span>Pending mentor feedback request</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRequestReview(n.id, n.is_review_requested)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer border ${
                      n.is_review_requested
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                        : isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'
                    }`}
                  >
                    {n.is_review_requested ? 'Cancel Mentor Review' : 'Request Mentor Review'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Form: Add Prototype Note */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div
            className={`rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border my-8 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'
            }`}
          >
            <div
              className={`flex justify-between items-center border-b pb-3 ${
                isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'
              }`}
            >
              <h3 className="font-bold text-lg">New Prototype Note &amp; Test Log 🧪</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                    }`}
                  >
                    Iteration / Version Tag
                  </label>
                  <input
                    type="text"
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    placeholder="e.g., V1.0 - Breadboard Wiring Test"
                    required
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none font-mono transition border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                        : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                    }`}
                  >
                    Test Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'working_well' | 'needs_revision' | 'critical_issue')
                    }
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none transition border ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                        : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
                    }`}
                  >
                    <option value="working_well">Working Well</option>
                    <option value="needs_revision">Needs Revision</option>
                    <option value="critical_issue">Critical Issue</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                  }`}
                >
                  What did you build or test?
                </label>
                <textarea
                  value={whatWasTested}
                  onChange={(e) => setWhatWasTested(e.target.value)}
                  placeholder="Describe the experiment, setup, or code module tested..."
                  rows={3}
                  required
                  className={`w-full rounded-xl p-3 text-xs outline-none transition border resize-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                      : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                  }`}
                >
                  Observations &amp; Issues Found
                </label>
                <textarea
                  value={observationsIssues}
                  onChange={(e) => setObservationsIssues(e.target.value)}
                  placeholder="Note down telemetry, behavior, or bugs encountered..."
                  rows={3}
                  className={`w-full rounded-xl p-3 text-xs outline-none transition border resize-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                      : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                  }`}
                >
                  Next Action / Improvement Plan
                </label>
                <textarea
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="What is the next iteration or fix planned?"
                  rows={2}
                  className={`w-full rounded-xl p-3 text-xs outline-none transition border resize-none ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                      : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                  }`}
                >
                  Attach Evidence (Image URL or Link)
                </label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full rounded-xl px-3 py-2 text-xs outline-none transition border ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-500'
                      : 'bg-[#fbebdd] border-[#d8c3ad] text-[#221a12] focus:border-amber-500'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition ${
                    isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 mo-toast bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check"></i>
          </span>
          <div>
            <b className="block text-slate-200">InnovaSeed Notification</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}