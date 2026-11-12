import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Cek apakah user mencoba mengakses jalur /mentor
  if (path.startsWith('/mentor')) {
    // Ambil token / session cookies dari Supabase
    // Supabase Auth secara otomatis menyimpan token di cookies browser
    const allCookies = request.cookies.getAll()
    const hasSupabaseSession = allCookies.some(cookie => 
      cookie.name.includes('auth-token') || cookie.name.includes('supabase')
    )

    // Jika tidak ada session / belum login, langsung tendang ke /login
    if (!hasSupabaseSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// Tentukan rute mana saja yang ingin diproteksi ketat oleh middleware
export const config = {
  matcher: ['/mentor/:path*'],
}