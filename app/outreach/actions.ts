"use server";

import { refresh, text, userSupabase } from "@/lib/actions";
import type { OutreachChannel, OutreachStatus } from "@/types/database";

const CHANNELS: OutreachChannel[] = ["linkedin", "email", "intro", "other"];
const STATUSES: OutreachStatus[] = ["suggested", "drafted", "sent", "replied", "meeting", "dormant", "closed"];

function allowed<T extends string>(value: string, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback;
}

export async function saveOutreach(formData: FormData) {
  const supabase = await userSupabase();
  const id = text(formData, "id");
  const contact = text(formData, "contact");
  if (!contact) throw new Error("Contact is required");
  const channelValue = text(formData, "channel");
  const row = {
    contact,
    company_id: text(formData, "company_id") || null,
    channel: channelValue ? allowed(channelValue, CHANNELS, "other") : null,
    status: allowed(text(formData, "status"), STATUSES, "suggested"),
    next_follow_up: text(formData, "next_follow_up") || null,
    notes: text(formData, "notes") || null,
    last_touch: text(formData, "last_touch") || null,
  };
  const result = id ? await supabase.from("outreach").update(row).eq("id", id) : await supabase.from("outreach").insert(row);
  if (result.error) throw new Error(result.error.message);
  refresh("/outreach");
  refresh("/dashboard");
}

export async function updateOutreachStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !STATUSES.includes(status as OutreachStatus)) throw new Error("Invalid outreach update");
  const supabase = await userSupabase();
  const followUp = text(formData, "next_follow_up");
  const update: { status: OutreachStatus; last_touch: string; next_follow_up?: string } = {
    status: status as OutreachStatus,
    last_touch: text(formData, "last_touch") || new Date().toISOString().slice(0, 10),
  };
  if (followUp) update.next_follow_up = followUp;
  const result = await supabase.from("outreach").update(update).eq("id", id);
  if (result.error) throw new Error(result.error.message);
  refresh("/outreach");
  refresh("/dashboard");
}
