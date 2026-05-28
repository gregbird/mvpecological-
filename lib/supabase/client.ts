import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Single BrowserClient instance per browser session. Creating multiple
// instances causes concurrent refresh races under Supabase token rotation
// (only one refresh wins, others fail with refresh_token_not_found).
let browserClient: SupabaseClient<Database> | undefined

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
