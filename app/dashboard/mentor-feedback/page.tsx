"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/context/ThemeContext'

type Feedback = {
  id: number | string
  mentor_name: string
  mentor_role: string
  feedback_text: string
  category: string
  status: 'Needs Revision' | 'Approved' | 'In Progress'
  is_read?: boolean
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
  const { isDarkMode } = useTheme()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)

  useEffect(() => {
    async function fetchRealData() {
      setLoading(true)

      // Ambil data Mentor Feedback MURNI dari database Supabase
      const { data: fbData, error: fbError } = await supabase
        .from('mentor_feedback')
        .select('*')
        .order('id', { ascending: false })

      if (!fbError && fbData) {
        setFeedbacks(fbData)
      }

      // Ambil data Notifikasi MURNI dari database Supabase
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('id', { ascending: false })

      if (!notifError && notifData) {
        setNotifications(notifData)
      }

      setLoading(false)
    }

    fetchRealData()
  }, [])

  // Fungsi real-time saat notifikasi diklik: ubah is_read jadi true di database dan update state
  async function handleNotificationClick(id: number | string) {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
  }

  // Fungsi real-time saat feedback diklik/diakui: ubah is_read jadi true di database
  async function handleFeedbackRead(id: number | string) {
    setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, is_read: true } : f))

    await supabase
      .from('mentor_feedback')
      .update({ is_read: true })
      .eq('id', id)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6 relative">
      
      {/* Header & Live Notification Bell */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Mentor Feedback &amp; Review 💬</h1>
          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Review real evaluations from faculty advisors and track real-time alerts.</p>
        </div>

        {/* Tombol Lonceng Notifikasi Live */}
        <div className="relative">
          <button 
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'}`}
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
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl p-4 z-50 space-y-3 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
              <div className={`flex items-center justify-between border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <h3 className="font-bold text-xs uppercase tracking-wider">Live Notifications</h3>
                <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{unreadCount} unread</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className={`text-center text-xs py-4 ${isDarkMode ? 'text-slate-500' : 'text-[#534434]'}`}>No notifications in database</p>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        notif.is_read 
                          ? (isDarkMode ? 'bg-slate-800/40 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-60') 
                          : (isDarkMode ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50')
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs">{notif.title}</h4>
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 mt-1"></span>}
                      </div>
                      <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{notif.message}</p>
                      <p className="text-[9px] text-amber-500/80 mt-2 font-mono">Click to mark as read</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daftar Feedback Mentor dari Database */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 animate-pulse text-sm">Loading real mentor evaluations from Supabase...</div>
      ) : feedbacks.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center shadow-xs space-y-3 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl grid place-items-center mx-auto text-lg">
            <i className="fa-solid fa-comments"></i>
          </div>
          <h3 className="font-bold">No Mentor Feedback Recorded</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
            Your Supabase table mentor_feedback is currently empty. Add entries via Supabase to display them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((fb) => (
            <div 
              key={fb.id} 
              className={`border rounded-2xl p-6 shadow-xs space-y-4 transition-colors ${
                fb.is_read 
                  ? (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad]') 
                  : (isDarkMode ? 'bg-slate-900 border-amber-500/50 ring-2 ring-amber-500/20 text-slate-100' : 'bg-white border-amber-300 ring-2 ring-amber-400/20')
              }`}
            >
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-[#d8c3ad]/40'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 font-bold grid place-items-center text-sm">
                    {fb.mentor_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{fb.mentor_name}</h3>
                      {!fb.is_read && (
                        <span className="text-[9px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          New
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{fb.mentor_role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#fff1e5] text-[#534434]'}`}>
                    {fb.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                    fb.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' :
                    'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                  }`}>
                    {fb.status}
                  </span>
                </div>
              </div>

              <div className={`border rounded-xl p-4 text-xs leading-relaxed font-medium transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-[#fff1e5]/50 border-[#d8c3ad]/50 text-[#221a12]'}`}>
                &ldquo;{fb.feedback_text}&rdquo;
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => alert(`Replying to ${fb.mentor_name}...`)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-[#d8c3ad] text-[#221a12] hover:bg-[#fff1e5]'}`}
                >
                  Reply to Mentor
                </button>
                <button 
                  onClick={() => handleFeedbackRead(fb.id)}
                  className="px-4 py-2 text-xs font-semibold bg-[#F59E0B] text-[#0F172A] rounded-xl hover:bg-[#D97706] transition cursor-pointer shadow-sm"
                >
                  {fb.is_read ? 'Acknowledged' : 'Acknowledge Feedback'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}