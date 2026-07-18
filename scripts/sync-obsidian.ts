// Local sync between Marc's Obsidian vault (gitignored, only exists on his
// machine) and the deployed Supabase project. Never runs on Vercel — the
// vault isn't part of the deployed bundle. Run with `npm run sync:obsidian
// [in|out|both]`.
//
// Inbound:  second-brain/01-Facts/*.md -> obsidian_notes (staging, dedupe by
//           content_hash) -> facts (status set from `verified` frontmatter).
// Outbound: companies + jobs -> second-brain/02-Companies, 03-Roles stub
//           notes. Only a delimited managed block is written; the rest of
//           each note (Overview, Research notes, etc.) is Marc's freeform
//           research and is left untouched, per the vault templates.
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { createAdminClient } from "../lib/supabase/admin";
import { contentHash } from "../lib/playbooks";
import type {
  Database,
  FactCategory,
  RoleContext,
} from "../types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<Database>;

const VAULT_ROOT = path.join(process.cwd(), "Obsidian 2nd brain", "second-brain");
const FACTS_DIR = path.join(VAULT_ROOT, "01-Facts");
const COMPANIES_DIR = path.join(VAULT_ROOT, "02-Companies");
const ROLES_DIR = path.join(VAULT_ROOT, "03-Roles");

const FACT_CATEGORIES: FactCategory[] = [
  "scope", "method", "outcome", "artifact", "tradeoff", "domain", "gap", "preference",
];

const SYNC_START = "<!-- careeros:sync:start -->";
const SYNC_END = "<!-- careeros:sync:end -->";

// ---------------------------------------------------------------------------
// Shared helpers

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

interface ParsedNote {
  frontmatter: Record<string, string | boolean>;
  body: string;
}

function parseFrontmatter(raw: string): ParsedNote {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

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
  return { frontmatter, body };
}

// The fact text is the first paragraph under the `# Title` heading, before
// the "## Context / backup detail" section (per Templates/Fact.md). Notes
// may have callouts (e.g. "> [!example]") above the heading, so find the
// heading wherever it falls rather than anchoring to the start of body.
function extractFactBody(body: string): string {
  const headingMatch = body.match(/^#\s+.*$/m);
  const afterHeading = headingMatch
    ? body.slice((headingMatch.index ?? 0) + headingMatch[0].length)
    : body;
  const beforeContext = afterHeading.split(/\n##\s+Context/i)[0];
  return beforeContext.trim();
}

function mapSubjectRoleToRoleContext(subjectRole: string | undefined): {
  roleContext: RoleContext;
  defaulted: boolean;
} {
  const known: RoleContext[] = ["ADP", "EY-Parthenon", "Accenture"];
  if (subjectRole) {
    const hit = known.find((r) => subjectRole.toLowerCase().includes(r.toLowerCase()));
    if (hit) return { roleContext: hit, defaulted: false };
  }
  return { roleContext: "cross-cutting", defaulted: true };
}

async function getOwnerId(supabase: Db): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(`Failed to list Supabase users: ${error.message}`);
  if (data.users.length === 0) {
    throw new Error("No Supabase auth user found — create the single CareerOS user first.");
  }
  if (data.users.length > 1) {
    console.warn(`Warning: ${data.users.length} auth users found; using the first (${data.users[0].email}).`);
  }
  return data.users[0].id;
}

function readMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => path.join(dir, f));
}

// ---------------------------------------------------------------------------
// Inbound: 01-Facts/*.md -> obsidian_notes -> facts

