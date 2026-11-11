"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    teamName: '',
    leadName: '',
    email: '',
    institution: '',
    researchField: 'Biotechnology & Health',
    teamSize: '3 members',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const steps = [
    ['Create your team account', 'Register with your institutional email.'],
    ['Verify with your faculty mentor', 'Mentors confirm your team and research ethics.'],
    ['Start logging trials', 'Unlock your workspace and prep for judging.']
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.')
      return
    }
    setLoading(true)
    setErrorMessage('')

    try {
      // 1. Register account with Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            team_name: formData.teamName,
            lead_name: formData.leadName,
            institution: formData.institution,
            research_field: formData.researchField,
            team_size: formData.teamSize
          }
        }
      })

      if (error) throw error

      // 2. If successful, redirect to login
      alert('Team account registration successful! Please sign in.')
      router.push('/login')

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while registering with Supabase.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-sans text-slate-900 bg-white min-h-screen grid lg:grid-cols-[0.8fr_1.2fr]">
      {/* Left Side: Banner / Branding */}
      <aside className="hidden lg:flex flex-col justify-between p-10 text-white bg-linear-to-b from-stone-950 via-stone-900 to-amber-950">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white text-amber-500 grid place-items-center">
              <i className="fa-solid fa-seedling"></i>
            </span>
            <div>
              <b>InnovaSeed <span className="text-[10px] border border-white/30 rounded px-1.5 py-0.5 ml-1">PROD-v2.8</span></b>
              <p className="text-xs text-slate-400">A Plego Indonesia Product</p>
            </div>
          </div>

          <span className="inline-block rounded-md px-3 py-1.5 text-[11px] font-semibold bg-white/10 border border-amber-500/40 text-amber-300 mt-14">
            <i className="fa-solid fa-circle-check mr-1.5"></i> Registration Open · PLEGO 2026 Cohort
          </span>

          <h2 className="text-4xl font-extrabold leading-tight mt-6">
            Plant your idea. Grow it into a global innovation.
          </h2>
          <p className="text-slate-400 mt-5 text-sm">
            Register your innovation team in minutes and get a synchronized lab notebook, faculty mentorship and a direct path to national qualifiers.
          </p>

          <ol className="mt-8 space-y-4">
            {steps.map(([t, d], i) => (
              <li key={i} className="flex gap-3 items-center">
                <span className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold ${i === 0 ? 'bg-amber-500 text-slate-950' : 'border border-white/30 text-white'}`}>
                  {i + 1}
                </span>
                <div className="text-sm">
                  <b>{t}</b>
                  <p className="text-xs text-slate-400">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3 text-xs">
            <span className="flex -space-x-2">
              <span className="w-8 h-8 rounded-full bg-slate-400 ring-2 ring-stone-900"></span>
              <span className="w-8 h-8 rounded-full bg-amber-300 ring-2 ring-stone-900"></span>
              <span className="w-8 h-8 rounded-full bg-slate-500 ring-2 ring-stone-900"></span>
            </span>
            <div>
              <b className="text-sm">12,000+ Young Innovators</b>
              <p className="text-slate-400 text-[11px]">84 partner universities &amp; labs</p>
            </div>
            <span className="ml-auto bg-amber-500 text-slate-950 font-bold rounded px-2 py-1">99.8% Uptime</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-6 pt-4 border-t border-white/10">
            <span><i className="fa-solid fa-lock mr-1"></i> ISO 17025 Research Log</span>
            <span>© 2026 Plego Indonesia Ecosystem</span>
          </div>
        </div>
      </aside>

      {/* Right Side: Registration Form */}
      <main className="flex flex-col justify-center px-6 sm:px-12 xl:px-20 py-10">
        <form onSubmit={handleRegister} className="w-full max-w-129 mx-auto">
          <div className="flex justify-between text-[11px] tracking-wider font-semibold text-slate-600">
            <span><i className="fa-solid fa-seedling text-amber-500 mr-2"></i>TEAM REGISTRATION</span>
            <Link href="#" className="font-normal text-slate-500 tracking-normal hover:underline"><i className="fa-regular fa-circle-question mr-1"></i> Helpdesk &amp; FAQ</Link>
          </div>

          <h1 className="text-3xl font-bold mt-5">Register your Innovation Team</h1>
          <p className="text-slate-500 mt-2 text-sm">Create a team account to join the InnovaSeed 2026 cohort and access your research workspace.</p>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mt-4">
              {errorMessage}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Team Name</label>
              <div className="relative">
                <i className="fa-solid fa-user-group absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  required
                  value={formData.teamName}
                  onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="e.g., Bio-Spark Team"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Team Lead Full Name</label>
              <div className="relative">
                <i className="fa-regular fa-user absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  required
                  value={formData.leadName}
                  onChange={(e) => setFormData({...formData, leadName: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Institutional Email</label>
                <span className="text-[11px] text-slate-400">e.g., student.lead@smkn8jkt.sch.id</span>
              </div>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="student.lead@smkn8jkt.sch.id"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">School / Institution</label>
              <div className="relative">
                <i className="fa-solid fa-school absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({...formData, institution: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="e.g., SMKN 8 Jakarta"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Research Field</label>
              <select
                value={formData.researchField}
                onChange={(e) => setFormData({...formData, researchField: e.target.value})}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              >
                <option>Biotechnology &amp; Health</option>
                <option>Environmental Engineering</option>
                <option>Materials Science</option>
                <option>Computer Science &amp; IoT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Team Size</label>
              <select
                value={formData.teamSize}
                onChange={(e) => setFormData({...formData, teamSize: e.target.value})}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              >
                <option>1 member</option>
                <option>2 members</option>
                <option>3 members</option>
                <option>4 members</option>
                <option>5 members</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Password</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Min. 10 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Repeat password"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 mt-5 text-xs">
            <i className="fa-solid fa-circle-info text-amber-600 mt-0.5"></i>
            <div>
              <b className="text-sm text-slate-800">Mentor verification required</b>
              <p className="text-slate-600 mt-0.5">After registering, your faculty mentor will receive an email to verify your team within 48 hours.</p>
            </div>
          </div>

          <label className="flex gap-2 items-center text-xs text-slate-600 mt-4">
            <input type="checkbox" defaultChecked required className="accent-amber-500" />
            I agree to the <Link href="#" className="font-semibold underline text-slate-900">Terms of Use</Link> and <Link href="#" className="font-semibold underline text-slate-900">Research Data Protection Policy</Link> (ISO/IEC 17025).
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Account...' : 'Create Team Account →'}
          </button>

          <p className="text-center text-xs text-slate-500 mt-5">
            Already have an InnovaSeed account?<br />
            <Link href="/login" className="font-semibold text-amber-700 hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-[11px] text-slate-400 mt-4">
            Protected by Plego Indonesia 256-bit ISO/IEC data protection layer. Need help?<br />
            <Link href="#" className="underline text-sm text-slate-900 font-medium">Contact Accelerator Registrar</Link>
          </p>
        </form>
      </main>
    </div>
  )
}