import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Fact, FactCategory } from "@/types/database";

// Single call site for RAG over the facts corpus. Embeddings are deferred
// (lib/embeddings.ts), so retrieval is keyword-overlap + recency over verified
// facts. When an embedding provider is enabled, swap the ranking here for a
// pgvector match RPC — callers don't change.

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "in",
  "is", "it", "of", "on", "or", "our", "that", "the", "to", "we", "will",
  "with", "you", "your",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function rankFactsByKeywords<T extends { body: string; verified_at: string | null }>(
  facts: T[],
  query: string,
  limit: number,
): T[] {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0) return facts.slice(0, limit);

  const scored = facts.map((fact) => {
    const factTerms = tokenize(fact.body);
    let overlap = 0;
    for (const term of factTerms) {
      if (queryTerms.has(term)) overlap += 1;
    }
    return { fact, score: factTerms.length > 0 ? overlap / Math.sqrt(factTerms.length) : 0 };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break on verification recency.
      return (b.fact.verified_at ?? "").localeCompare(a.fact.verified_at ?? "");
    })
    .slice(0, limit)
    .map((s) => s.fact);
}

export interface RetrieveFactsOptions {
  query: string;
  limit?: number;
  categories?: FactCategory[];
  /** Gaps are first-class: they prevent stretching non-existent experience.
   * Included by default regardless of keyword rank. */
  includeGaps?: boolean;
}

export async function retrieveFacts(
  supabase: SupabaseClient<Database>,
  options: RetrieveFactsOptions,
): Promise<{ facts: Fact[]; gaps: Fact[] }> {
  const limit = options.limit ?? 25;

  let query = supabase.from("facts").select("*").eq("status", "verified");
  if (options.categories && options.categories.length > 0) {
    query = query.in("category", options.categories);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Fact retrieval failed: ${error.message}`);

  const all = data ?? [];
  const gaps = options.includeGaps === false ? [] : all.filter((f) => f.category === "gap");
  const nonGaps = all.filter((f) => f.category !== "gap");

  return { facts: rankFactsByKeywords(nonGaps, options.query, limit), gaps };
}

export function formatFactsBlock(facts: Fact[]): string {
  if (facts.length === 0) return "(no verified facts in the corpus yet)";
  return facts
    .map((f) => `[${f.category}/${f.role_context}] ${f.body}`)
    .join("\n");
}
