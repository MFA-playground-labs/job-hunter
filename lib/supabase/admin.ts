import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Server-only client for scheduled work. User-facing reads and mutations must
// continue to use the cookie client so RLS remains the authorization boundary.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
