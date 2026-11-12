export type JudgeCriterion = {
  id: string
  label: string
  weight: number
  max: number
  score: number
}

export type JudgeStatus = 'Pending Review' | 'Draft' | 'Scored'

export type JudgeTeamRecord = {
  id: string
  code: string
  team: string
  project: string
  track: string
  category: string
  status: JudgeStatus
  score: number | null
  criteria: JudgeCriterion[]
  feedback: string
  updatedAt: string
}

export const defaultJudgeCriteria: JudgeCriterion[] = [
  { id: 'design', label: 'Research Question & Design', weight: 25, max: 25, score: 22 },
  { id: 'execution', label: 'Execution & Data Collection', weight: 25, max: 25, score: 20 },
  { id: 'creativity', label: 'Creativity & Innovation', weight: 20, max: 20, score: 18 },
  { id: 'presentation', label: 'Presentation / Defense', weight: 30, max: 30, score: 27 }
]

export const defaultJudgeTeams: JudgeTeamRecord[] = [
  {
    id: 'team-geo',
    code: 'GEO-2025-081',
    team: 'Team GeoPoly',
    project: 'Eco-Friendly Plastic Bricks',
    track: 'Materials Science',
    category: 'Sustainable Materials',
    status: 'Pending Review',
    score: null,
    criteria: defaultJudgeCriteria.map((criterion) => ({ ...criterion, score: Math.round(criterion.score * 0.9) })),
    feedback: 'Strong sustainability narrative with a practical material prototype. Consider adding benchmarking data to strengthen the research claim.',
    updatedAt: '2026-11-12T09:00:00.000Z'
  },
  {
    id: 'team-bio',
    code: 'BIO-2025-104',
    team: 'Bio-Spark Team',
    project: 'Banana-Fiber Bioplastic Film',
    track: 'Biotechnology',
    category: 'Agricultural Biotech',
    status: 'Scored',
    score: 94.5,
    criteria: [
      { id: 'design', label: 'Research Question & Design', weight: 25, max: 25, score: 24 },
      { id: 'execution', label: 'Execution & Data Collection', weight: 25, max: 25, score: 23 },
      { id: 'creativity', label: 'Creativity & Innovation', weight: 20, max: 20, score: 18 },
      { id: 'presentation', label: 'Presentation / Defense', weight: 30, max: 30, score: 29.5 }
    ],
    feedback: 'Excellent problem framing and lifecycle analysis. Presentation was polished and data-rich.',
    updatedAt: '2026-11-10T16:20:00.000Z'
  },
  {
    id: 'team-iot',
    code: 'IOT-2025-033',
    team: 'AgriSense Lab',
    project: 'Solar-Powered Soil Sensor',
    track: 'Computer Science',
    category: 'Environmental IoT',
    status: 'Draft',
    score: 82.4,
    criteria: [
      { id: 'design', label: 'Research Question & Design', weight: 25, max: 25, score: 20 },
      { id: 'execution', label: 'Execution & Data Collection', weight: 25, max: 25, score: 21 },
      { id: 'creativity', label: 'Creativity & Innovation', weight: 20, max: 20, score: 18 },
      { id: 'presentation', label: 'Presentation / Defense', weight: 30, max: 30, score: 23.4 }
    ],
    feedback: 'Strong technical execution and a compelling use case. Add more comparative field testing metrics before final lock.',
    updatedAt: '2026-11-11T13:00:00.000Z'
  },
  {
    id: 'team-agr',
    code: 'AGR-2025-219',
    team: 'GreenPath Collective',
    project: 'Precision Hydroponic Biometrics',
    track: 'Agricultural Innovation',
    category: 'Food Systems',
    status: 'Scored',
    score: 91.2,
    criteria: [
      { id: 'design', label: 'Research Question & Design', weight: 25, max: 25, score: 23 },
      { id: 'execution', label: 'Execution & Data Collection', weight: 25, max: 25, score: 22 },
      { id: 'creativity', label: 'Creativity & Innovation', weight: 20, max: 20, score: 18 },
      { id: 'presentation', label: 'Presentation / Defense', weight: 30, max: 30, score: 28.2 }
    ],
    feedback: 'Excellent field testing plan and impact narrative. The team communicates exceptionally well with relevant agricultural stakeholders.',
    updatedAt: '2026-11-09T11:45:00.000Z'
  }
]

export const JUDGE_STORAGE_KEY = 'innovaseed_judge_records_v1'

export function getJudgeRecords(): JudgeTeamRecord[] {
  if (typeof window === 'undefined') return defaultJudgeTeams

  const storedRecords = window.localStorage.getItem(JUDGE_STORAGE_KEY)
  if (!storedRecords) {
    window.localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(defaultJudgeTeams))
    return defaultJudgeTeams
  }

  try {
    const parsed = JSON.parse(storedRecords) as JudgeTeamRecord[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultJudgeTeams
  } catch {
    return defaultJudgeTeams
  }
}

export function saveJudgeRecords(records: JudgeTeamRecord[]) {
  if (typeof window === 'undefined') return records
  window.localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(records))
  return records
}

export function getJudgeTotals(criteria: JudgeCriterion[]) {
  const total = criteria.reduce((sum, item) => sum + item.score, 0)
  const max = criteria.reduce((sum, item) => sum + item.max, 0)
  return { total, max }
}

export function getLeaderboardRecords() {
  const records = getJudgeRecords().filter((team) => team.status === 'Scored')
  return [...records].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((team, index) => ({
    rank: index + 1,
    team: team.team,
    project: team.project,
    score: Number(team.score ?? 0),
    cohort: team.track,
    trend: index === 0 ? '+3.1' : index === 1 ? '+2.4' : '+1.8'
  }))
}
