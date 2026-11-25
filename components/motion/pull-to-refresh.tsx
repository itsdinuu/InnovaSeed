"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"

export type PullToRefreshStatus = "idle" | "pulling" | "ready" | "refreshing"

export interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  children: React.ReactNode
  disabled?: boolean
  threshold?: number
  maxPull?: number
  holdDistance?: number
  className?: string
  contentClassName?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 72,
  maxPull = 120,
  holdDistance = 56,
  className = "",
  contentClassName = "",
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const startYRef = useRef<number | null>(null)
  const isPullingRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const pointerModeRef = useRef<"touch" | "mouse" | null>(null)

  const [pullDistance, setPullDistance] = useState(0)
  const [status, setStatus] = useState<PullToRefreshStatus>("idle")

  const clearTextSelection = useCallback(() => {
    if (typeof window !== "undefined") {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges()
      }
    }
  }, [])

  const setGlobalUserSelectLock = useCallback((locked: boolean) => {
    if (typeof document !== "undefined") {
      document.body.style.userSelect = locked ? "none" : ""
    }
  }, [])

  const applyResistance = useCallback(
    (rawDelta: number) => {
      const clamped = Math.max(0, rawDelta)
      return Math.round(maxPull * (1 - Math.exp(-clamped / maxPull)))
    },
    [maxPull]
  )

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current || disabled) return
    isRefreshingRef.current = true
    pullDistanceRef.current = holdDistance
    setPullDistance(holdDistance)
    setStatus("refreshing")

    try {
      await onRefresh()
    } finally {
      isRefreshingRef.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
      setStatus("idle")
      setGlobalUserSelectLock(false)
    }
  }, [disabled, holdDistance, onRefresh, setGlobalUserSelectLock])

  const resetPull = useCallback(() => {
    startYRef.current = null
    pointerModeRef.current = null
    isPullingRef.current = false
    pullDistanceRef.current = 0
    setPullDistance(0)
    setStatus("idle")
    setGlobalUserSelectLock(false)
    clearTextSelection()
  }, [clearTextSelection, setGlobalUserSelectLock])

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return

    const getScrollTop = () => {
      const docScrollTop =
        typeof window !== "undefined"
          ? window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
          : 0
      return Math.max(el.scrollTop, docScrollTop)
    }

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return Boolean(
        target.closest("input, textarea, select, button, a, [contenteditable='true']")
      )
    }

    // --- TOUCH EVENTS (Mobile & DevTools Mobile Emulation) ---
    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current || e.touches.length !== 1) return
      if (getScrollTop() > 2) return
      startYRef.current = e.touches[0].clientY
      pointerModeRef.current = "touch"
      isPullingRef.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (
        pointerModeRef.current !== "touch" ||
        startYRef.current === null ||
        isRefreshingRef.current
      ) {
        return
      }
      if (getScrollTop() > 2) {
        resetPull()
        return
      }

      const deltaY = e.touches[0].clientY - startYRef.current
      if (deltaY > 8) {
        isPullingRef.current = true
        const resisted = applyResistance(deltaY)
        pullDistanceRef.current = resisted
        setPullDistance(resisted)
        setStatus(resisted >= threshold ? "ready" : "pulling")
      }
    }

    const handleTouchEnd = () => {
      if (pointerModeRef.current !== "touch" || startYRef.current === null) return
      const wasPulling = isPullingRef.current
      const finalDistance = pullDistanceRef.current

      startYRef.current = null
      pointerModeRef.current = null
      isPullingRef.current = false

      if (wasPulling && finalDistance >= threshold) {
        void triggerRefresh()
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
        setStatus("idle")
      }
    }

    // --- MOUSE DRAG EVENTS (Desktop testing tanpa nge-blok teks) ---
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || isRefreshingRef.current) return
      if (isInteractiveTarget(e.target)) return
      if (getScrollTop() > 2) return
      startYRef.current = e.clientY
      pointerModeRef.current = "mouse"
      isPullingRef.current = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (
        pointerModeRef.current !== "mouse" ||
        startYRef.current === null ||
        isRefreshingRef.current
      ) {
        return
      }
      if (getScrollTop() > 2) {
        resetPull()
        return
      }

      const deltaY = e.clientY - startYRef.current
      if (deltaY > 12) {
        if (!isPullingRef.current) {
          isPullingRef.current = true
          setGlobalUserSelectLock(true)
        }
        clearTextSelection()
        const resisted = applyResistance(deltaY)
        pullDistanceRef.current = resisted
        setPullDistance(resisted)
        setStatus(resisted >= threshold ? "ready" : "pulling")
      }
    }

    const handleMouseUp = () => {
      if (pointerModeRef.current !== "mouse" || startYRef.current === null) return
      const wasPulling = isPullingRef.current
      const finalDistance = pullDistanceRef.current

      startYRef.current = null
      pointerModeRef.current = null
      isPullingRef.current = false
      setGlobalUserSelectLock(false)
      clearTextSelection()

      if (wasPulling && finalDistance >= threshold) {
        void triggerRefresh()
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
        setStatus("idle")
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchmove", handleTouchMove, { passive: true })
    el.addEventListener("touchend", handleTouchEnd)
    el.addEventListener("touchcancel", handleTouchEnd)

    el.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      setGlobalUserSelectLock(false)
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
      el.removeEventListener("touchend", handleTouchEnd)
      el.removeEventListener("touchcancel", handleTouchEnd)

      el.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    applyResistance,
    clearTextSelection,
    disabled,
    resetPull,
    setGlobalUserSelectLock,
    threshold,
    triggerRefresh,
  ])

  const progress = Math.min(1, pullDistance / threshold)
  const labelText =
    status === "refreshing"
      ? "Refreshing..."
      : status === "ready"
      ? "Release to refresh"
      : "Pull to refresh"

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Indikator Pull to Refresh di bagian atas */}
      <div
        aria-live="polite"
        style={{
          height: `${pullDistance}px`,
          opacity: status === "idle" && pullDistance === 0 ? 0 : 1,
        }}
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height,opacity] duration-150 ease-out"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300 shadow-sm">
          <span
            style={{
              transform:
                status === "refreshing"
                  ? undefined
                  : `rotate(${Math.round(progress * 180)}deg)`,
            }}
            className={`inline-block text-sm ${
              status === "refreshing" ? "animate-spin" : "transition-transform duration-100"
            }`}
          >
            {status === "refreshing" ? "↻" : status === "ready" ? "↑" : "⌄"}
          </span>
          <span>{labelText}</span>
        </div>
      </div>

      {/* Konten halaman */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${Math.round(pullDistance * 0.25)}px)` : undefined,
        }}
        className={`transition-transform duration-150 ease-out ${
          status !== "idle" ? "select-none" : "select-text"
        } ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  )
}