"use client"

import { useTheme } from '@/context/ThemeContext'

export default function JudgeProfilePage() {
  const { isDarkMode } = useTheme()

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Evaluator profile</p>
        <h1 className="mt-2 text-2xl font-extrabold">Judge Identity &amp; Credentials</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-xl font-extrabold text-[#0F172A]">
              JP
            </div>
            <div>
              <div className="text-xl font-bold">Dr. Janice Parker</div>
              <div className="text-sm text-slate-400">Senior Evaluator • Materials &amp; Systems Science</div>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Institution</div>
              <div className="mt-1 font-semibold">National Institute for Applied Research</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Assigned panel</div>
              <div className="mt-1 font-semibold">Grand Jury Panel #4 • Sustainability &amp; Design</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Credentials</div>
              <div className="mt-1 font-semibold">PhD, Applied Materials • Certified Science Fair Judge</div>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
          <h2 className="text-lg font-bold">Authentication &amp; Institutional Access</h2>

          <div className="mt-5 space-y-3 text-sm">
            {[
              'School Faculty Badge Verified',
              'National Science Panel Certification',
              'Conflict-of-Interest Declaration Filed',
              'Blind Review Protocol Enabled'
            ].map((item) => (
              <div key={item} className={isDarkMode ? 'flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3' : 'flex items-center gap-3 rounded-xl border border-[#d8c3ad] bg-[#fffaf6] p-3'}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <i className="fa-solid fa-check"></i>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
