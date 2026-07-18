import type { FactCategory, RoleContext } from "@/types/database";

// Helpers for importing marc-facts.md into the facts table. Facts carrying a
// [verified: <date>] marker were already verified in Marc's existing system —
// they import as status='verified' with that date. Unmarked facts enter the
// normal proposal flow.

const VERIFIED_MARKER = /\[verified:\s*([^\]]+)\]/i;

export function extractVerifiedDate(text: string): { body: string; verifiedDate: string | null } {
  const match = text.match(VERIFIED_MARKER);
  if (!match) return { body: text.trim(), verifiedDate: null };

  const body = text.replace(VERIFIED_MARKER, "").replace(/\s{2,}/g, " ").trim();
  const raw = match[1].trim();

  // Prefer an explicit ISO date; otherwise let Date parse it ("May 2026").
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { body, verifiedDate: raw };
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return { body, verifiedDate: parsed.toISOString().slice(0, 10) };
  }
  return { body, verifiedDate: null };
}

export const ROLE_CONTEXTS: RoleContext[] = ["ADP", "EY-Parthenon", "Accenture", "cross-cutting"];
export const FACT_CATEGORIES: FactCategory[] = [
  "scope", "method", "outcome", "artifact", "tradeoff", "domain", "gap", "preference",
];

export interface ExtractedFact {
  role_context: RoleContext;
  category: FactCategory;
  body: string;
}

// Structured-output schema for the Haiku extraction pass. The model receives
// the raw markdown (verified markers left in place — they're parsed
// deterministically afterwards) and returns atomic facts.
export const FACT_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role_context: { type: "string", enum: ROLE_CONTEXTS },
          category: { type: "string", enum: FACT_CATEGORIES },
          body: {
            type: "string",
            description:
              "One atomic fact, verbatim from the source wherever possible. Preserve any [verified: date] marker exactly as written.",
          },
        },
        required: ["role_context", "category", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["facts"],
  additionalProperties: false,
} as const;

export function isExtractedFact(value: unknown): value is ExtractedFact {
  if (typeof value !== "object" || value === null) return false;
  const fact = value as Record<string, unknown>;
  return (
    typeof fact.body === "string" &&
    fact.body.trim().length > 0 &&
    ROLE_CONTEXTS.includes(fact.role_context as RoleContext) &&
    FACT_CATEGORIES.includes(fact.category as FactCategory)
  );
}

export const FACT_EXTRACTION_SYSTEM = `You extract atomic career facts from a markdown fact corpus.

Rules:
- One fact per entry: a single verifiable statement about scope, method, outcome, artifact, tradeoff, domain knowledge, gap, or preference.
- NEVER invent, embellish, or merge facts. Copy the source wording as closely as possible.
- Preserve any [verified: date] marker exactly as it appears in the source text, inside the fact body.
- Gaps (things Marc does NOT have — missing experience, missing domains) are facts too: category "gap".
- role_context is the employer the fact belongs to (ADP, EY-Parthenon, Accenture) or "cross-cutting" if it spans roles.
- Skip headings, commentary, and anything that is not a fact about Marc.`;
