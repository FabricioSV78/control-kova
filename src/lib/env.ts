const normalize = (value: string | undefined) => value?.trim() ?? ''

export const env = {
  supabaseUrl: normalize(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: normalize(import.meta.env.VITE_SUPABASE_ANON_KEY),
  demoModeEnabled: normalize(import.meta.env.VITE_ENABLE_DEMO_MODE) === 'true',
}

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey)
