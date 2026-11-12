"use client"

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<'student' | 'mentor'>('student')
  const [email, setEmail] = useState('student.lead@innovaseed.sch.id')
  const [password, setPassword] = useState('studentpass123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const navigateWithTransition = (target: string) => {
    if (isTransitioning) return

    setIsTransitioning(true)
    setTransitionTarget(target)

    window.setTimeout(() => {
      router.push(target)
    }, 260)
  }

  const roleConfig = {
    student: {
      key: 'student',
      icon: 'fa-graduation-cap',
      title: 'Student',
      desc: 'Access the student dashboard and research workspace.',
      workspace: 'Student Dashboard',
      link: '/dashboard/student',
      demoEmail: 'student.lead@innovaseed.sch.id',
      demoPass: 'studentpass123'
    },
    mentor: {
      key: 'mentor',
      icon: 'fa-user-tie',
      title: 'Mentor',
      desc: 'Review teams, mentor feedback, and guidance workflows.',
      workspace: 'Mentor Dashboard',
      link: '/mentor',
      demoEmail: 'mentor.maya@innovaseed.sch.id',
      demoPass: 'mentorpass123'
    }
  } as const

  const roles = [roleConfig.student, roleConfig.mentor]

  const handleRoleSelect = (role: 'student' | 'mentor') => {
    setIsAnimating(true)
    setActiveRole(role)
    setEmail(roleConfig[role].demoEmail)
    setPassword(roleConfig[role].demoPass)

    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const selectedRole = activeRole
    const selectedConfig = roleConfig[selectedRole]

    const isDemoLogin =
      email.trim().toLowerCase() === selectedConfig.demoEmail.toLowerCase() &&
      password === selectedConfig.demoPass

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError && !isDemoLogin) {
        console.warn('Supabase auth failed, trying demo fallback:', authError.message)
      }

      const user = authData?.user

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .or(`id.eq.${user.id},uuid.eq.${user.id}`)
          .maybeSingle()

        const resolvedRole = (profileData?.role || selectedRole).toLowerCase()
        const targetRoute = resolvedRole === 'mentor' ? '/mentor' : '/dashboard/student'

        setIsTransitioning(true)
        setTransitionTarget(targetRoute)
        window.setTimeout(() => {
          router.push(targetRoute)
        }, 500)
        return
      }

      if (isDemoLogin) {
        const targetRoute = selectedRole === 'mentor' ? '/mentor' : '/dashboard/student'

        setIsTransitioning(true)
        setTransitionTarget(targetRoute)
        window.setTimeout(() => {
          router.push(targetRoute)
        }, 500)
        return
      }

      setErrorMessage('Incorrect email or password. Please use the correct demo credentials or check the database record.')
    } catch {
      if (isDemoLogin) {
        const targetRoute = selectedRole === 'mentor' ? '/mentor' : '/dashboard/student'

        setIsTransitioning(true)
        setTransitionTarget(targetRoute)
        window.setTimeout(() => {
          router.push(targetRoute)
        }, 500)
        return
      }

      setErrorMessage('Login failed. Please check your account and role selection.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSSO = async () => {
    navigateWithTransition(roleConfig[activeRole].link)
  }

  const handleSchoolSSO = () => {
    navigateWithTransition(roleConfig[activeRole].link)
  }

  return (
    <div className={`page-shell page-shell--login ${isMounted ? 'page-shell--visible' : ''} ${isTransitioning ? 'page-shell--exit' : ''}`}>
      {isTransitioning && (
        <div className="page-transition-overlay page-transition-overlay--success" aria-hidden="true">
          <div className="page-transition-orb" />
          <div className="page-transition-copy">
            <span>Accessing workspace</span>
            <strong>{transitionTarget ? (transitionTarget.includes('/dashboard') ? 'Dashboard' : transitionTarget.includes('/mentor') ? 'Mentor Console' : 'Workspace') : 'Workspace'}</strong>
          </div>
        </div>
      )}
      <aside className="hidden lg:flex flex-col justify-between p-10 text-white bg-linear-to-b from-stone-950 via-stone-900 to-amber-950">
        <div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image
                src="/InnovaSeed-Logo.png"
                alt="InnovaSeed Logo"
                width={40}
                height={40}
                className="rounded-xl object-cover shadow-sm border border-amber-500/30 bg-amber-500/10"
                priority
              />
              <div>
                <b>InnovaSeed <span className="text-[10px] border border-white/30 rounded px-1.5 py-0.5 ml-1">v2.0</span></b>
                <p className="text-xs text-slate-400">A Plego Indonesia Product</p>
              </div>
            </div>
            <span className="inline-block rounded-lg px-3 py-1 text-[11px] font-semibold border border-amber-500/50 text-amber-300">
              ● PLEGO 2026 QUALIFIER
            </span>
          </div>

          <span className="inline-block rounded-md px-3 py-1.5 text-[11px] font-semibold bg-white/10 border border-amber-500/40 text-amber-300 mt-14">
            <i className="fa-solid fa-circle-check mr-1.5"></i> Official National STEM Incubation Gateway
          </span>

          <h2 className="text-5xl font-extrabold leading-[1.08] mt-6">
            Empowering 12,000+ Young Innovators from Concept to Global Stages.
          </h2>
          <p className="text-slate-400 mt-6 max-w-140 text-sm">
            A synchronized research workflow engine supporting Student Researchers, University Mentors, and INASEF/ISEF Grand Evaluators with cryptographic rigor.
          </p>
        </div>

        <div>
          <p className="text-xs tracking-wider text-slate-400 mb-3">SYNCHRONIZED COHORT ECOSYSTEM</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <i className="fa-solid fa-flask text-amber-500"></i>
              <b className="block text-sm mt-2">Rapid Prototyping</b>
              <span className="text-slate-400 text-[11px]">Telemetry trials &amp; automated ISO lab notebooks.</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <i className="fa-solid fa-shield-halved text-amber-500"></i>
              <b className="block text-sm mt-2">Faculty Verification</b>
              <span className="text-slate-400 text-[11px]">Peer-review rubrics and ethical clearances.</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <i className="fa-solid fa-scale-balanced text-amber-500"></i>
              <b className="block text-sm mt-2">Blind Judging</b>
              <span className="text-slate-400 text-[11px]">Standardized multi-tier evaluation for qualifiers.</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-6 border-t border-white/10 pt-4">
            <span><i className="fa-solid fa-lock mr-1"></i> ISO 17025 Research Log</span>
            <span>256-bit Encrypted Session</span>
            <span>© 2026 Plego Indonesia</span>
          </div>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 sm:px-12 xl:px-16 py-10">
        <div className="w-full max-w-130 mx-auto">
          <div className="flex justify-between text-[11px] tracking-wider font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Image
                src="/InnovaSeed-Logo.png"
                alt="InnovaSeed Logo"
                width={40}
                height={40}
                className="rounded-xl object-cover shadow-sm border border-amber-500/30 bg-amber-500/10"
                priority
              />
              INSTITUTIONAL ACCESS HUB
            </span>
            <Link href="#" className="font-normal text-slate-500 tracking-normal hover:underline">Helpdesk &amp; FAQ</Link>
          </div>

          <h1 className="text-3xl font-bold mt-5">Welcome back to InnovaSeed</h1>
          <p className="text-slate-500 mt-2 text-sm">Select your research cohort or evaluation role to access your synchronized workspace.</p>

          <p className="text-xs font-semibold mt-6 mb-2">Select Account Authorization Role <span className="text-red-500">*</span></p>
          
          <div className="grid sm:grid-cols-2 gap-3">
            {roles.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => handleRoleSelect(r.key as 'student' | 'mentor')}
                className={`text-left rounded-xl border p-3 relative transition-all duration-200 cursor-pointer ${activeRole === r.key ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="w-7 h-7 rounded-md bg-amber-100 text-amber-600 grid place-items-center text-xs">
                  <i className={`fa-solid ${r.icon}`}></i>
                </span>
                {activeRole === r.key && (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold border border-amber-600 bg-amber-500 text-white rounded px-1.5 py-0.2 animate-pulse">Active</span>
                )}
                <b className="block text-xs mt-2">{r.title}</b>
                <span className="text-[11px] text-slate-500 leading-snug block mt-1">{r.desc}</span>
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mt-4">
              {errorMessage}
            </div>
          )}

          {/* School SSO and Google Workspace Providers */}
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={handleSchoolSSO}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-school text-amber-600"></i> Continue with School SSO (SIAKAD / School Portal)
            </button>
            <button
              type="button"
              onClick={handleGoogleSSO}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <i className="fa-brands fa-google text-amber-600"></i> Continue with Google Workspace for Education
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-4 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-4 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Or sign in with registered credentials</span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="flex justify-between">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institutional Email</label>
              <span className="text-[11px] text-amber-600 font-medium">✨ Auto-filled for Demo</span>
            </div>
            <div className="relative mb-4">
              <i className="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all duration-300 ${isAnimating ? 'bg-amber-100/50 scale-[1.01]' : ''}`}
                placeholder="name@innovaseed.sch.id"
              />
            </div>

            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Account Password</label>
              <Link href="#" className="text-xs font-semibold text-amber-700 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative mb-4">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all duration-300 ${isAnimating ? 'bg-amber-100/50 scale-[1.01]' : ''}`}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-xs mb-4">
              <i className="fa-solid fa-circle-info text-amber-600 mt-0.5"></i>
              <div>
                <b className="text-sm text-slate-800">Demo Mode Active ({roleConfig[activeRole].title})</b>
                <p className="text-slate-500 mt-0.5">Credentials auto-filled for instant testing. Click sign in to enter the {roleConfig[activeRole].workspace}.</p>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center mb-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                Remember this secure laboratory workstation for 30 days (ISO/IEC 17025 Compliant Audit Session)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {loading ? 'Entering Workspace...' : `Sign In to ${roleConfig[activeRole].workspace} →`}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">Don&apos;t have an InnovaSeed student team account yet?</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs font-semibold">
            <Link
              href="/register"
              onClick={(e) => {
                e.preventDefault()
                navigateWithTransition('/register')
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-all duration-300 hover:-translate-y-0.5"
            >
              + Register Innovation Team
            </Link>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            Protected by Plego Indonesia 256-bit ISO/IEC data protection layer.<br />
            <Link href="mailto:destiandhini62@gmail.com" className="underline text-sm text-slate-700 font-medium">Contact Accelerator Registrar</Link>
          </p>
        </div>
      </main> 
    </div>
  )
}