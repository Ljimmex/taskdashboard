import { createClient } from '@supabase/supabase-js'

// Supabase configuration for backend
export const createSupabaseClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        throw new Error('SUPABASE_URL is required')
    }

    // Use service role key for backend operations (bypasses RLS)
    if (supabaseServiceKey) {
        return createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })
    }

    // Fallback to anon key (respects RLS)
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseAnonKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required')
    }

    return createClient(supabaseUrl, supabaseAnonKey)
}

// Singleton instance
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export const getSupabase = () => {
    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient()
    }
    return supabaseInstance
}
