"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type EthicsReview = {
  id: number
  student: string
  project: string
  clearance: 'Pending' | 'Approved' | 'Rejected'
  reviewStatus: 'Open' | 'Locked'
  peerSigned: boolean
}

const MOCK_SESSION_KEY = 'innovaseed_mock_session'

export default function MentorDashboardPage() {
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)
  const [mentorComment, setMentorComment] = useState('')
  const [clearanceQueue, setClearanceQueue] = useState<EthicsReview[]>([
    { id: 1, student: 'Aisha N.', project: 'Autonomous Soil Sensing Mesh', clearance: 'Pending', reviewStatus: 'Open', peerSigned: false },
    { id: 2, student: 'Noah P.', project: 'Biopolymer Water Filtration Loop', clearance: 'Approved', reviewStatus: 'Open', peerSigned: true },
    { id: 3, student: 'Mirra K.', project: 'Low-Cost Greenhouse Nutrient Monitor', clearance: 'Rejected', reviewStatus: 'Locked', peerSigned: false }
  ])

  useEffect(() => {
    let isMounted = true

    const applyMockSession = () => {
      try {
        const mockStorage = localStorage.getItem(MOCK_SESSION_KEY)
        if (!mockStorage) return false
        const mockSession = JSON.parse(mockStorage)
        if (mockSession?.role !== 'mentor' && mockSession?.route !== '/mentor') return false
        if (isMounted) setLoading(false)
        return true
      } catch {
        return false
      }
    }

    if (applyMockSession()) {
      return () => {
        isMounted = false
      }
    }

    const timeoutId = window.setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 250)

    const fetchStudentIdeas = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setLoading(false)
          return
        }
      } catch {
        // no-op: fallback to the timeout guard to keep the page rendering
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStudentIdeas()

    return () => {
      isMounted = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  const handleEthicsDecision = (id: number, decision: 'Approved' | 'Rejected') => {
    setClearanceQueue((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, clearance: decision, reviewStatus: decision === 'Approved' ? 'Open' : 'Locked' }
          : item
      )
    )
    setToast(`Ethics clearance ${decision.toLowerCase()} for student review.`)
    setTimeout(() => setToast(null), 2600)
  }

  const handlePeerReview = (id: number) => {
    setClearanceQueue((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, peerSigned: !item.peerSigned, reviewStatus: 'Open' }
          : item
      )
    )
    setToast('Peer-review sign-off updated.')
    setTimeout(() => setToast(null), 2600)
  }

  const handleToggleReviewStatus = (id: number) => {
    setClearanceQueue((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, reviewStatus: item.reviewStatus === 'Open' ? 'Locked' : 'Open' }
          : item
      )
    )
    setToast('Review status toggled successfully.')
    setTimeout(() => setToast(null), 2600)
  }

  const handleSendFeedback = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedIdea || !mentorComment.trim()) return

    setToast(`Feedback shared with ${selectedIdea}.`)
    setMentorComment('')
    setSelectedIdea(null)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Faculty Mentor Portal 👨‍🏫</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Evaluate student project submissions, review ethical clearances, and issue advisory feedback.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Pending</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{clearanceQueue.filter((item) => item.clearance === 'Pending').length}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Approved</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{clearanceQueue.filter((item) => item.clearance === 'Approved').length}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Peer sign-offs</p>
          <p className="mt-2 text-2xl font-extrabold text-sky-600">{clearanceQueue.filter((item) => item.peerSigned).length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[32vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading mentor review queue...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          {clearanceQueue.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-6 shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      item.clearance === 'Approved' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' :
                      item.clearance === 'Rejected' ? 'border-red-500/30 bg-red-500/10 text-red-600' :
                      'border-amber-500/30 bg-amber-500/10 text-amber-600'
                    }`}>{item.clearance}</span>
                    <span className="text-xs text-slate-400">Student: {item.student}</span>
                  </div>
                  <h3 className="text-lg font-bold">{item.project}</h3>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Review status: <strong className={item.reviewStatus === 'Open' ? 'text-amber-600' : 'text-slate-400'}>{item.reviewStatus}</strong></span>
                    <span>Peer sign-off: <strong className={item.peerSigned ? 'text-emerald-600' : 'text-slate-400'}>{item.peerSigned ? 'Signed' : 'Awaiting'}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleEthicsDecision(item.id, 'Approved')} className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20">
                    Approve Clearance
                  </button>
                  <button type="button" onClick={() => handleEthicsDecision(item.id, 'Rejected')} className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/20">
                    Reject
                  </button>
                  <button type="button" onClick={() => handlePeerReview(item.id)} className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-600 hover:bg-sky-500/20">
                    {item.peerSigned ? 'Peer Review Signed' : 'Sign Off Peer Review'}
                  </button>
                  <button type="button" onClick={() => handleToggleReviewStatus(item.id)} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/20">
                    {item.reviewStatus === 'Open' ? 'Lock Review' : 'Reopen Review'}
                  </button>
                  <button type="button" onClick={() => { setSelectedIdea(item.student); setMentorComment(`Mentor review for ${item.project}:`); }} className="rounded-xl bg-[#F59E0B] px-3 py-2 text-xs font-bold text-[#0F172A] hover:bg-[#D97706]">
                    Send Comment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#221a12]'}`}>
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-inherit">
              <div>
                <h3 className="font-bold text-sm">Faculty Feedback</h3>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>To: {selectedIdea}</p>
              </div>
              <button type="button" onClick={() => setSelectedIdea(null)} className="rounded-full bg-slate-500/10 px-2 py-1 text-xs">✕</button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
              <textarea
                rows={4}
                required
                value={mentorComment}
                onChange={(event) => setMentorComment(event.target.value)}
                placeholder="Provide constructive feedback or revision notes..."
                className={`w-full rounded-xl border px-3 py-2 outline-none ${isDarkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-[#d8c3ad] bg-[#fff8f4] text-[#221a12]'}`}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedIdea(null)} className={`rounded-xl px-4 py-2 font-semibold ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancel</button>
                <button type="submit" className="rounded-xl bg-[#F59E0B] px-4 py-2 font-semibold text-[#0F172A] hover:bg-[#D97706]">Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
       <div className="fixed bottom-6 right-6 z-50 animate-bounce rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 shadow-lg">
         {toast}
       </div>
      )}
    </div>
  )
}