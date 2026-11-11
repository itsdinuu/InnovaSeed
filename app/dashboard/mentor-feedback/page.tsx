"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Feedback = {
  id: number | string
  mentor_name: string
  mentor_role: string
  feedback_text: string
  category: string
  status: 'Needs Revision' | 'Approved' | 'In Progress'
  created_at?: string
}

type NotificationItem = {
  id: number | string
  title: string
  message: string
  is_read: boolean
  created_at?: string
}

export default function MentorFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Fetch Mentor Feedback dari Supabase
      const { data: fbData } = await supabase
        .from('mentor_feedback')
        .select('*')
        .order('id', { ascending: false })

      if (fbData && fbData.length > 0) {
        setFeedbacks(fbData)
      } else {
        // Fallback demo data
        setFeedbacks([
          { 
            id: 1, 
            mentor_name: 'Dr. Ir. Budi Santoso, M.Sc.', 
            mentor_role: 'Senior Materials Engineering Mentor', 
            feedback_text: 'Ensure compressive strength testing logs for Eco-Bricks Gen 3 strictly follow ISO/IEC 17025 calibration cycles before submission.', 
            category: 'Testing Rigor', 
            status: 'Needs Revision' 
          },
          { 
            id: 2, 
            mentor_name: 'Sarah Jenkins, Ph.D.', 
            mentor_role: 'Innovation Competition Coach', 
            feedback_text: 'The English documentation in the LMS portal looks solid. Focus next on the 3-minute pitch deck narrative.', 
            category: 'Pitch Strategy', 
            status: 'Approved' 
          }
        ])
      }

      // Fetch Notifications dari Supabase
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .order('id', { ascending: false })

      if (notifData && notifData.length > 0) {
        setNotifications(notifData)
      } else {
        // Fallback demo notifications
        setNotifications([
          { id: 1, title: 'New Mentor Review', message: 'Dr. Budi left feedback on your prototype telemetry logs.', is_read: false },
          { id: 2, title: 'Submission Deadline', message: 'InnovaSeed Phase 2 milestone review in 48 hours.', is_read: false },
          { id: 3, title: 'System Update', message: 'Supabase RLS policies successfully updated.', is_read: true }
        ])
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // Fungsi saat notifikasi diklik: ubah is_read jadi true (hilang dari unread badge/list aktif)
  async function handleNotificationClick(id: number | string) {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6 relative">
      
      {/* Header & Live Notification Bell */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Mentor Feedback &amp; Review 💬</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Review evaluations from faculty advisors and track real-time alerts.</p>
        </div>

        {/* Tombol Loneng Notifikasi Live */}
        <div className="relative">
          <button 
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-bell text-amber-500 text-sm"></i>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] grid place-items-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Panel Dropdown Notifikasi */}
          {showNotificationPanel && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Live Notifications</h3>
                <span className="text-[10px] text-slate-400 font-semibold">{unreadCount} unread</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No notifications available</p>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        notif.is_read 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{notif.title}</h4>
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 mt-1"></span>}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-[9px] text-slate-400 mt-2 font-mono">Click to mark as read</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daftar Feedback Mentor */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading mentor evaluations...</div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold grid place-items-center text-sm">
                    {fb.mentor_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{fb.mentor_name}</h3>
                    <p className="text-xs text-slate-500">{fb.mentor_role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                    {fb.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                    fb.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {fb.status}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-medium">
                &ldquo;{fb.feedback_text}&rdquo;
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => alert(`Replying to ${fb.mentor_name}...`)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                >
                  Reply to Mentor
                </button>
                <button 
                  onClick={() => alert('Feedback status updated successfully.')}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition"
                >
                  Acknowledge Feedback
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}