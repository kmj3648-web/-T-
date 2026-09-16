import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vercel 환경 변수에 유효하지 않은 기본값이 덮어씌워지는 현상 방지
const supabaseUrl = (envUrl && envUrl.startsWith('https://')) 
  ? envUrl 
  : 'https://cmpthlnnnpnkeyhkqvmm.supabase.co'

const supabaseAnonKey = (envKey && envKey.startsWith('eyJ')) 
  ? envKey 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcHRobG5ubnBua2V5aGtxdm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTgxNTksImV4cCI6MjA5MTk5NDE1OX0.lqnrT_o9avrWNZJlc42wn0oOaAD2oyJkkg1VbTEGoXY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
