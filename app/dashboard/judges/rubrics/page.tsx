"use client"

import { useTheme } from '@/context/ThemeContext'

const criteria = [
  {
    name: 'Research Question & Design',
    weight: 25,
    focus: 'Clarity of problem, originality, and experimental design quality.',
    guidance: 'Award strong marks when the question is specific, justified, and supported by a clear method or prototype strategy.'
  },
  {
    name: 'Execution & Data Collection',
    weight: 25,
    focus: 'Quality of testing, analysis, and validation evidence.',
    guidance: 'Judge evidence quality, reproducibility, controls, and clarity of the data collected.'
  },
  {
    name: 'Creativity & Innovation',
    weight: 20,
    focus: 'Novelty, differentiation, and meaningful real-world problem solving.',
    guidance: 'Look for strong originality, practical usefulness, and creative problem framing.'
  },
  {
    name: 'Presentation & Defense',
    weight: 30,
    focus: 'Communication quality, confidence, and scientific explanation.',
    guidance: 'Reward clear storytelling, concise technical explanations, and convincing stakeholder relevance.'
  }
]

export default function JudgeRubricsPage() {
  const { isDarkMode } = useTheme()

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Official standards</p>
        <h1 className="mt-2 text-2xl font-extrabold">Scoring Rubrics &amp; Guidelines</h1>
        <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
          Reference criteria aligned with scientific fair and innovation competition evaluation standards.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {criteria.map((criterion) => (
          <div key={criterion.name} className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-bold">{criterion.name}</h2>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                {criterion.weight}%
              </span>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-amber-500" style={{ width: `${criterion.weight}%` }} />
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Focus</p>
                <p className={isDarkMode ? 'mt-1 text-slate-300' : 'mt-1 text-[#534434]'}>{criterion.focus}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Scoring guidance</p>
                <p className={isDarkMode ? 'mt-1 text-slate-300' : 'mt-1 text-[#534434]'}>{criterion.guidance}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className={`rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
        <h3 className="text-base font-bold">Interpretation Scale</h3>
        <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Excellence', value: '90–100%', detail: 'Outstanding and clearly exceeds fair expectations.' },
            { label: 'Proficient', value: '75–89%', detail: 'Strong evidence with minor room for improvement.' },
            { label: 'Developing', value: '60–74%', detail: 'Promising but needs deeper validation and clarity.' }
          ].map((band) => (
            <div key={band.label} className={isDarkMode ? 'rounded-xl border border-slate-800 bg-slate-950/40 p-4' : 'rounded-xl border border-[#d8c3ad] bg-[#fffaf6] p-4'}>
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber-600">{band.label}</div>
              <div className="mt-2 text-xl font-extrabold text-amber-500">{band.value}</div>
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{band.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
