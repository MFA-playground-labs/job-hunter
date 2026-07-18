"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/types/database";

export async function updateApplicationStage(applicationId: string, stage: Application["stage"]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // RLS scopes this update to the caller's own rows regardless of what
  // applicationId is passed in — an id belonging to someone else matches
  // zero rows rather than erroring.
  const { error } = await supabase.from("applications").update({ stage }).eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { error: null };
}
