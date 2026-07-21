// Import cowork's job findings from the Obsidian vault into Supabase.
// Local-only (the vault isn't part of the deployed bundle). Idempotent: the
// same note re-imported never creates a duplicate; a URL-less note is
// quarantined, never imported (DEC-005′). See docs/obsidian-job-inbox-contract.md.
//
//   OBSIDIAN_JOB_INBOX_DIR=".../Job Big Brain/Job findings" npm run import:jobs
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { createAdminClient } from "../lib/supabase/admin";
import { getSingleOwnerId } from "../lib/owner";
import { decideImport, normalizeJobNote } from "../lib/obsidian-job-inbox";

function resolveInboxDir(): string {
  const explicit = process.env.OBSIDIAN_JOB_INBOX_DIR;
  if (explicit) return explicit;
  // Fall back to the repo-local vault convention used by sync:obsidian.
  const fallback = path.join(process.cwd(), "Obsidian 2nd brain", "second-brain", "Job findings");
  if (fs.existsSync(fallback)) return fallback;
  throw new Error(
    "Set OBSIDIAN_JOB_INBOX_DIR to the vault's job-findings folder (e.g. the 'Job Big Brain/Job findings' path).",
  );
}

async function main() {
  const dir = resolveInboxDir();
  if (!fs.existsSync(dir)) throw new Error(`Job inbox directory not found: ${dir}`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => path.join(dir, f));
  if (files.length === 0) {
    console.log(`No job notes found in ${dir}`);
    return;
  }

  const supabase = createAdminClient();
  const ownerId = await getSingleOwnerId(supabase);
  const nowIso = new Date().toISOString();

  let inserted = 0;
  let updated = 0;
  let touched = 0;
  const quarantined: string[] = [];
  const failed: string[] = [];

  for (const filePath of files) {
    const rel = path.basename(filePath);
    const raw = fs.readFileSync(filePath, "utf-8");
    const result = normalizeJobNote(raw);
    if (!result.ok) {
      quarantined.push(`${rel}: ${result.reason} — ${result.detail}`);
      continue;
    }
    const job = result.job;

    // Match an existing row by stable posting_id first, then by URL (the
    // secondary uniqueness guard). Either match means "same opportunity".
    const existing = await supabase
      .from("jobs")
      .select("id, content_hash, first_seen_at")
      .eq("owner_id", ownerId)
      .or(`posting_id.eq.${job.posting_id},url.eq.${job.url}`)
      .maybeSingle();
    if (existing.error) {
      failed.push(`${rel}: ${existing.error.message}`);
      continue;
    }

    // Resolve company linkage by name; leave null if unmatched (P0 does not
    // auto-create companies — that stays an explicit curation step).
    const company = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", ownerId)
      .ilike("name", job.company)
      .maybeSingle();
    const companyId = company.data?.id ?? null;

    const action = decideImport(existing.data ?? null, job);

    if (action.type === "insert") {
      const insert = await supabase.from("jobs").insert({
        owner_id: ownerId,
        company_id: companyId,
        title: job.role,
        url: job.url,
        source: "cowork",
        location: job.location,
        comp_range: job.comp_range,
        comp_is_estimate: job.comp_is_estimate,
        jd_text: job.jd_text,
        posting_id: job.posting_id,
        content_hash: job.content_hash,
        first_seen_at: job.first_seen_at ?? nowIso,
        last_seen_at: job.last_seen_at ?? nowIso,
        scanned_at: nowIso,
        status: "new",
      });
      if (insert.error) failed.push(`${rel}: insert failed — ${insert.error.message}`);
      else inserted += 1;
    } else if (action.type === "update") {
      // Content changed: refresh the snapshot and re-flag for scoring, but never
      // clobber Marc's disposition (interested/passed/applied/…) or history.
      const update = await supabase
        .from("jobs")
        .update({
          jd_text: job.jd_text,
          content_hash: job.content_hash,
          location: job.location,
          comp_range: job.comp_range,
          comp_is_estimate: job.comp_is_estimate,
          last_seen_at: nowIso,
          scanned_at: nowIso,
        })
        .eq("id", existing.data!.id);
      if (update.error) failed.push(`${rel}: update failed — ${update.error.message}`);
      else updated += 1;
    } else {
      // Unchanged: only record that the posting is still live.
      const touch = await supabase
        .from("jobs")
        .update({ last_seen_at: nowIso })
        .eq("id", existing.data!.id);
      if (touch.error) failed.push(`${rel}: touch failed — ${touch.error.message}`);
      else touched += 1;
    }
  }

  console.log(
    `Job inbox: ${inserted} inserted, ${updated} updated, ${touched} unchanged (last_seen bumped).`,
  );
  if (quarantined.length) {
    console.log(`  Quarantined ${quarantined.length} note(s) — not imported (no resolvable URL / invalid):`);
    quarantined.forEach((q) => console.log(`    - ${q}`));
  }
  if (failed.length) {
    console.log(`  Failed ${failed.length} note(s):`);
    failed.forEach((f) => console.log(`    - ${f}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
