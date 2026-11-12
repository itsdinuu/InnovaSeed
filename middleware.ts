import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  void request
  // Biarkan semua request lolos ke layout, karena pengecekan login & role 
  // sudah dipegang penuh secara aman oleh layout.tsx
  return NextResponse.next()
}

export const config = {
  matcher: ['/mentor/:path*'],
}