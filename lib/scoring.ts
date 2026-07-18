import type { SupabaseClient } from "@supabase/supabase-js";
import { formatFactsBlock, retrieveFacts } from "@/lib/retrieval";
import { runLLM } from "@/lib/llm";
import type { Database, Fact } from "@/types/database";

const SCORE_SCHEMA = {
  type: "object", properties: {
    comp_fit: { type: "number" }, brand: { type: "number" }, exit_opportunity: { type: "number" },
    role_content_fit: { type: "number" }, composite: { type: "number" }, rationale: { type: "string" },
  }, required: ["comp_fit", "brand", "exit_opportunity", "role_content_fit", "composite", "rationale"], additionalProperties: false,
} as const;

export interface ScoreInput { title: string; company: string; location: string | null; jd_text: string | null; }
export interface ScoreOutput { comp_fit: number; brand: number; exit_opportunity: number; role_content_fit: number; composite: number; rationale: string; }

function validScore(value: unknown): value is ScoreOutput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["comp_fit", "brand", "exit_opportunity", "role_content_fit", "composite"].every((key) => typeof candidate[key] === "number" && candidate[key] >= 0 && candidate[key] <= 100) && typeof candidate.rationale === "string";
}

export async function scoreJob(supabase: SupabaseClient<Database>, job: ScoreInput, calibration: Database["public"]["Tables"]["calibrations"]["Row"]): Promise<{ score: ScoreOutput; model: string; cost: import("@/types/database").ModelCostEntry }> {
  const retrieved = await retrieveFacts(supabase, { query: `${job.title} ${job.company} ${job.jd_text ?? ""}`, limit: 25 });
  const playbook = await supabase.from("playbooks").select("body").eq("slug", "job-hunter").maybeSingle();
  const rubric = playbook.data?.body ?? "Score each dimension from 0 to 100 based only on the posting and verified facts. Explain uncertainty; never invent experience or compensation.";
  const result = await runLLM({
    task: "job_scoring",
    system: `${rubric}\n\nCalibration dials: ${JSON.stringify({ total_comp_floor: calibration.total_comp_floor, base_floor: calibration.base_floor, brand_weight: calibration.brand_weight, exit_weight: calibration.exit_weight })}\n\nVerified facts and gaps:\n${formatFactsBlock([...retrieved.facts, ...retrieved.gaps] as Fact[])}`,
    messages: [{ role: "user", content: `Score this posting on a 0-100 scale.\nCompany: ${job.company}\nTitle: ${job.title}\nLocation: ${job.location ?? "Unknown"}\nDescription:\n${job.jd_text ?? "No description supplied"}` }],
    jsonSchema: SCORE_SCHEMA,
  });
  if (!validScore(result.parsed)) throw new Error("Job scoring returned an invalid response");
  return { score: result.parsed, model: result.model, cost: result.cost };
}
