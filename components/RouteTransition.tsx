'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true))
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return (
    <div key={pathname} className={`route-transition ${isReady ? 'route-transition--visible' : ''}`}>
      {children}
    </div>
  )
}
