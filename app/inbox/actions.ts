"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { FactCategory, RoleContext } from "@/types/database";

export async function reviewFact(formData: FormData) {
  const supabase = await userSupabase();
  const id = text(formData, "id");
  const action = text(formData, "action");
  if (!id) throw new Error("Fact id is required");
  if (!["verify", "edit_verify", "reject"].includes(action)) throw new Error("Invalid fact action");
  if (action === "verify" || action === "edit_verify") {
    const categories: FactCategory[] = ["scope","method","outcome","artifact","tradeoff","domain","gap","preference"];
    const contexts: RoleContext[] = ["ADP","EY-Parthenon","Accenture","cross-cutting"];
    const category=text(formData,"category"), context=text(formData,"role_context"), body=text(formData,"body");
    if(action==="edit_verify"&&(!body||!categories.includes(category as FactCategory)||!contexts.includes(context as RoleContext))) throw new Error("Fact edits are invalid");
    const update = action === "edit_verify" ? { body, category: category as FactCategory, role_context: context as RoleContext } : {};
    const { error } = await supabase.from("facts").update({ ...update, status: "verified", verified_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  } else if (action === "reject") {
    const { error } = await supabase.from("facts").update({ status: "retired" }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  refresh("/inbox"); refresh("/facts"); refresh("/dashboard");
}
