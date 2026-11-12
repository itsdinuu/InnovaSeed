import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Tentukan halaman mana saja yang ingin diproteksi
  const isMentorRoute = path.startsWith('/mentor')
  const isGeneralDashboard = path.startsWith('/dashboard')

  // Ambil token / session user dari cookies (sesuaikan dengan cara Supabase menyimpan session di cookies)
  // Supabase biasanya menyimpan token dengan nama yang mengandung 'sb-...-auth-token'
  const supabaseCookie = request.cookies.get('sb-access-token') || 
                         request.cookies.getAll().find(c => c.name.includes('-auth-token'))

  // Jika mencoba akses halaman mentor/dashboard tapi belum login (tidak ada cookie)
  if ((isMentorRoute || isGeneralDashboard) && !supabaseCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // CATATAN TAMBAHAN: Untuk validasi role mentor (misal cek apakah user beneran mentor di database),
  // karena Middleware berjalan di Edge, validasi role database yang kompleks biasanya 
  // lebih aman dicek langsung di dalam Server Component pada Layout halaman tersebut.

  return NextResponse.next()
}

// Konfigurasi path mana saja yang akan dicek oleh middleware
export const config = {
  matcher: ['/mentor/:path*', '/dashboard/:path*'],
}