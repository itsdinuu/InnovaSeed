"use client"

import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from its previous value to `value`.
 * Falls back to the plain number for reduced-motion users / SSR.
 */
export function CountUp({
  value,
  duration = 900,
  suffix = '',
}: {
  value: number
  duration?: number
  suffix?: string
}) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      fromRef.current = value
      setDisplay(value)
      return
    }

    const from = fromRef.current
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const current = Math.round(from + (value - from) * eased)
      setDisplay(current)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  )
}
