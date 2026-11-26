import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const fallbackSupabaseUrl = 'https://placeholder.supabase.co'
const fallbackSupabaseAnonKey = 'placeholder-anon-key'

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    'Supabase env vars are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Login will not work.'
  )
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : fallbackSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey! : fallbackSupabaseAnonKey,
  {
    auth: {
      // Keep the login session in localStorage so it survives page refreshes
      persistSession: true,
      // Renew the access token automatically before it expires
      autoRefreshToken: true,
      // Needed for password-reset / magic links that return with a token in the URL
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    }
  }
)

export { isSupabaseConfigured }