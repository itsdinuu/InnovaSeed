"use client"

/**
 * Global motion tokens + keyframes. Rendered once (in the dashboard layout).
 * No dependencies. Everything is disabled for users who prefer reduced motion.
 */
const css = `
:root {
  --mo-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --mo-dur: 480ms;
}

@keyframes mo-fade-up   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes mo-fade-in   { from { opacity: 0; } to { opacity: 1; } }
@keyframes mo-pop       { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes mo-slide-in-left  { from { transform: translateX(-100%); } to { transform: none; } }
@keyframes mo-slide-in-right { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes mo-shimmer   { from { background-position: -200% 0; } to { background-position: 200% 0; } }
@keyframes mo-grow-x    { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.mo-fade-up   { animation: mo-fade-up var(--mo-dur) var(--mo-ease) backwards; }
.mo-fade-in   { animation: mo-fade-in 300ms ease-out both; }
.mo-pop       { animation: mo-pop 260ms var(--mo-ease) backwards; }
.mo-drawer    { animation: mo-slide-in-left 320ms var(--mo-ease) backwards; }
.mo-toast     { animation: mo-slide-in-right 320ms var(--mo-ease) backwards; }
.mo-backdrop  { animation: mo-fade-in 250ms ease-out both; }

/* Page transition: used by <PageTransition> */
.mo-page { animation: mo-fade-up 420ms var(--mo-ease) backwards; }

/* Stagger: put on any grid / stack and its direct children cascade in */
.mo-stagger > *:not(.fixed):not(.mo-toast) { animation: mo-fade-up var(--mo-dur) var(--mo-ease) backwards; }
.mo-stagger > *:nth-child(1)  { animation-delay: 0ms; }
.mo-stagger > *:nth-child(2)  { animation-delay: 60ms; }
.mo-stagger > *:nth-child(3)  { animation-delay: 120ms; }
.mo-stagger > *:nth-child(4)  { animation-delay: 180ms; }
.mo-stagger > *:nth-child(5)  { animation-delay: 240ms; }
.mo-stagger > *:nth-child(6)  { animation-delay: 300ms; }
.mo-stagger > *:nth-child(7)  { animation-delay: 360ms; }
.mo-stagger > *:nth-child(8)  { animation-delay: 420ms; }
.mo-stagger > *:nth-child(n+9) { animation-delay: 480ms; }

/* Hover lift for cards (add .mo-lift) */
.mo-lift { transition: transform 220ms var(--mo-ease), box-shadow 220ms var(--mo-ease), border-color 220ms; will-change: transform; }
.mo-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 24px -12px rgba(245, 158, 11, .35); }

/* Button press feedback (add .mo-press) */
.mo-press { transition: transform 120ms ease, background-color 200ms, box-shadow 200ms; }
.mo-press:active { transform: scale(.96); }

/* Progress bars: grow from the left when they appear */
.mo-bar { transform-origin: left center; animation: mo-grow-x 900ms var(--mo-ease) 200ms both; }

/* Skeleton shimmer */
.mo-skeleton {
  background: linear-gradient(90deg, rgba(148,163,184,.15) 25%, rgba(148,163,184,.3) 37%, rgba(148,163,184,.15) 63%);
  background-size: 200% 100%;
  animation: mo-shimmer 1.4s linear infinite;
  border-radius: .75rem;
}

@media (prefers-reduced-motion: reduce) {
  .mo-fade-up, .mo-fade-in, .mo-pop, .mo-drawer, .mo-toast, .mo-backdrop,
  .mo-page, .mo-stagger > *, .mo-bar, .mo-skeleton { animation: none !important; }
  .mo-lift, .mo-press { transition: none !important; }
  .mo-lift:hover { transform: none; }
}
`

export function MotionStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
