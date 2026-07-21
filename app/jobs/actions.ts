"use server";
import { refresh, text, userSupabase } from "@/lib/actions";
import { isPassReason, isSafeRecordId } from "@/lib/job-workflow";
import type { PassReason } from "@/types/database";
import { canTriageJob } from "@/lib/workflow-transitions";

export type JobActionState = {
  ok: boolean;
  message: string;
  fieldErrors: Partial<Record<"id" | "status" | "pass_reason" | "pass_note", string>>;
};

const FAILURE = (message: string, fieldErrors: JobActionState["fieldErrors"] = {}): JobActionState => ({ ok: false, message, fieldErrors });

export async function updateJob(_: JobActionState, formData: FormData): Promise<JobActionState> {
  const id = text(formData, "id");
  const status = text(formData, "status");
  const passReason = text(formData, "pass_reason");
  const passNote = text(formData, "pass_note");

  if (!isSafeRecordId(id)) return FAILURE("This job reference is invalid.", { id: "Invalid job reference." });
  if (status !== "interested" && status !== "passed") return FAILURE("This job action is not allowed.", { status: "Choose a valid job action." });
  if (status === "passed" && !isPassReason(passReason)) return FAILURE("Choose a reason before passing this job.", { pass_reason: "Choose one of the listed reasons." });
  if (passNote.length > 1000) return FAILURE("Your pass note is too long.", { pass_note: "Use 1,000 characters or fewer." });

  try {
    const supabase = await userSupabase();
    const existing = await supabase.from("jobs").select("status").eq("id", id).single();
    if (existing.error || !canTriageJob(existing.data.status)) {
      return FAILURE("This job has already moved into the pipeline and cannot be triaged here.");
    }
    const update = status === "passed"
      ? { status: "passed" as const, pass_reason: passReason as PassReason, pass_note: passNote || null }
      : { status: "interested" as const };
    const result = await supabase.from("jobs").update(update).eq("id", id).eq("status", existing.data.status).select("id").maybeSingle();
    if (result.error || !result.data) return FAILURE("This job changed elsewhere. Refresh and try again.");
    refresh("/jobs");
    refresh(`/jobs/${id}`);
    refresh("/pipeline");
    refresh("/dashboard");
    return { ok: true, message: status === "passed" ? "Job passed." : "Marked as interested.", fieldErrors: {} };
  } catch {
    return FAILURE("We couldn't save that change. Please try again.");
  }
}
export async function createOutreachFromCompany(formData: FormData) { const supabase = await userSupabase(); const result = await supabase.from("outreach").insert({ company_id: text(formData, "company_id"), contact: "Hiring team", status: "suggested", notes: "Target company, no open PM roles." }); if (result.error) throw new Error(result.error.message); refresh("/outreach"); }
