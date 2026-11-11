import React from 'react';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen selection:bg-solar-amber selection:text-slate-charcoal">
      
      {/* ========================================================================= */}
      {/* 1. SHARED SIDEBAR NAVIGATION (Bisa dikustomisasi dinamis sesuai role)     */}
      {/* ========================================================================= */}
      <aside className="fixed top-0 left-0 h-screen w-64 border-r border-outline-variant/60 bg-surface-container-lowest flex flex-col justify-between p-space-md z-30">
        <div className="flex flex-col gap-space-md">
          {/* Brand Header */}
          <div className="flex items-center gap-space-sm px-1 pt-1">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center p-1 shadow-sm shrink-0 border border-outline-variant/70 overflow-hidden">
              <Image
                alt="InnovaSeed Logo"
                width={32}
                height={32}
                className="object-contain"
                src="/logo.png"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-headline-sm font-headline-sm text-slate-charcoal tracking-tight font-bold">InnovaSeed</span>
                <span className="text-label-sm font-label-sm bg-solar-yellow-light text-tertiary px-1.5 py-0.5 rounded-full font-bold border border-solar-amber/30">Hub</span>
              </div>
              <span className="text-label-sm font-label-sm text-on-surface-variant truncate">Young Innovator Hub 2025</span>
            </div>
          </div>

          {/* Navigasi Utama */}
          <nav className="flex flex-col gap-1 mt-3">
            <a className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg hover:bg-surface-container-low text-slate-subtle hover:text-slate-charcoal transition-colors" href="/dashboard/student">
              <span className="material-symbols-outlined text-[20px]">school</span>
              <span className="text-label-md font-label-md flex-1">Student Dashboard</span>
            </a>
            <a className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg hover:bg-surface-container-low text-slate-subtle hover:text-slate-charcoal transition-colors" href="/dashboard/mentor">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
              <span className="text-label-md font-label-md flex-1">Mentor Dashboard</span>
            </a>
            <a className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg hover:bg-surface-container-low text-slate-subtle hover:text-slate-charcoal transition-colors" href="/dashboard/judges">
              <span className="material-symbols-outlined text-[20px]">gavel</span>
              <span className="text-label-md font-label-md flex-1">Judges Dashboard</span>
            </a>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-space-md border-t border-outline-variant/60">
          <span className="text-label-sm text-slate-subtle">Role-based Access Active</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. SHARED TOP APP BAR (Sticky Header)                                     */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest border-b border-outline-variant/60 px-gutter flex items-center justify-between z-20">
        <div className="flex items-center gap-space-md flex-1 max-w-2xl">
          <span className="text-headline-sm font-bold text-slate-charcoal">Workspace Portal</span>
        </div>
        <div className="flex items-center gap-space-sm">
          <button className="relative p-2 text-slate-subtle hover:text-slate-charcoal hover:bg-surface-container-low rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT CONTAINER (Menampilkan Halaman Anak: Student/Mentor/Judges) */}
      {/* ========================================================================= */}
      <div className="ml-64 pt-16 min-h-screen">
        {children}
      </div>

    </div>
  );
}