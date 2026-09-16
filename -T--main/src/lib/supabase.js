import { createClient } from '@supabase/supabase-js'

// Vercel deployment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmpthlnnnpnkeyhkqvmm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcHRobG5ubnBua2V5aGtxdm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTgxNTksImV4cCI6MjA5MTk5NDE1OX0.lqnrT_o9avrWNZJlc42wn0oOaAD2oyJkkg1VbTEGoXY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
