"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { FactCategory, RoleContext } from "@/types/database";

export async function correctFact(formData: FormData) {
  const supabase = await userSupabase();
  const oldId = text(formData, "old_id");
  const body = text(formData, "body");
  const reason = text(formData, "reason");
  if (!oldId || !body || !reason) throw new Error("Correction body and reason are required");
  const old = await supabase.from("facts").select("category, role_context").eq("id", oldId).single();
  if (old.error) throw new Error(old.error.message);
  const created = await supabase.from("facts").insert({ body, category: (text(formData, "category") || old.data.category) as FactCategory, role_context: (text(formData, "role_context") || old.data.role_context) as RoleContext, status: "proposed", source: "manual" }).select("id").single();
  if (created.error) throw new Error(created.error.message);
  const correction = await supabase.from("fact_corrections").insert({ old_fact_id: oldId, new_fact_id: created.data.id, reason });
  if (correction.error) throw new Error(correction.error.message);
  const update = await supabase.from("facts").update({ status: "corrected" }).eq("id", oldId);
  if (update.error) throw new Error(update.error.message);
  refresh("/facts"); refresh("/inbox");
}
