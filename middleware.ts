import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/mentor')) {
    // Ambil semua cookies yang ada di browser saat ini
    const allCookies = request.cookies.getAll()
    
    // Cari apakah ada cookie apa pun yang mengandung kata 'supabase' atau 'auth' atau 'token'
    const hasAnySession = allCookies.some(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('auth') ||
      cookie.name.includes('token')
    )

    // Jika sama sekali tidak ada cookie sesi, baru tendang ke /login
    if (!hasAnySession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/mentor/:path*'],
}