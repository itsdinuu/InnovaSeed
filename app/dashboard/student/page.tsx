"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type ProjectData = {
  id?: string
  title: string
  description: string
}

export default function StudentDashboardPage() {
  const [userName, setUserName] = useState('Innovator')
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.user_metadata?.lead_name) {
        setUserName(session.user.user_metadata.lead_name)
      }

      // Fetch project data from Supabase
      const { data } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
        .single()

      if (data) {
        setProjectData(data)
      }
      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-slate-500 animate-pulse">Loading innovation data...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {userName} 👋{' '}
            <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 align-middle">
              Accelerated Track
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Innovation Platform &amp; Competition Accelerator • Plego Indonesia</p>
        </div>
      </div>

      {/* Empty State Condition If No Projects Exist Yet */}
      {!projectData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center mt-6 shadow-sm max-w-xl mx-auto">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl grid place-items-center mx-auto mb-4 text-xl">
            <i className="fa-solid fa-lightbulb"></i>
          </div>
          <h2 className="text-lg font-bold text-slate-900">No Innovation Projects Registered</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            You haven&apos;t submitted any innovation data to the database yet. Start capturing ideas or register your first prototype now!
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link 
              href="/dashboard/idea-bank" 
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
            >
              <i className="fa-solid fa-plus"></i> Capture New Idea
            </Link>
          </div>
        </div>
      ) : (
        /* If Project Exists, Render Normal Card */
        <div className="grid xl:grid-cols-[1fr_330px] gap-5 mt-5">
          <div className="space-y-5">
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-md font-semibold">
                In Progress
              </span>
              <h2 className="text-xl font-bold mt-3">{projectData.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{projectData.description}</p>
            </section>
          </div>
        </div>
      )}
    </>
  )
}