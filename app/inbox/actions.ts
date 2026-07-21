"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { FactCategory, RoleContext } from "@/types/database";
import { canReviewFact } from "@/lib/workflow-transitions";

export async function reviewFact(formData: FormData) {
  const supabase = await userSupabase();
  const id = text(formData, "id");
  const action = text(formData, "action");
  if (!id) throw new Error("Fact id is required");
  if (!["verify", "edit_verify", "reject"].includes(action)) throw new Error("Invalid fact action");
  const current = await supabase.from("facts").select("status").eq("id", id).single();
  if (current.error || !canReviewFact(current.data.status)) throw new Error("This fact was already reviewed. Refresh and try again.");
  if (action === "verify" || action === "edit_verify") {
    const categories: FactCategory[] = ["scope","method","outcome","artifact","tradeoff","domain","gap","preference"];
    const contexts: RoleContext[] = ["ADP","EY-Parthenon","Accenture","cross-cutting"];
    const category=text(formData,"category"), context=text(formData,"role_context"), body=text(formData,"body");
    if(action==="edit_verify"&&(!body||!categories.includes(category as FactCategory)||!contexts.includes(context as RoleContext))) throw new Error("Fact edits are invalid");
    const update = action === "edit_verify" ? { body, category: category as FactCategory, role_context: context as RoleContext } : {};
    const { data, error } = await supabase.from("facts").update({ ...update, status: "verified", verified_at: new Date().toISOString() }).eq("id", id).eq("status", "proposed").select("id").maybeSingle();
    if (error) throw new Error(error.message); if (!data) throw new Error("This fact was already reviewed. Refresh and try again.");
  } else if (action === "reject") {
    const { data, error } = await supabase.from("facts").update({ status: "retired" }).eq("id", id).eq("status", "proposed").select("id").maybeSingle();
    if (error) throw new Error(error.message); if (!data) throw new Error("This fact was already reviewed. Refresh and try again.");
  }
  refresh("/inbox"); refresh("/facts"); refresh("/dashboard");
}
