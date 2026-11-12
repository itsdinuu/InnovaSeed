import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export type PortalRole = 'student' | 'mentor' | 'judge'

export const portalSupabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export type PortalProfile = {
  id?: string
  uuid?: string | null
  email?: string | null
  full_name?: string | null
  name?: string | null
  role?: string | null
}

export type PortalTeam = {
  id: number
  student_id?: string | null
  user_id?: string | null
  lead_id?: string | null
  lead_email?: string | null
  mentor_id?: string | null
  mentor_email?: string | null
  mentor_code?: string | null
  team_name?: string | null
  project_title?: string | null
  title?: string | null
  description?: string | null
  category?: string | null
  track?: string | null
  repo_url?: string | null
  upload_url?: string | null
  status?: string | null
  lead_name?: string | null
  members?: string[] | null
  created_at?: string | null
  student_profile?: PortalProfile | null
  judge_scores?: Array<Record<string, unknown>>
  mentor_feedback?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export async function getProfileByUserId(userId?: string | null) {
  if (!portalSupabase || !userId) {
    return { data: null, error: null }
  }

  const { data, error } = await portalSupabase
    .from('profiles')
    .select('*')
    .or(`id.eq.${userId},uuid.eq.${userId}`)
    .maybeSingle()

  return { data: (data ?? null) as PortalProfile | null, error }
}

export async function getProfileByEmail(email?: string | null) {
  if (!portalSupabase || !email) {
    return { data: null, error: null }
  }

  const { data, error } = await portalSupabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  return { data: (data ?? null) as PortalProfile | null, error }
}

function matchesMentorAssignment(team: PortalTeam, profile: PortalProfile | null) {
  if (!team) return false
  if (!profile) return false

  const profileId = profile.id
  const profileEmail = profile.email

  return (
    team.mentor_id === profileId ||
    team.mentor_email === profileEmail ||
    (profileEmail && team.mentor_email && team.mentor_email.toLowerCase() === profileEmail.toLowerCase()) ||
    (profileId && team.mentor_id && team.mentor_id === profileId)
  )
}

export async function fetchVisibleTeamsForRole(role: PortalRole, userId?: string | null, email?: string | null) {
  if (!portalSupabase) {
    return { teams: [], profile: null, error: null }
  }

  const profileResult = userId ? await getProfileByUserId(userId) : await getProfileByEmail(email)
  const profile = profileResult.data

  const { data: allTeams, error } = await portalSupabase.from('teams').select('*')

  if (error) {
    return { teams: [], profile, error }
  }

  let teams: PortalTeam[] = Array.isArray(allTeams) ? (allTeams as PortalTeam[]) : []

  if (role === 'student') {
    teams = teams.filter((team) => {
      const ids = [team.student_id, team.user_id, team.lead_id, team.id].filter(Boolean)
      const emails = [team.lead_email, team.student_email, email].filter(Boolean)
      return ids.includes(userId ?? '') || emails.some((value) => value === email)
    })
  }

  if (role === 'mentor') {
    teams = teams.filter((team) => matchesMentorAssignment(team, profile))
    if (!teams.length) {
      teams = teams.length === 0 ? (allTeams ?? []).slice(0, 10) : teams
    }
  }

  if (role === 'judge') {
    let judgeTeamIds: number[] = []

    const { data: judgeScores } = await portalSupabase
      .from('judge_scores')
      .select('*')
      .or(`judge_id.eq.${userId ?? 'null'},judge_email.eq.${email ?? 'null'}`)

    const scoreRows = Array.isArray(judgeScores) ? (judgeScores as Array<{ team_id?: number | null }>) : []

    if (scoreRows.length > 0) {
      judgeTeamIds = scoreRows
        .map((score) => score.team_id)
        .filter((value): value is number => typeof value === 'number')
    }

    if (judgeTeamIds.length > 0) {
      teams = teams.filter((team) => judgeTeamIds.includes(team.id))
    } else if (allTeams && allTeams.length > 0) {
      teams = (allTeams ?? []).slice(0, 10)
    }
  }

  const enrichedTeams = await Promise.all(
    teams.map(async (team) => {
      const studentProfile = team.student_id
        ? await portalSupabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('id', team.student_id)
            .maybeSingle()
        : { data: null }

      const judgeScores = team.id
        ? await portalSupabase.from('judge_scores').select('*').eq('team_id', team.id)
        : { data: [] }

      const mentorFeedback = team.id
        ? await portalSupabase.from('mentor_feedback').select('*').eq('team_id', team.id)
        : { data: [] }

      return {
        ...team,
        student_profile: studentProfile.data ?? null,
        judge_scores: judgeScores.data ?? [],
        mentor_feedback: mentorFeedback.data ?? []
      }
    })
  )

  return { teams: enrichedTeams, profile, error: null }
}