async function syncIn(supabase: Db, ownerId: string) {
  const files = readMarkdownFiles(FACTS_DIR);
  if (files.length === 0) {
    console.log(`No fact notes found in ${FACTS_DIR}`);
    return;
  }

  let newProposed = 0;
  let newVerified = 0;
  let skippedUnchanged = 0;
  const failed: string[] = [];
  const defaultedRoleContext: string[] = [];

  for (const filePath of files) {
    const relPath = path.relative(VAULT_ROOT, filePath);
    const raw = fs.readFileSync(filePath, "utf-8");
    const hash = contentHash(raw);

    const existing = await supabase
      .from("obsidian_notes")
      .select("id, content_hash, processed")
      .eq("owner_id", ownerId)
      .eq("path", relPath)
      .maybeSingle();
    if (existing.error) {
      failed.push(`${relPath}: ${existing.error.message}`);
      continue;
    }
    if (existing.data && existing.data.content_hash === hash && existing.data.processed) {
      skippedUnchanged += 1;
      continue;
    }

    const { frontmatter, body } = parseFrontmatter(raw);
    const category = frontmatter.category as string | undefined;
    if (!category || !FACT_CATEGORIES.includes(category as FactCategory)) {
      failed.push(`${relPath}: missing/invalid "category" frontmatter (got ${JSON.stringify(category)})`);
      continue;
    }
    const factBody = extractFactBody(body);
    if (!factBody) {
      failed.push(`${relPath}: empty fact body`);
      continue;
    }

    const { roleContext, defaulted } = mapSubjectRoleToRoleContext(
      typeof frontmatter.subject_role === "string" ? frontmatter.subject_role : undefined,
    );
    if (defaulted) defaultedRoleContext.push(relPath);

    const verified = frontmatter.verified === true;
    const verifiedDate = typeof frontmatter.verified_date === "string" && frontmatter.verified_date
      ? frontmatter.verified_date
      : null;

    const upsert = await supabase
      .from("obsidian_notes")
      .upsert(
        {
          owner_id: ownerId,
          path: relPath,
          frontmatter: frontmatter as never,
          body,
          content_hash: hash,
          processed: false,
        },
        { onConflict: "owner_id,path" },
      )
      .select("id")
      .single();
    if (upsert.error) {
      failed.push(`${relPath}: ${upsert.error.message}`);
      continue;
    }

    const insert = await supabase.from("facts").insert({
      owner_id: ownerId,
      role_context: roleContext,
      category: category as FactCategory,
      body: factBody,
      status: verified ? "verified" : "proposed",
      source: "obsidian",
      verified_at: verified && verifiedDate ? new Date(verifiedDate).toISOString() : null,
    });
    if (insert.error) {
      failed.push(`${relPath}: fact insert failed — ${insert.error.message}`);
      continue;
    }

    await supabase.from("obsidian_notes").update({ processed: true }).eq("id", upsert.data.id);
    if (verified) newVerified += 1;
    else newProposed += 1;
  }

  console.log(`Inbound: ${newProposed} new proposed fact(s), ${newVerified} new verified fact(s), ${skippedUnchanged} unchanged/skipped.`);
  if (defaultedRoleContext.length) {
    console.log(`  Defaulted to role_context "cross-cutting" (subject_role didn't match ADP/EY-Parthenon/Accenture):`);
    defaultedRoleContext.forEach((p) => console.log(`    - ${p}`));
  }
  if (failed.length) {
    console.log(`  Failed to sync ${failed.length} note(s):`);
    failed.forEach((f) => console.log(`    - ${f}`));
  }
}

// ---------------------------------------------------------------------------
// Outbound: companies + jobs -> vault stub notes

