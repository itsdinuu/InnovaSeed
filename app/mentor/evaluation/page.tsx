import { Suspense } from 'react'
import GradingRubricsClient from './GradingRubricsClient'

export default function MentorEvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-slate-400 animate-pulse">
          Loading grading &amp; rubrics...
        </div>
      }
    >
      <GradingRubricsClient />
    </Suspense>
  )
}