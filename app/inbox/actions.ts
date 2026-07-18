"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { FactCategory, RoleContext } from "@/types/database";

export async function reviewFact(formData: FormData) {
  const supabase = await userSupabase();
  const id = text(formData, "id");
  const action = text(formData, "action");
  if (!id) throw new Error("Fact id is required");
  if (action === "verify" || action === "edit_verify") {
    const update = action === "edit_verify" ? { body: text(formData, "body"), category: text(formData, "category") as FactCategory, role_context: text(formData, "role_context") as RoleContext } : {};
    const { error } = await supabase.from("facts").update({ ...update, status: "verified", verified_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  } else if (action === "reject") {
    const { error } = await supabase.from("facts").update({ status: "retired" }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  refresh("/inbox"); refresh("/facts"); refresh("/dashboard");
}
