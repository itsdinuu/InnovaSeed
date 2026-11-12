"use client"

import { useMemo, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

type TeamEntry = {
  id: string
  code: string
  team: string
  project: string
  track: string
  status: string
  score: number | null
}

type RubricItem = {
  id: string
  label: string
  weight: number
  max: number
  score: number
}

const initialQueue: TeamEntry[] = [
  { id: 'geo-2025-081', code: 'GEO-2025-081', team: 'Team GeoPoly', project: 'Eco-Friendly Plastic Bricks', track: 'Materials Science', status: 'Pending Review', score: null },
  { id: 'bio-2025-104', code: 'BIO-2025-104', team: 'Bio-Spark Team', project: 'Banana-Fiber Bioplastic Film', track: 'Biotechnology', status: 'Scored', score: 94.5 },
  { id: 'iot-2025-033', code: 'IOT-2025-033', team: 'AgriSense Lab', project: 'Solar-Powered Soil Sensor', track: 'Computer Science', status: 'Pending Review', score: null },
  { id: 'agr-2025-219', code: 'AGR-2025-219', team: 'GreenPath Collective', project: 'Precision Hydroponic Biometrics', track: 'Agricultural Innovation', status: 'Needs Recheck', score: null }
]

const initialRubric: RubricItem[] = [
  { id: 'design', label: 'Research Question & Design', weight: 25, max: 25, score: 22 },
  { id: 'execution', label: 'Execution & Data Collection', weight: 25, max: 25, score: 20 },
  { id: 'creativity', label: 'Creativity & Innovation', weight: 20, max: 20, score: 18 },
  { id: 'presentation', label: 'Presentation / Defense', weight: 30, max: 30, score: 27 }
]

export default function JudgeDashboardPage() {
  const { isDarkMode } = useTheme()
  const [queue, setQueue] = useState<TeamEntry[]>(initialQueue)
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialQueue[0].id)
  const [rubric, setRubric] = useState<RubricItem[]>(initialRubric)
  const [feedback, setFeedback] = useState('Excellent problem framing and strong prototype validation. Continue to improve clarity in the final presentation narrative.')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const selectedTeam = queue.find((team) => team.id === selectedTeamId) ?? queue[0]

  const totalScore = useMemo(
    () => rubric.reduce((sum, item) => sum + item.score, 0),
    [rubric]
  )

  const maxScore = useMemo(
    () => rubric.reduce((sum, item) => sum + item.max, 0),
    [rubric]
  )

  const scoreProgress = Math.min(100, Math.round((totalScore / maxScore) * 100))

  const handleScoreChange = (id: string, nextValue: number) => {
    setRubric((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, score: Math.min(Math.max(nextValue, 0), item.max) }
          : item
      )
    )
  }

  const handleOpenRubric = (teamId: string) => {
    setSelectedTeamId(teamId)
    setIsModalOpen(true)
    setIsSubmitted(false)
  }

  const handleFinalSubmit = () => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === selectedTeamId
          ? { ...item, status: 'Scored', score: totalScore }
          : item
      )
    )
    setIsSubmitted(true)
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
              <i className="fa-solid fa-scale-balanced mr-1.5"></i> Grand Jury Panel #4
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">Competition Judge Portal</h1>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Review assigned innovation teams, evaluate against official fair criteria, and finalize compliant score submissions.
            </p>
          </div>

          <div className={`rounded-xl border px-4 py-3 text-xs ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-[#fff1e5] border-[#d8c3ad]'}`}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Evaluation mode</div>
            <div className="mt-1 font-bold">Blind Review Active</div>
            <div className="mt-1 text-emerald-600 font-semibold">
              <i className="fa-solid fa-shield-halved mr-1"></i> Integrity Verified
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Teams', value: '4', note: 'Current shortlist' },
          { label: 'Completed', value: '1 / 4', note: 'One finalized review' },
          { label: 'Average Score', value: '88.4', note: 'Against weighted rubric' },
          { label: 'Status', value: 'Open', note: 'Next panel in 48 hrs' }
        ].map((item, index) => (
          <div key={index} className={`rounded-2xl border p-5 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
            <p className={`text-[11px] uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{item.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <b className="text-2xl font-extrabold">{item.value}</b>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-600">Live</span>
            </div>
            <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>{item.note}</p>
          </div>
        ))}
      </div>

      <section className={`rounded-2xl border p-6 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold">Assigned Team Queue</h2>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Competition roster for scientific judging and final score validation.
            </p>
          </div>
          <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
            4 Entries Assigned
          </span>
        </div>

        <div className="space-y-3">
          {queue.map((team) => {
            const isSelected = selectedTeam.id === team.id
            const statusClass = team.status === 'Scored'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : team.status === 'Needs Recheck'
                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'

            return (
              <div
                key={team.id}
                className={`rounded-xl border p-4 transition ${isSelected ? (isDarkMode ? 'border-amber-500/60 bg-amber-500/5' : 'border-amber-500/60 bg-amber-50/70') : (isDarkMode ? 'border-slate-800 bg-slate-950/30' : 'border-[#d8c3ad] bg-[#fffaf6]')}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-mono font-semibold text-amber-700 dark:bg-slate-800 dark:text-amber-300">{team.code}</span>
                      <span className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 border border-amber-500/20">{team.track}</span>
                    </div>
                    <b className="mt-2 block text-base">{team.project}</b>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>Team: {team.team}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>{team.status}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenRubric(team.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-amber-400 transition"
                    >
                      Open Rubric <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={`rounded-2xl border p-6 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#d8c3ad]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">Evaluation Summary</h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
              Active review for {selectedTeam.project} • {selectedTeam.team}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Current total</div>
            <div className="text-2xl font-extrabold text-amber-500">{totalScore} / {maxScore}</div>
            {isSubmitted && (
              <span className="mt-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">
                Finalized
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Score progress</span>
            <span className="text-sm font-bold text-amber-600">{scoreProgress}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-2.5 rounded-full bg-amber-500" style={{ width: `${scoreProgress}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-600">Qualitative feedback</h4>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={6}
              className={`mt-3 w-full rounded-xl border p-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-[#d8c3ad] text-[#1f1b1a]'}`}
            />
          </div>

          <div className={`rounded-xl border p-4 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-[#fffaf6] border-[#d8c3ad]'}`}>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-amber-600">Panel notes</h4>
            <ul className={`mt-3 space-y-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-[#534434]'}`}>
              <li><i className="fa-solid fa-circle-check text-emerald-500 mr-2"></i>Prototype is technically sound and well-documented.</li>
              <li><i className="fa-solid fa-lightbulb text-amber-500 mr-2"></i>Impact story could be strengthened with external benchmark comparisons.</li>
              <li><i className="fa-solid fa-users text-sky-500 mr-2"></i>Student team demonstrated strong collaborative execution and communication.</li>
            </ul>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-3xl rounded-2xl border p-5 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#d8c3ad]'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600 font-semibold">Official rubric</p>
                <h3 className="mt-1 text-xl font-bold">{selectedTeam.project}</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#534434]'}`}>
                  {selectedTeam.team} • {selectedTeam.track}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {rubric.map((criterion) => (
                <div key={criterion.id} className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-[#d8c3ad] bg-[#fffaf6]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold">{criterion.label}</h4>
                      <p className="text-[11px] text-slate-400">Weight: {criterion.weight} pts</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={criterion.max}
                        value={criterion.score}
                        onChange={(event) => handleScoreChange(criterion.id, Number(event.target.value))}
                        className="accent-amber-500"
                      />
                      <span className="w-12 text-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-sm font-bold text-amber-600">
                        {criterion.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-amber-600">Total score</div>
                <div className="text-2xl font-extrabold text-amber-500">{totalScore} / {maxScore}</div>
              </div>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-[#0F172A] hover:bg-amber-400 transition"
              >
                <i className="fa-solid fa-lock"></i> Lock & Submit Final Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}