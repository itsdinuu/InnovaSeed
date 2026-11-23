"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [ready, setReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let active = true

    const initRecoverySession = async () => {
      try {
        const hash = window.location.hash.replace(/^#/, '')
        const params = new URLSearchParams(hash)

        const hashError = params.get('error_description') || params.get('error')
        if (hashError) {
          if (active) {
            setErrorMessage(decodeURIComponent(hashError.replace(/\+/g, ' ')))
            setCheckingSession(false)
          }
          return
        }

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            if (active) {
              setErrorMessage(sessionError.message)
              setCheckingSession(false)
            }
            return
          }

          window.history.replaceState(null, '', window.location.pathname)
          if (active) {
            setReady(true)
            setCheckingSession(false)
          }
          return
        }

        const { data } = await supabase.auth.getSession()
        if (active) {
          setReady(Boolean(data.session))
          setCheckingSession(false)
        }
      } catch (err: unknown) {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Unable to verify recovery link.'
          )
          setCheckingSession(false)
        }
      }
    }

    initRecoverySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true)
        setCheckingSession(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (newPassword.length < 10) {
      setErrorMessage('Password must be at least 10 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setSuccessMessage('Password updated successfully! Redirecting to sign in...')
      await supabase.auth.signOut()

      setTimeout(() => {
        router.replace('/login')
      }, 1500)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update password. Please request a new reset link.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-sans text-slate-900 bg-[#fffdfa] min-h-screen flex items-center justify-center p-6 relative z-10">
      <main className="w-full max-w-md bg-white rounded-3xl border border-[#ebdcd0] shadow-xl p-8 sm:p-10">
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
            Set New Password
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Create a strong password (minimum 10 characters) for your InnovaSeed account.
          </p>
        </div>

        {checkingSession && (
          <div className="bg-slate-50 border border-slate-200 text-slate-600 text-xs p-3 rounded-xl mt-4 text-center">
            Verifying recovery session...
          </div>
        )}

        {!checkingSession && !ready && !errorMessage && !successMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl mt-4">
            No active recovery session found. Please request a new reset link from the sign-in page.
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mt-4">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl mt-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-3 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
              Confirm New Password
            </label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || checkingSession}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-bold transition bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? 'Updating Password...' : 'Update Password →'}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs">
          <Link href="/login" className="font-bold text-amber-700 hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </main>
    </div>
  )
}