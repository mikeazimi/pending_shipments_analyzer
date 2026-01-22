import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create a loosely typed client - types will be inferred from database schema
// when Supabase is properly configured
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
