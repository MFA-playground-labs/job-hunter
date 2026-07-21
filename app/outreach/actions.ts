"use server";

import { refresh, text, userSupabase } from "@/lib/actions";
import type { OutreachChannel, OutreachStatus } from "@/types/database";
import { buildOutreachTouch } from "@/lib/workflow-transitions";

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
  const statusValue = text(formData, "status") || "suggested";
  if (channelValue && !CHANNELS.includes(channelValue as OutreachChannel)) throw new Error("Invalid outreach channel");
  if (!STATUSES.includes(statusValue as OutreachStatus)) throw new Error("Invalid outreach status");
  const row = {
    contact,
    company_id: text(formData, "company_id") || null,
    channel: channelValue ? allowed(channelValue, CHANNELS, "other") : null,
    status: statusValue as OutreachStatus,
    next_follow_up: text(formData, "next_follow_up") || null,
    notes: text(formData, "notes") || null,
    last_touch: text(formData, "last_touch") || null,
  };
  const result = id ? await supabase.from("outreach").update(row).eq("id", id) : await supabase.from("outreach").insert(row);
  if (result.error) throw new Error(result.error.message);
  refresh("/outreach");
  refresh("/dashboard");
}

export type OutreachActionState={ok:boolean;message:string};
export async function updateOutreachStatus(_:OutreachActionState,formData: FormData):Promise<OutreachActionState> {
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !STATUSES.includes(status as OutreachStatus)) return {ok:false,message:"Invalid outreach update."};
  try { const supabase = await userSupabase();
  const followUp = text(formData, "next_follow_up");
  const update = buildOutreachTouch(status as OutreachStatus, text(formData, "last_touch") || new Date().toISOString().slice(0, 10), followUp);
  const result = await supabase.from("outreach").update(update).eq("id", id);
  if (result.error) return {ok:false,message:"The outreach update could not be saved."};
  refresh("/outreach");
  refresh("/dashboard");
  return {ok:true,message:"Outreach updated."}; } catch { return {ok:false,message:"The outreach update could not be saved."}; }
}
