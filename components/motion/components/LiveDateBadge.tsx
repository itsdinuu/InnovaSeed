"use client"

import { useTheme } from '@/context/ThemeContext'

export function LiveDateBadge() {
  const { isDarkMode } = useTheme()

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={`px-4 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 shadow-sm ${
        isDarkMode
          ? 'bg-slate-900 border-slate-800 text-amber-400'
          : 'bg-white border-[#d8c3ad] text-[#855300]'
      }`}
    >
      <i className="fa-regular fa-calendar-check text-amber-500"></i>
      <span suppressHydrationWarning>Today: {formattedDate}</span>
    </div>
  )
}