function upsertManagedBlock(existingContent: string | null, block: string, fallbackFile: string): string {
  const rendered = `${SYNC_START}\n${block}\n${SYNC_END}`;
  if (existingContent === null) return fallbackFile.replace(SYNC_START + "\n" + SYNC_END, rendered);

  if (existingContent.includes(SYNC_START) && existingContent.includes(SYNC_END)) {
    const pattern = new RegExp(`${SYNC_START}[\\s\\S]*?${SYNC_END}`);
    return existingContent.replace(pattern, rendered);
  }
  // No markers yet in a hand-created note — insert right after the first heading.
  const headingMatch = existingContent.match(/^(#\s+.*\n)/);
  if (headingMatch) {
    return existingContent.replace(headingMatch[1], `${headingMatch[1]}\n${rendered}\n`);
  }
  return `${rendered}\n\n${existingContent}`;
}

function writeIfChanged(filePath: string, content: string, counts: { created: number; updated: number; unchanged: number }) {
  const exists = fs.existsSync(filePath);
  const previous = exists ? fs.readFileSync(filePath, "utf-8") : null;
  if (previous === content) {
    counts.unchanged += 1;
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  if (exists) counts.updated += 1;
  else counts.created += 1;
}

async function syncOutCompanies(supabase: Db, ownerId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", ownerId)
    .neq("tier", "watch")
    .order("name");
  if (error) throw new Error(`Failed to load companies: ${error.message}`);

  const counts = { created: 0, updated: 0, unchanged: 0 };
  for (const company of data ?? []) {
    const lines = [
      `- **Tier:** ${company.tier}`,
      `- **Funding stage:** ${company.funding_stage ?? "—"}${company.last_funding_at ? ` (${company.last_funding_at})` : ""}`,
      `- **Fit rationale:** ${company.fit_rationale ?? "—"}`,
      `- **ATS status:** ${company.ats_last_status ?? "—"}`,
    ];
    if (company.funding_source_url) lines.push(`- **Funding source:** ${company.funding_source_url}`);
    const block = lines.join("\n");

    const filePath = path.join(COMPANIES_DIR, `${sanitizeFilename(company.name)}.md`);
    const exists = fs.existsSync(filePath);
    const template = `---\ntype: company\ncreated: ${new Date().toISOString().slice(0, 10)}\ntags: [company]\n---\n\n# ${company.name}\n\n${SYNC_START}\n${SYNC_END}\n\n## Overview\n- **Sector / product:**\n- **Stage / funding:**\n- **Size:**\n- **Why I'm interested:**\n\n## Roles I'm tracking here\n\n\n## Research notes\n\n\n## Contacts here\n\n\n## Links\n-\n`;
    const base = exists ? fs.readFileSync(filePath, "utf-8") : template;
    const content = upsertManagedBlock(exists ? base : null, block, template);
    writeIfChanged(filePath, content, counts);
  }
  console.log(`Outbound companies: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged.`);
}

async function syncOutRoles(supabase: Db, ownerId: string) {
  const jobs = await supabase
    .from("jobs")
    .select("*")
    .eq("owner_id", ownerId)
    .neq("status", "new")
    .order("updated_at", { ascending: false });
  if (jobs.error) throw new Error(`Failed to load jobs: ${jobs.error.message}`);

  const companies = await supabase.from("companies").select("id, name").eq("owner_id", ownerId);
  if (companies.error) throw new Error(`Failed to load companies: ${companies.error.message}`);
  const companyNameById = new Map((companies.data ?? []).map((c) => [c.id, c.name]));

  const scores = await supabase
    .from("job_scores")
    .select("job_id, composite, rationale, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (scores.error) throw new Error(`Failed to load job_scores: ${scores.error.message}`);
  const latestScoreByJob = new Map<string, { composite: number; rationale: string }>();
  for (const score of scores.data ?? []) {
    if (!latestScoreByJob.has(score.job_id)) {
      latestScoreByJob.set(score.job_id, { composite: score.composite, rationale: score.rationale });
    }
  }

  const counts = { created: 0, updated: 0, unchanged: 0 };
  for (const job of jobs.data ?? []) {
    const companyName = job.company_id ? companyNameById.get(job.company_id) ?? "Unknown company" : "Unknown company";
    const lines = [
      `- **Status:** ${job.status}`,
      `- **Comp range:** ${job.comp_range ?? "—"}${job.comp_range && job.comp_is_estimate ? " (estimate)" : ""}`,
      `- **Posting:** ${job.url}`,
    ];
    const score = latestScoreByJob.get(job.id);
    if (score) lines.push(`- **Score:** ${score.composite} — ${score.rationale}`);
    const block = lines.join("\n");

    const filePath = path.join(ROLES_DIR, `${sanitizeFilename(companyName)} — ${sanitizeFilename(job.title)}.md`);
    const exists = fs.existsSync(filePath);
    const template = `---\ntype: role\ncompany: "[[${companyName}]]"\ncreated: ${new Date().toISOString().slice(0, 10)}\ntags: [role]\n---\n\n# ${companyName} — ${job.title}\n\n${SYNC_START}\n${SYNC_END}\n\n## Job description notes\n\n\n## Why this role\n\n\n## Facts I might use for this role\n\n\n## Interview prep\n\n\n## Open questions\n\n`;
    const base = exists ? fs.readFileSync(filePath, "utf-8") : template;
    const content = upsertManagedBlock(exists ? base : null, block, template);
    writeIfChanged(filePath, content, counts);
  }
  console.log(`Outbound roles: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged.`);
}

async function syncOut(supabase: Db, ownerId: string) {
  await syncOutCompanies(supabase, ownerId);
  await syncOutRoles(supabase, ownerId);
}

// ---------------------------------------------------------------------------

async function main() {
  const mode = (process.argv[2] ?? "both") as "in" | "out" | "both";
  if (!["in", "out", "both"].includes(mode)) {
    console.error(`Unknown mode "${mode}". Usage: npm run sync:obsidian [in|out|both]`);
    process.exit(1);
  }

  const supabase = createAdminClient();
  const ownerId = await getOwnerId(supabase);

  if (mode === "in" || mode === "both") await syncIn(supabase, ownerId);
  if (mode === "out" || mode === "both") await syncOut(supabase, ownerId);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
