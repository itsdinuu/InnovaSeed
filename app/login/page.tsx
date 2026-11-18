"use client"

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type TeamMemberProfile = {
  id: string
  name: string
  role: 'leader' | 'member'
  has_password: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<'student' | 'mentor'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // State untuk Modal Profil Tim
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [teamMembersList, setTeamMembersList] = useState<TeamMemberProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [modalError, setModalError] = useState('')
  const [authUserId, setAuthUserId] = useState('')

  const roleConfig = {
    student: {
      key: 'student',
      icon: 'fa-graduation-cap',
      title: 'Student Innovator',
      desc: 'Access the student dashboard and research workspace.',
      workspace: 'Student Dashboard',
      link: '/dashboard/student'
    },
    mentor: {
      key: 'mentor',
      icon: 'fa-user-tie',
      title: 'Faculty & Mentor',
      desc: 'Review teams, mentor feedback, and guidance workflows.',
      workspace: 'Mentor Dashboard',
      link: '/mentor'
    }
  } as const

  const roles = [roleConfig.student, roleConfig.mentor]

  const handleRoleSelect = (role: 'student' | 'mentor') => {
    setActiveRole(role)
    setEmail('')
    setPassword('')
    setErrorMessage('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const user = authData?.user
      if (!user) throw new Error('Authentication user session not found.')

      setAuthUserId(user.id)

      let resolvedRole: 'student' | 'mentor' = activeRole
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileError && profileData?.role) {
        const dbRole = profileData.role.toLowerCase()
        if (['student', 'mentor'].includes(dbRole)) {
          resolvedRole = dbRole as 'student' | 'mentor'
        }
      }

      const hasSkippedProfile = sessionStorage.getItem(`skip_profile_modal_${user.id}`)

      if (resolvedRole === 'student' && !hasSkippedProfile) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('lead_id', user.id)
          .maybeSingle()

        if (teamData) {
          const { data: members } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', teamData.id)

          if (members && members.length > 0) {
            setTeamMembersList(members)
            setShowProfileModal(true)
            setLoading(false)
            return
          }
        }
      }

      const selectedConfig = roleConfig[resolvedRole]
      router.replace(selectedConfig.link)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setErrorMessage(message)
      setLoading(false)
    }
  }

  const handleConfirmProfileSelection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfileId) {
      setModalError('Please select your team profile name.')
      return
    }

    setModalError('')
    const targetMember = teamMembersList.find(m => m.id === selectedProfileId)
    if (!targetMember) return

    sessionStorage.setItem(`active_profile_${authUserId}`, targetMember.id)
    sessionStorage.setItem(`active_member_name_${authUserId}`, targetMember.name)
    sessionStorage.setItem(`skip_profile_modal_${authUserId}`, 'true')

    router.replace('/dashboard/student')
  }

  const handleSkipProfileModal = () => {
    if (authUserId) {
      const defaultMember = teamMembersList[0]
      if (defaultMember) {
        sessionStorage.setItem(`active_profile_${authUserId}`, defaultMember.id)
        sessionStorage.setItem(`active_member_name_${authUserId}`, defaultMember.name)
      }
      sessionStorage.setItem(`skip_profile_modal_${authUserId}`, 'true')
    }
    setShowProfileModal(false)
    router.replace('/dashboard/student')
  }

  const handleGoogleSSO = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${roleConfig[activeRole].link}`
        }
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google SSO login failed.'
      setErrorMessage(message)
    }
  }

  const handleSchoolSSO = () => {
    alert('School SSO integration (SIAKAD / School Portal) is processing.')
  }

  return (
    <div className="font-sans text-slate-900 bg-[#fffdfa] min-h-screen flex items-center justify-center p-6">
      <main className="w-full max-w-lg bg-white rounded-3xl border border-[#ebdcd0] shadow-xl p-8 sm:p-10">
        
        {/* Header Logo & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-3">
            <Image
              src="/InnovaSeed-Logo.png"
              alt="InnovaSeed Logo"
              width={45}
              height={45}
              className="rounded-2xl object-cover shadow-md border border-amber-500/30 bg-amber-500/10"
              priority
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <b className="text-base font-extrabold text-slate-900">InnovaSeed</b>
                <span className="text-[10px] border border-amber-500/30 bg-amber-50 text-amber-700 rounded px-1.5 py-0.2 font-semibold">v2.0</span>
              </div>
              <p className="text-xs text-slate-500">A Plego Indonesia Product</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Welcome Back</h1>
          <p className="text-slate-500 text-xs mt-1">Select your role and sign in to access your workspace.</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {roles.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => handleRoleSelect(r.key as 'student' | 'mentor')}
              className={`text-left rounded-2xl border p-3.5 relative transition-all duration-300 ease-out cursor-pointer ${
                activeRole === r.key 
                  ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20 scale-[1.01]' 
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 grid place-items-center text-xs">
                  <i className={`fa-solid ${r.icon}`}></i>
                </span>
                {activeRole === r.key && (
                  <span className="text-[10px] font-bold border border-amber-600 bg-amber-500 text-white rounded-md px-2 py-0.5 animate-pulse">Active</span>
                )}
              </div>
              <b className="block text-xs font-bold text-slate-900">{r.title}</b>
              <span className="text-[11px] text-slate-500 leading-snug block mt-0.5 line-clamp-2">{r.desc}</span>
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mt-4">
            {errorMessage}
          </div>
        )}

        {/* SSO Options */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={handleSchoolSSO}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-school text-amber-600"></i> Continue with School SSO
          </button>
          <button
            type="button"
            onClick={handleGoogleSSO}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <i className="fa-brands fa-google text-amber-600"></i> Continue with Google Workspace
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-4 items-center">
          <div className="grow border-t border-slate-200"></div>
          <span className="shrink mx-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Or credentials</span>
          <div className="grow border-t border-slate-200"></div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Institutional Email</label>
            <div className="relative">
              <i className="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="name@innovaseed.sch.id"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Account Password</label>
              <Link href="#" className="text-xs font-semibold text-amber-700 hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
          </div>

          <div className="flex items-center text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              Remember this workstation for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-bold transition bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer shadow-md mt-1"
          >
            {loading ? 'Authenticating...' : `Sign In to ${roleConfig[activeRole].workspace} →`}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500">Don&apos;t have an innovation team account? </span>
          <Link href="/register" className="font-bold text-amber-700 hover:underline">Register Team</Link>
        </div>

      </main>

      {/* TEAM PROFILE SELECTION MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 grid place-items-center font-bold">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Select Active Team Profile</h3>
                  <p className="text-xs text-slate-500">Choose your name to enter the workspace.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleSkipProfileModal}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Skip →
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg">
                {modalError}
              </div>
            )}

            <form onSubmit={handleConfirmProfileSelection} className="space-y-4">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {teamMembersList.map((member) => (
                  <label
                    key={member.id}
                    onClick={() => setSelectedProfileId(member.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedProfileId === member.id
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="teamMemberProfile"
                        checked={selectedProfileId === member.id}
                        onChange={() => setSelectedProfileId(member.id)}
                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <b className="block text-sm text-slate-900">{member.name}</b>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                          {member.role === 'leader' ? 'Team Leader' : 'Team Member'}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSkipProfileModal}
                  className="w-1/3 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 transition shadow-md cursor-pointer"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}