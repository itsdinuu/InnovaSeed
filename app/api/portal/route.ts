import { NextResponse } from 'next/server'
import { fetchVisibleTeamsForRole, PortalRole } from '@/lib/portalData'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = (searchParams.get('role') as PortalRole) || 'student'
  const userId = searchParams.get('userId') || null
  const email = searchParams.get('email') || null

  try {
    const { teams, profile, error } = await fetchVisibleTeamsForRole(role, userId, email)

    if (error) {
      return NextResponse.json({ error: error.message, teams: [], profile: null }, { status: 500 })
    }

    return NextResponse.json({ teams, profile, role })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load portal data.',
        teams: [],
        profile: null,
        role
      },
      { status: 500 }
    )
  }
}
