"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

type LoginMethod = "email" | "phone"

const ADMIN_EMAILS = ["admininnovaseed@gmail.com", "plego@gmail.com"]

const ROLE_CONFIG = {
  student: {
    key: "student",
    icon: "fa-graduation-cap",
    title: "Student Innovator",
    desc: "Access your individual self-paced workspace, team code hub, and research tools.",
    workspace: "Student Dashboard",
    link: "/dashboard/student",
  },
  mentor: {
    key: "mentor",
    icon: "fa-user-tie",
    title: "PLEGO Mentor",
    desc: "Review mentored students/teams, share feedback, and manage guidance codes.",
    workspace: "Mentor Dashboard",
    link: "/mentor",
  },
} as const

function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[^\d+]/g, "").trim()
  if (!cleaned) return ""
  if (cleaned.startsWith("+")) return cleaned
  if (cleaned.startsWith("0")) return `+62${cleaned.slice(1)}`
  if (cleaned.startsWith("62")) return `+${cleaned}`
  return `+62${cleaned}`
}

export default function LoginPage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<"student" | "mentor">("student")
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email")

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotIdentifier, setForgotIdentifier] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [forgotSuccess, setForgotSuccess] = useState("")

  const roles = [ROLE_CONFIG.student, ROLE_CONFIG.mentor]

  const resolveEmailByPhone = async (rawPhone: string): Promise<string> => {
    const normalizedPhone = normalizePhoneNumber(rawPhone)
    if (!normalizedPhone) {
      throw new Error("Please enter a valid phone number.")
    }

    const candidates = Array.from(
      new Set([
        normalizedPhone,
        normalizedPhone.replace(/^\+/, ""),
        normalizedPhone.startsWith("+62") ? `0${normalizedPhone.slice(3)}` : normalizedPhone,
      ])
    ).filter(Boolean)

    const { data: matchedProfile, error: lookupError } = await supabase
      .from("profiles")
      .select("email")
      .in("phone", candidates)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      throw new Error(`Phone lookup failed: ${lookupError.message}`)
    }

    if (!matchedProfile?.email) {
      throw new Error(
        "No account found with this phone number. Please register or sign in with your email address."
      )
    }

    return matchedProfile.email.trim().toLowerCase()
  }

  const handleRoleSelect = (role: "student" | "mentor") => {
    setActiveRole(role)
    setErrorMessage("")
  }

  const handleMethodSwitch = (method: LoginMethod) => {
    setLoginMethod(method)
    setErrorMessage("")
  }

  const openForgotModal = () => {
    setForgotIdentifier(loginMethod === "email" ? email : phone)
    setForgotError("")
    setForgotSuccess("")
    setShowForgotModal(true)
  }

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError("")
    setForgotSuccess("")

    try {
      const raw = forgotIdentifier.trim()
      if (!raw) {
        throw new Error("Please enter your registered email address or phone number.")
      }

      const targetEmail = raw.includes("@")
        ? raw.toLowerCase()
        : await resolveEmailByPhone(raw)

      const redirectUrl = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        targetEmail,
        { redirectTo: redirectUrl }
      )

      if (resetError) throw resetError

      setForgotSuccess(
        `Password reset link sent to ${targetEmail}. Please check your inbox or spam folder.`
      )
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send password reset email. Please try again."
      setForgotError(message)
    } finally {
      setForgotLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("")

    try {
      const resolvedEmail =
        loginMethod === "phone"
          ? await resolveEmailByPhone(phone)
          : email.trim().toLowerCase()

      if (!resolvedEmail) {
        throw new Error("Please enter a valid email address.")
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        })

      if (authError) throw authError

      const user = authData?.user
      if (!user) throw new Error("Authentication user session not found.")

      let profileData: { role?: string | null } | null = null

      const { data: byId, error: byIdError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (byIdError) {
        console.warn("Profile role lookup warning:", byIdError.message)
      }
      profileData = byId

      if (!profileData?.role && user.email) {
        const { data: byEmail } = await supabase
          .from("profiles")
          .select("role")
          .ilike("email", user.email)
          .maybeSingle()
        if (byEmail) profileData = byEmail
      }

      const dbRole = String(
        profileData?.role ||
          user.user_metadata?.role ||
          user.app_metadata?.role ||
          ""
      )
        .trim()
        .toLowerCase()

      const emailLower = String(user.email || resolvedEmail || "")
        .trim()
        .toLowerCase()

      const isAdminAccount =
        dbRole === "admin" ||
        ADMIN_EMAILS.includes(emailLower) ||
        emailLower.startsWith("admin")

      if (isAdminAccount) {
        router.replace("/admin")
        return
      }

      const resolvedRole: "student" | "mentor" =
        dbRole === "mentor" || dbRole === "student" ? dbRole : activeRole

      router.replace(ROLE_CONFIG[resolvedRole].link)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      setErrorMessage(message)
      setLoading(false)
    }
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
                <span className="text-[10px] border border-amber-500/30 bg-amber-50 text-amber-700 rounded px-1.5 py-0.5 font-semibold">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500">A Plego Indonesia Product</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">Welcome Back</h1>
          <p className="text-slate-500 text-xs mt-1">
            Sign in with your individual account using email or phone number.
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {roles.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => handleRoleSelect(r.key)}
              className={`text-left rounded-2xl border p-3.5 relative transition-all duration-300 ease-out cursor-pointer ${
                activeRole === r.key
                  ? "border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20 scale-[1.01]"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 grid place-items-center text-xs">
                  <i className={`fa-solid ${r.icon}`}></i>
                </span>
                {activeRole === r.key && (
                  <span className="text-[10px] font-bold border border-amber-600 bg-amber-500 text-white rounded-md px-2 py-0.5 animate-pulse">
                    Active
                  </span>
                )}
              </div>
              <b className="block text-xs font-bold text-slate-900">{r.title}</b>
              <span className="text-[11px] text-slate-500 leading-snug block mt-0.5 line-clamp-2">
                {r.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Sign-In Identifier Switcher: Email vs Phone Number */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200 mt-5">
          <button
            type="button"
            onClick={() => handleMethodSwitch("email")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMethod === "email"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <i className="fa-regular fa-envelope text-amber-600"></i>
            <span>Email Address</span>
          </button>
          <button
            type="button"
            onClick={() => handleMethodSwitch("phone")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMethod === "phone"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <i className="fa-solid fa-phone text-amber-600"></i>
            <span>Phone Number</span>
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mt-4">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 mt-5">
          {loginMethod === "email" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
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
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <i className="fa-solid fa-phone absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="+6281234567890 or 081234567890"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Format supports international numbers (e.g., +62812...) or local numbers starting with 0.
              </p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Account Password
              </label>
              <button
                type="button"
                onClick={openForgotModal}
                className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
              <input
                type={showPassword ? "text" : "password"}
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
                <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
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
            {loading
              ? "Authenticating..."
              : `Sign In to ${ROLE_CONFIG[activeRole].workspace} →`}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500">Don&apos;t have an innovator account? </span>
          <Link href="/register" className="font-bold text-amber-700 hover:underline">
            Create Account
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

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ebdcd0] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 grid place-items-center font-bold">
                  <i className="fa-solid fa-key"></i>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Reset Account Password</h3>
                  <p className="text-xs text-slate-500">
                    We will send a password recovery link to your registered email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                aria-label="Close modal"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {forgotError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl">
                {forgotSuccess}
              </div>
            )}

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registered Email or Phone Number
                </label>
                <div className="relative">
                  <i className="fa-regular fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-3 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    placeholder="name@innovaseed.sch.id or 081234567890"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-1/3 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-2/3 py-2.5 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 disabled:opacity-50 transition shadow-md cursor-pointer"
                >
                  {forgotLoading ? "Sending Link..." : "Send Reset Link →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}