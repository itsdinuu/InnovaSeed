import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Cek apakah user mencoba mengakses jalur /mentor
  if (path.startsWith('/mentor')) {
    // Ambil semua cookies browser
    const allCookies = request.cookies.getAll()
    
    // Cek apakah ada cookie milik Supabase (Supabase auth cookies biasanya berawalan 'sb-')
    const hasSupabaseSession = allCookies.some(cookie => 
      cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    )

    // Jika tidak ada session cookie / belum login, langsung tendang ke /login
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