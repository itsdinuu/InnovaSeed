"use client"

import { usePathname } from 'next/navigation'

/**
 * Re-triggers a soft fade-up each time the route changes.
 * Keyed by pathname, so the wrapper remounts and the CSS animation replays.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="mo-page">
      {children}
    </div>
  )
}
