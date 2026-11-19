"use client"

import Image from 'next/image'
import { useEffect, useState, useCallback, useRef, useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'
import { useOutsideClick } from '@/hooks/use-outside-click'

type Idea = {
  id: number | string
  title?: string
  description?: string
  status?: string
  tags?: string[] | string | null
  author_name?: string
  author_id?: string | null
  user_id?: string | null
  sketch_image_url?: string | null
  problem_statement?: string | null
  how_it_works?: string | null
  materials_needed?: string | null
  step_by_step_guide?: string | null
}

function normalizeTags(tags?: string[] | string | null): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).replace(/[{}"]/g, '').trim()).filter(Boolean)
  }
  return String(tags)
    .replace(/[{}"]/g, '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function getStatusBadgeStyle(status?: string, isDarkMode?: boolean): string {
  const normalized = (status || 'Raw Concept').toLowerCase()
  if (normalized === 'prototype') {
    return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30'
  }
  if (normalized === 'approved') {
    return 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
  }
  if (normalized === 'under validation' || normalized === 'pending approval') {
    return 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
  }
  if (normalized === 'needs revision' || normalized === 'rejected') {
    return 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
  }
  return isDarkMode
    ? 'bg-slate-800 text-slate-300 border border-slate-700'
    : 'bg-slate-100 text-slate-700 border border-slate-200'
}

export default function StudentSubmissionsClient() {
  const { isDarkMode } = useTheme()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mentorName, setMentorName] = useState<string>('Mentor Plego')

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All Ideas')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // State Expandable Card Pop-up (sama dengan Idea Bank Student)
  const [activeCard, setActiveCard] = useState<Idea | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  // Modal Create / Edit Idea
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Approved')
  const [tags, setTags] = useState('')
  const [sketchImageUrl, setSketchImageUrl] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [howItWorks, setHowItWorks] = useState('')
  const [materialsNeeded, setMaterialsNeeded] = useState('')
  const [stepByStepGuide, setStepByStepGuide] = useState('')

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const fetchIdeas = useCallback(async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const uid = session?.user?.id || null
    setCurrentUserId(uid)

    let resolvedName =
      session?.user?.user_metadata?.full_name ||
      session?.user?.user_metadata?.name ||
      (session?.user?.email ? session.user.email.split('@')[0] : 'Mentor Plego')

    if (uid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, name')
        .eq('id', uid)
        .maybeSingle()

      if (profile?.full_name || profile?.name) {
        resolvedName = profile.full_name || profile.name
      }
    }
    setMentorName(resolvedName)

    const { data } = await supabase
      .from('ideas')
      .select('*')
      .order('id', { ascending: false })

    if (data) {
      setIdeas(data as Idea[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchIdeas()
    }, 0)

    const channel = supabase
      .channel('realtime-mentor-submissions-ideas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ideas' },
        () => {
          void fetchIdeas()
        }
      )
      .subscribe()

    return () => {
      clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [fetchIdeas])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveCard(null)
      }
    }

    if (activeCard) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeCard])

  useOutsideClick(ref, () => setActiveCard(null))

  function handleOpenCreateModal() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setStatus('Approved') // Ide buatan mentor langsung Approved tanpa butuh approval lagi
    setTags('')
    setSketchImageUrl('')
    setProblemStatement('')
    setHowItWorks('')
    setMaterialsNeeded('')
    setStepByStepGuide('')
    setShowModal(true)
  }

  function handleOpenEditModal(item: Idea) {
    setActiveCard(null)
    setEditingId(item.id)
    setTitle(item.title || '')
    setDescription(item.description || '')
    setStatus(item.status || 'Approved')
    setTags(normalizeTags(item.tags).join(', '))
    setSketchImageUrl(item.sketch_image_url || '')
    setProblemStatement(item.problem_statement || '')
    setHowItWorks(item.how_it_works || '')
    setMaterialsNeeded(item.materials_needed || '')
    setStepByStepGuide(item.step_by_step_guide || '')
    setShowModal(true)
  }

  async function handleSaveIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    const formattedTags = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      tags: formattedTags,
      sketch_image_url: sketchImageUrl.trim() || null,
      problem_statement: problemStatement.trim() || null,
      how_it_works: howItWorks.trim() || null,
      materials_needed: materialsNeeded.trim() || null,
      step_by_step_guide: stepByStepGuide.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('ideas')
        .update(payload)
        .eq('id', editingId)

      if (!error) {
        setShowModal(false)
        showToast('Innovation idea updated successfully!')
        await fetchIdeas()
      } else {
        showToast('Failed to update idea: ' + error.message)
      }
    } else {
      const { error } = await supabase.from('ideas').insert([
        {
          ...payload,
          author_id: currentUserId,
          author_name: mentorName,
        },
      ])

      if (!error) {
        setShowModal(false)
        showToast(`Idea published as ${mentorName} (Auto-Approved)!`)
        await fetchIdeas()
      } else {
        showToast('Failed to publish idea: ' + error.message)
      }
    }
    setSaving(false)
  }

  async function notifyStudentDecision(item: Idea, newStatus: string) {
    const targetStudentId = item.author_id || item.user_id
    if (!targetStudentId || targetStudentId === currentUserId) return

    const decisionLabel =
      newStatus === 'Approved' || newStatus === 'Prototype'
        ? `APPROVED (${newStatus})`
        : newStatus === 'Needs Revision'
        ? 'NOT APPROVED / NEEDS REVISION'
        : `UPDATED TO ${newStatus.toUpperCase()}`

    const messageText = `[Idea Decision] Your idea "${item.title}" has been ${decisionLabel} by ${mentorName}.`

    await supabase.from('mentor_feedback').insert({
      mentor_name: mentorName,
      student_id: targetStudentId,
      idea_id: String(item.id),
      comment: messageText,
      feedback_text: messageText,
      is_read: false,
    })

    await supabase.from('notifications').insert({
      user_id: targetStudentId,
      title: `Idea ${decisionLabel}`,
      message: messageText,
      is_read: false,
    })
  }

  async function handleUpdateStatus(item: Idea, newStatus: string) {
    const { error } = await supabase
      .from('ideas')
      .update({ status: newStatus })
      .eq('id', item.id)

    if (error) {
      showToast('Failed to update status: ' + error.message)
      return
    }

    const updated: Idea = { ...item, status: newStatus }
    setIdeas((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    setActiveCard(updated)

    await notifyStudentDecision(updated, newStatus)
    showToast(`Status updated to "${newStatus}" and student notified!`)
  }

  const filteredIdeas = ideas.filter((item) => {
    const matchesTab = filterStatus === 'All Ideas' || item.status === filterStatus
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.author_name || '').toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  return (
    <div className="space-y-6 relative">
      {/* EXPANDABLE CARD OVERLAY BACKGROUND */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs h-full w-full z-40"
          />
        )}
      </AnimatePresence>

      {/* EXPANDABLE CARD POP-UP (Disamakan dengan Idea Bank Student) */}
      <AnimatePresence>
        {activeCard && (
          <div className="fixed inset-0 grid place-items-center z-50 p-4 pointer-events-none">
            <motion.div
              layoutId={`mentor-card-${activeCard.id}-${id}`}
              ref={ref}
              className={`w-full max-w-xl h-full md:h-fit md:max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border overflow-y-auto pointer-events-auto ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : 'bg-white border-[#d8c3ad] text-[#221a12]'
              }`}
            >
              {/* Top Status, Author & Close Button */}
              <div className="flex items-center justify-between px-6 pt-6 pb-3 gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded ${getStatusBadgeStyle(
                      activeCard.status,
                      isDarkMode
                    )}`}
                  >
                    {activeCard.status || 'Raw Concept'}
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                    By <strong>{activeCard.author_name || 'InnovaSeed'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeCard.author_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(activeCard)}
                      title="Edit Idea"
                      className="flex items-center justify-center bg-amber-500/15 text-amber-600 rounded-full h-8 w-8 text-xs cursor-pointer hover:bg-amber-500/25 transition"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full h-8 w-8 shadow-xs cursor-pointer hover:bg-slate-300 transition"
                    onClick={() => setActiveCard(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Sketch Image Preview (menggunakan kolom sketch_image_url) */}
              {activeCard.sketch_image_url && (
                <div className="px-6 pb-0">
                  <div className="relative w-full h-60 sm:h-72 rounded-2xl overflow-hidden border border-slate-700/30">
                    <Image
                      src={activeCard.sketch_image_url}
                      alt={activeCard.title || 'Idea Sketch'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* Content & 4 Structured Sections */}
              <div className="p-6 space-y-4">
                <motion.h3
                  layoutId={`mentor-title-${activeCard.id}-${id}`}
                  className="font-extrabold text-xl"
                >
                  {activeCard.title}
                </motion.h3>

                <motion.p
                  layoutId={`mentor-description-${activeCard.id}-${id}`}
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  {activeCard.description}
                </motion.p>

                {normalizeTags(activeCard.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {normalizeTags(activeCard.tags).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2.5 py-0.5 rounded font-medium ${
                          isDarkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-[#fff1e5] text-[#534434]'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3 pt-1 text-xs">
                  <div
                    className={`p-3.5 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-circle-exclamation"></i> 1. The Problem Statement
                    </h4>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                      {activeCard.problem_statement ||
                        activeCard.description ||
                        'Everyday challenge or inefficiency encountered by students.'}
                    </p>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-gears"></i> 2. How It Works (Solution)
                    </h4>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                      {activeCard.how_it_works ||
                        'A concise explanation of how the mechanism operates.'}
                    </p>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-toolbox"></i> 3. Materials Needed
                    </h4>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-[#534434]'}>
                      {activeCard.materials_needed ||
                        'List of accessible tools or components.'}
                    </p>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border ${
                      isDarkMode
                        ? 'bg-slate-800/40 border-slate-700'
                        : 'bg-[#fff8f4] border-[#d8c3ad]'
                    }`}
                  >
                    <h4 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-list-check"></i> 4. Step-by-Step Build Guide
                    </h4>
                    <p
                      className={`whitespace-pre-line ${
                        isDarkMode ? 'text-slate-300' : 'text-[#534434]'
                      }`}
                    >
                      {activeCard.step_by_step_guide ||
                        '1. Draft initial sketches.\n2. Build core prototype.'}
                    </p>
                  </div>
                </div>

                {/* Mentor Approval & Status Controls */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="block text-[11px] text-slate-400">
                    Mentor Status &amp; Approval Control (Notifies student on decision)
                  </span>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(activeCard, 'Under Validation')}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 rounded-xl hover:bg-amber-500/25 transition cursor-pointer"
                      >
                        Under Validation
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(activeCard, 'Approved')}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-500/15 text-blue-600 border border-blue-500/30 rounded-xl hover:bg-blue-500/25 transition cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(activeCard, 'Prototype')}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/25 transition cursor-pointer"
                      >
                        Prototype
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(activeCard, 'Needs Revision')}
                        className="px-3 py-1.5 text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 rounded-xl hover:bg-rose-500/25 transition cursor-pointer"
                      >
                        Not Approved / Revise
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveCard(null)}
                      className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Banner (Tampilan List Awal Mentor tetap dipertahankan) */}
      <div
        className={`border rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#d8c3ad] text-[#221a12]'
        }`}
      >
        <div>
          <h1 className="text-2xl font-extrabold">Public Idea Bank &amp; Submissions 📋</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Browse all public innovation ideas across InnovaSeed, click any card to open its full
            pop-up view, or publish a new idea as{' '}
            <strong className="text-amber-600">{mentorName}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0F172A] font-bold text-xs transition cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-xs"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Add Innovation Idea</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {['All Ideas', 'Raw Concept', 'Under Validation', 'Approved', 'Prototype'].map(
            (tab) => {
              const active = filterStatus === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterStatus(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    active
                      ? 'bg-[#F59E0B] text-[#0F172A] border-[#D97706]'
                      : isDarkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-[#d8c3ad] text-[#534434] hover:bg-[#fff1e5]'
                  }`}
                >
                  {tab}
                </button>
              )
            }
          )}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search title, creator, or keyword..."
          className={`px-3.5 py-2 rounded-xl border text-xs outline-none sm:w-64 ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-[#d8c3ad] text-[#221a12]'
          }`}
        />
      </div>

      {/* List View Cards (Bentuk Awal Mentor List) */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">
          Loading public ideas from Idea Bank...
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div
          className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'
          }`}
        >
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-lightbulb"></i>
          </div>
          <h3 className="font-bold">No Ideas Found</h3>
          <p className={`text-xs max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            No ideas match your current filter. Click &ldquo;Add Innovation Idea&rdquo; above to
            create a new idea.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredIdeas.map((item) => (
            <motion.div
              layoutId={`mentor-card-${item.id}-${id}`}
              key={`mentor-card-${item.id}-${id}`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveCard(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveCard(item)
                }
              }}
              className={`border rounded-2xl px-5 py-4 transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                isDarkMode
                  ? 'bg-slate-900/95 border-slate-800 hover:border-amber-500/60 text-slate-100'
                  : 'bg-white border-[#e6d5c3] hover:border-amber-500/80 text-[#221a12]'
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${getStatusBadgeStyle(
                      item.status,
                      isDarkMode
                    )}`}
                  >
                    {item.status || 'Raw Concept'}
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                    By{' '}
                    <strong className={isDarkMode ? 'text-slate-200' : 'text-[#221a12]'}>
                      {item.author_name || 'InnovaSeed'}
                    </strong>
                  </span>
                  {item.sketch_image_url && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600">
                      <i className="fa-regular fa-image mr-1"></i>Media
                    </span>
                  )}
                </div>

                <motion.h3
                  layoutId={`mentor-title-${item.id}-${id}`}
                  className="font-bold text-base truncate"
                >
                  {item.title}
                </motion.h3>
                <motion.p
                  layoutId={`mentor-description-${item.id}-${id}`}
                  className={`text-xs truncate ${
                    isDarkMode ? 'text-slate-400' : 'text-[#534434]'
                  }`}
                >
                  {item.description}
                </motion.p>
              </div>

              <span
                className={`w-7 h-7 rounded-lg grid place-items-center text-xs border shrink-0 ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 bg-slate-800/60'
                    : 'border-[#decab4] text-[#534434] bg-[#fffaf5]'
                }`}
              >
                <i className="fa-solid fa-up-right-and-down-left-from-center text-[10px]"></i>
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Create & Edit Idea (Field lengkap sama seperti Idea Bank Student) */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 border max-h-[90vh] overflow-y-auto ${
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
                <h3 className="font-bold text-lg text-amber-500">
                  {editingId ? 'Edit Innovation Idea ✏️' : 'Add Innovation Idea 💡'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Publishing as <strong>{mentorName}</strong> (Auto-Approved)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveIdea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Idea Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Solar-Powered Pencil Sharpener"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Short Summary (2–3 sentences) *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain what the invention does and how it helps people..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Category Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="IoT, Clean Tech, Education"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Sketch / Image Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/my-sketch.png"
                  value={sketchImageUrl}
                  onChange={(e) => setSketchImageUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">1. The Problem Statement (Optional Guide)</label>
                <textarea
                  rows={2}
                  placeholder="What issue are we solving?"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">2. How It Works (Optional Guide)</label>
                <textarea
                  rows={2}
                  placeholder="Explain the solution mechanism..."
                  value={howItWorks}
                  onChange={(e) => setHowItWorks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">3. Materials Needed (Optional Guide)</label>
                <input
                  type="text"
                  placeholder="e.g., Cardboard, sensors, micro:bit"
                  value={materialsNeeded}
                  onChange={(e) => setMaterialsNeeded(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">4. Step-by-Step Build Guide (Optional Guide)</label>
                <textarea
                  rows={3}
                  placeholder="1. Draft initial sketches... 2. Build core..."
                  value={stepByStepGuide}
                  onChange={(e) => setStepByStepGuide(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-[#d8c3ad]'
                  }`}
                >
                  <option value="Raw Concept">Raw Concept</option>
                  <option value="Under Validation">Under Validation</option>
                  <option value="Approved">Approved</option>
                  <option value="Prototype">Prototype</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-bold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Publish Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white border border-slate-700 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 grid place-items-center shrink-0">
            <i className="fa-solid fa-check text-[10px]"></i>
          </span>
          <div>
            <b className="block text-slate-100 font-bold">InnovaSeed Notification</b>
            <p className="text-slate-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}