"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import type { AtsType, CompanyTier } from "@/types/database";
const ATS: AtsType[] = ["greenhouse", "ashby", "lever", "workday", "custom"];
const TIERS: CompanyTier[] = ["target_1", "target_2", "broad", "watch"];
export async function saveCompany(formData: FormData) {
  const supabase = await userSupabase(); const id = text(formData, "id"); const name = text(formData, "name"); const ats = text(formData, "ats_type"); const tier = text(formData, "tier") || "watch";
  if (!name) throw new Error("Company name is required"); if (ats && !ATS.includes(ats as AtsType)) throw new Error("Invalid ATS type"); if (!TIERS.includes(tier as CompanyTier)) throw new Error("Invalid company tier");
  const row = { name, ats_type: (ats || null) as AtsType | null, ats_slug: text(formData, "ats_slug") || null, tier: tier as CompanyTier, notes: text(formData, "notes") || null };
  const result = id ? await supabase.from("companies").update(row).eq("id", id) : await supabase.from("companies").insert(row); if (result.error) throw new Error(result.error.message); refresh("/companies");
}
export async function setCompanyTier(formData: FormData) { const tier = text(formData, "tier"); const id = text(formData, "id"); if (!id || !TIERS.includes(tier as CompanyTier)) throw new Error("Invalid company update"); const supabase = await userSupabase(); const result = await supabase.from("companies").update({ tier: tier as CompanyTier }).eq("id", id); if (result.error) throw new Error(result.error.message); refresh("/companies"); }
