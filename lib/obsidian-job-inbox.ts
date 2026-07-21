// Pure parsing + import-decision logic for the Obsidian job inbox.
//
// Cowork writes one Markdown note per posting into the vault; CareerOS imports
// those notes into `jobs`. This module is deliberately side-effect free (no fs,
// no DB) so the truth-boundary rules are unit-testable in isolation. The runner
// that reads files and writes Supabase lives in scripts/import-job-inbox.ts.
//
// Contract: docs/obsidian-job-inbox-contract.md.
import { contentHash } from "@/lib/playbooks";

export interface NormalizedInboxJob {
  posting_id: string;
  url: string;
  source: string; // discovery sub-source from the note (greenhouse, linkedin, cowork-web, …)
  company: string;
  role: string;
  location: string | null;
  comp_range: string | null;
  comp_is_estimate: boolean;
  first_seen_at: string | null;
  last_seen_at: string | null;
  content_hash: string;
  jd_text: string; // the note body, verbatim — the raw source snapshot
}

export type NormalizeResult =
  | { ok: true; job: NormalizedInboxJob }
  | { ok: false; reason: "not_managed" | "missing_url" | "missing_required"; detail: string };

interface ParsedNote {
  frontmatter: Record<string, string | boolean>;
  body: string;
}

// Minimal YAML-frontmatter reader for the managed block. Values are scalar
// strings/booleans (the contract uses no arrays); everything after the first
// colon is the value, so `url: https://…` parses correctly.
export function parseFrontmatter(raw: string): ParsedNote {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const [, fmBlock, body] = match;
  const frontmatter: Record<string, string | boolean> = {};
  for (const line of fmBlock.split("\n")) {
    const lineMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!lineMatch) continue;
    const [, key, rawValue] = lineMatch;
    const value = rawValue.trim().replace(/^"(.*)"$/, "$1");
    if (value === "true") frontmatter[key] = true;
    else if (value === "false") frontmatter[key] = false;
    else frontmatter[key] = value;
  }
  return { frontmatter, body: body.trim() };
}

function str(fm: Record<string, string | boolean>, key: string): string | null {
  const v = fm[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

// A short, stable id derived from the canonical URL, used only when cowork
// omits an explicit posting_id. Deterministic so re-imports collapse to one row.
function derivePostingId(source: string, url: string): string {
  return `${source}:${contentHash(url).slice(0, 16)}`;
}

// Comp may be a real listed range or an inferred estimate. Cowork signals an
// estimate with an "est:" prefix (contract) so we never present a guess as fact.
function normalizeComp(raw: string | null): { comp_range: string | null; comp_is_estimate: boolean } {
  if (!raw) return { comp_range: null, comp_is_estimate: true };
  const estimate = /^est[:\s]/i.test(raw);
  const comp_range = raw.replace(/^est[:\s]+/i, "").trim();
  return { comp_range: comp_range || null, comp_is_estimate: estimate };
}

/**
 * Normalize one job note into an importable job, or reject it with a reason.
 * Rejections are quarantined by the runner, never imported (DEC-005′).
 */
export function normalizeJobNote(raw: string): NormalizeResult {
  const { frontmatter, body } = parseFrontmatter(raw);

  if (frontmatter.careeros_managed !== true) {
    return { ok: false, reason: "not_managed", detail: "missing `careeros_managed: true` frontmatter" };
  }

  const url = str(frontmatter, "url");
  // The hard truth boundary: a finding with no resolvable URL cannot become a job.
  if (!url || !/^https?:\/\/\S+$/i.test(url)) {
    return { ok: false, reason: "missing_url", detail: `no resolvable url (got ${JSON.stringify(frontmatter.url ?? null)})` };
  }

  const company = str(frontmatter, "company");
  const role = str(frontmatter, "role");
  if (!company || !role) {
    return {
      ok: false,
      reason: "missing_required",
      detail: `missing ${!company ? "company" : "role"}`,
    };
  }

  const source = str(frontmatter, "source") ?? "cowork";
  const posting_id = str(frontmatter, "posting_id") ?? derivePostingId(source, url);
  const { comp_range, comp_is_estimate } = normalizeComp(str(frontmatter, "comp"));

  return {
    ok: true,
    job: {
      posting_id,
      url,
      source,
      company,
      role,
      location: str(frontmatter, "location"),
      comp_range,
      comp_is_estimate,
      first_seen_at: str(frontmatter, "first_seen"),
      last_seen_at: str(frontmatter, "last_seen"),
      // Recompute canonically from the body rather than trusting the note's
      // declared hash — the body is the evidence, so it defines identity.
      content_hash: contentHash(body),
      jd_text: body,
    },
  };
}

export type ImportAction =
  | { type: "insert" }
  | { type: "update" } // content changed: refresh snapshot and re-flag for scoring
  | { type: "touch" }; // unchanged: only bump last_seen_at, preserve everything else

/**
 * Decide what to do with a normalized job given the existing row (if any).
 * Idempotent: the same note re-imported with no body change never mutates
 * beyond touching last_seen_at.
 */
export function decideImport(
  existing: { content_hash: string | null } | null,
  job: NormalizedInboxJob,
): ImportAction {
  if (!existing) return { type: "insert" };
  if (existing.content_hash !== job.content_hash) return { type: "update" };
  return { type: "touch" };
}
