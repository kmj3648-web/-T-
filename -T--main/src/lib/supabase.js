import { createClient } from '@supabase/supabase-js'

// Vercel deployment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmpthlnnnpnkeyhkqvmm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Gqkq7I__6P7YEy3fHT4yZg_DqJEkGOz'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
