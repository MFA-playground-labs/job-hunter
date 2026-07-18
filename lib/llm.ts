import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ModelCostEntry, SessionType } from "@/types/database";

// Model routing per the CareerOS spec (§7): cheapest model that clears the
// quality bar for each task. Aliases resolve to the latest snapshot server-side.
export const MODELS = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-5",
  opus: "claude-opus-4-8",
} as const;

export type ModelTier = keyof typeof MODELS;

// USD per million tokens (standard rates as of 2026-06; Sonnet 5 has an intro
// discount through 2026-08-31 — we log at standard rates so spend is never
// understated). Cache reads bill at ~0.1x input, cache writes at 1.25x.
const PRICES: Record<ModelTier, { input: number; output: number }> = {
  haiku: { input: 1, output: 5 },
  sonnet: { input: 3, output: 15 },
  opus: { input: 5, output: 25 },
};

export type LLMTask =
  | "fact_extraction"
  | "jd_parse"
  | "job_scoring"
  | "funding_extraction"
  | "funded_company_fit"
  | "tailoring"
  | "interviewer"
  | "coach"
  | "coach_offer_decision"
  | "teardown"
  | "edit_mining"
  | "digest_summary"
  | "outcome_synthesis";

// The routing table from the spec. Callers pass a task; the tier is looked up
// here so routing decisions live in one place.
export const TASK_ROUTING: Record<LLMTask, ModelTier> = {
  fact_extraction: "haiku",
  jd_parse: "haiku",
  job_scoring: "haiku",
  funding_extraction: "haiku",
  funded_company_fit: "sonnet",
  tailoring: "sonnet",
  interviewer: "sonnet",
  coach: "sonnet",
  coach_offer_decision: "opus",
  teardown: "opus",
  edit_mining: "haiku",
  digest_summary: "haiku",
  outcome_synthesis: "sonnet",
};

function createAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function isAnthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function computeCostUsd(tier: ModelTier, usage: Anthropic.Usage): number {
  const price = PRICES[tier];
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  return (
    (usage.input_tokens * price.input +
      cacheRead * price.input * 0.1 +
      cacheWrite * price.input * 1.25 +
      usage.output_tokens * price.output) /
    1_000_000
  );
}

export interface RunLLMOptions {
  task: LLMTask;
  /** Stable system prompt (playbook text). Cached via cache_control — keep it
   * byte-identical across calls; put anything volatile in `messages`. */
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  /** JSON schema for structured output (output_config.format). Objects must
   * set additionalProperties: false. When provided, `parsed` is populated. */
  jsonSchema?: Record<string, unknown>;
  /** Override the routing table (rare — e.g. coach escalating to opus). */
  tier?: ModelTier;
}

export interface RunLLMResult {
  text: string;
  parsed: unknown | null;
  model: string;
  cost: ModelCostEntry;
}

export async function runLLM(options: RunLLMOptions): Promise<RunLLMResult> {
  const tier = options.tier ?? TASK_ROUTING[options.task];
  const model = MODELS[tier];
  const client = createAnthropicClient();

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    system: [
      {
        type: "text",
        text: options.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: options.messages,
    ...(options.jsonSchema
      ? {
          output_config: {
            format: {
              type: "json_schema" as const,
              schema: options.jsonSchema,
            },
          },
        }
      : {}),
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  let parsed: unknown | null = null;
  if (options.jsonSchema && response.stop_reason !== "refusal") {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null; // caller decides how to handle unparseable output
    }
  }

  return {
    text,
    parsed,
    model: response.model,
    cost: {
      model: response.model,
      task: options.task,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_tokens: response.usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: response.usage.cache_creation_input_tokens ?? 0,
      cost_usd: computeCostUsd(tier, response.usage),
      at: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Cost logging: every LLM run belongs to a session row; sessions.model_costs
// is the single source for the monthly spend widget.

type Db = SupabaseClient<Database>;

export async function createSession(supabase: Db, type: SessionType, summary?: string, ownerId?: string) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ type, summary: summary ?? null, ...(ownerId ? { owner_id: ownerId } : {}) })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data.id;
}

export async function appendSessionCosts(
  supabase: Db,
  sessionId: string,
  entries: ModelCostEntry[],
) {
  if (entries.length === 0) return;
  const { data, error } = await supabase
    .from("sessions")
    .select("model_costs")
    .eq("id", sessionId)
    .single();
  if (error) throw new Error(`Failed to read session costs: ${error.message}`);

  const existing = Array.isArray(data.model_costs) ? data.model_costs : [];
  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      model_costs: [...existing, ...entries] as unknown as Database["public"]["Tables"]["sessions"]["Row"]["model_costs"],
    })
    .eq("id", sessionId);
  if (updateError) throw new Error(`Failed to log costs: ${updateError.message}`);
}
