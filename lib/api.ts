import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

// Shared guard for authenticated API routes: Supabase configured + a logged-in
// user (RLS then scopes every query to that user). Returns the client or a
// ready-to-return error response.
export async function requireUser() {
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Supabase is not configured (.env.local)" },
        { status: 503 },
      ),
      supabase: null,
      user: null,
    } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      supabase: null,
      user: null,
    } as const;
  }

  return { error: null, supabase, user } as const;
}

// Guard for Vercel Cron routes: they authenticate with CRON_SECRET instead of
// cookies ("Authorization: Bearer <CRON_SECRET>").
export function requireCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireUserOrCron(request: Request) {
  const cronError = requireCronSecret(request);
  if (!cronError) return { error: null, supabase: null, user: null, cron: true } as const;
  const userResult = await requireUser();
  if (!userResult.error) return { ...userResult, cron: false } as const;
  return { error: cronError, supabase: null, user: null, cron: false } as const;
}
