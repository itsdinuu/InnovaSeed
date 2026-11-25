"use client"

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[^\d+]/g, '').trim()
  if (!cleaned) return ''
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0')) return `+62${cleaned.slice(1)}`
  if (cleaned.startsWith('62')) return `+${cleaned}`
  return `+62${cleaned}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    institution: '',
    researchField: 'Biotechnology & Health',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showCustomToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.')
      return
    }

    const normalizedEmail = formData.email.trim().toLowerCase()
    const normalizedPhone = normalizePhoneNumber(formData.phone)
    const cleanFullName = formData.fullName.trim()
    const cleanInstitution = formData.institution.trim()

    if (formData.phone.trim() && !normalizedPhone) {
      setErrorMessage('Please enter a valid phone number.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: cleanFullName,
            email: normalizedEmail,
            phone: normalizedPhone || null,
            institution: cleanInstitution,
            research_field: formData.researchField,
            role: 'student',
          },
        },
      })

      if (authError) throw authError

      const userId = authData.user?.id

      if (userId) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: cleanFullName,
          email: normalizedEmail,
          phone: normalizedPhone || null,
          role: 'student',
          institution: cleanInstitution,
        })

        if (profileError) {
          console.warn('Profiles table warning:', profileError.message)
        }
      }

      showCustomToast('Individual innovator account created! Please sign in.')
      router.push('/login')
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred while registering with Supabase.'
      if (
        message.includes('already registered') ||
        message.includes('already been registered')
      ) {
        setErrorMessage('This email is already registered. Please sign in instead.')
      } else {
        setErrorMessage(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-sans text-slate-900 bg-[#fffdfa] min-h-screen flex items-center justify-center p-6">
      <main className="w-full max-w-xl bg-white rounded-3xl border border-[#ebdcd0] shadow-xl p-8 sm:p-10">
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
                <span className="text-[10px] border border-amber-500/30 bg-amber-50 text-amber-700 rounded px-1.5 py-0.2 font-semibold">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500">A Plego Indonesia Product</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
            Create Innovator Account
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Start in self-paced mode with your individual account. You can create or join a team
            using an invite code anytime inside your workspace.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mt-4">
            {errorMessage}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4 mt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <i className="fa-regular fa-user absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="student@innovaseed.sch.id"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <i className="fa-solid fa-phone absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="+62812.. or 0812.."
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Optional for quick contact or team coordination.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                School / Institution
              </label>
              <div className="relative">
                <i className="fa-solid fa-school absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="e.g., Plego Universe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Research Field
              </label>
              <select
                value={formData.researchField}
                onChange={(e) => setFormData({ ...formData, researchField: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              >
                <option>Biotechnology &amp; Health</option>
                <option>Environmental Engineering</option>
                <option>Materials Science</option>
                <option>Computer Science &amp; IoT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Min. 10 characters"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Repeat password"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 mt-4 text-xs">
            <i className="fa-solid fa-circle-info text-amber-600 mt-0.5"></i>
            <div>
              <b className="font-semibold text-slate-800">Self-paced first, optional team &amp; mentor</b>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                You can explore and build independently right away. Create or join a team via invite
                code later, and unlock paid PLEGO mentor guidance whenever you enroll in a mentor
                package.
              </p>
            </div>
          </div>

          <label className="flex gap-2 items-center text-xs text-slate-600 mt-4 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              required
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
            <span>
              I agree to the{' '}
              <Link href="#" className="font-semibold underline text-slate-900">
                Terms of Use
              </Link>{' '}
              and{' '}
              <Link href="#" className="font-semibold underline text-slate-900">
                Data Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-bold transition bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 mt-4 cursor-pointer shadow-md"
          >
            {loading ? 'Creating Account...' : 'Create Innovator Account →'}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500">Already have an InnovaSeed account? </span>
          <Link href="/login" className="font-bold text-amber-700 hover:underline">
            Sign in
          </Link>
        </div>

        <div className="text-center mt-3 text-[11px] text-slate-500">
          <span>Need help? </span>
          <a
            href="https://wa.me/message/YBBHHD4MUJ4TJ1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
            >
            <span>Contact Admin</span>
          </a>
        </div>

      </main>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] border border-amber-500/40 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 grid place-items-center font-bold text-xs">
            ✓
          </div>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}