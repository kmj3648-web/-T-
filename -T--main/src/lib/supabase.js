import { createClient } from '@supabase/supabase-js'

// Vercel deployment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmpthlnnnpnkeyhkqvmm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_secret_S6FcCCKwQhU15yU9eEq14Q__mM7zJOv'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
