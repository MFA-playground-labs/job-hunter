// Seed CareerOS from the master resume (SEED-001). The resume is the initial
// verified-fact corpus (DEC-007): each experience bullet becomes a verified fact
// with the resume as its evidence, so scoring and tailoring work immediately —
// without waiting on the (now deferred) fact-capture interview.
//
// Idempotent: skips the master resume if one exists and skips facts whose body
// already exists. Local-only. Run with: npm run seed:resume
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { createAdminClient } from "../lib/supabase/admin";
import { getSingleOwnerId } from "../lib/owner";
import type { FactCategory, RoleContext } from "../types/database";

const RESUME_PATH = path.join(process.cwd(), "docs", "marc-resume.md");
const TODAY = new Date().toISOString().slice(0, 10);

interface SeedFact {
  role_context: RoleContext;
  category: FactCategory;
  body: string;
}

// Parse experience bullets into atomic facts. Deterministic and conservative:
// only "- " bullets under a recognized role in Professional Experience become
// facts, so nothing is invented — every fact traces to a resume line.
function parseResumeFacts(content: string): SeedFact[] {
  const facts: SeedFact[] = [];
  let inExperience = false;
  let role: RoleContext | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      inExperience = /professional experience/i.test(line);
      role = null;
      continue;
    }
    if (line.startsWith("### ")) {
      if (/\bADP\b/i.test(line)) role = "ADP";
      else if (/EY-?Parthenon/i.test(line)) role = "EY-Parthenon";
      else if (/Accenture/i.test(line)) role = "Accenture";
      else role = null;
      continue;
    }
    if (inExperience && role && /^-\s+/.test(line)) {
      const body = line.replace(/^-\s+/, "").trim();
      if (body.length < 12) continue;
      // Quantified bullets are outcomes; the rest describe scope of ownership.
      const category: FactCategory = /[\d$%]/.test(body) ? "outcome" : "scope";
      facts.push({ role_context: role, category, body });
    }
  }
  return facts;
}

// Honest gap candidates raised during scoring/review. Seeded as PROPOSED (not
// verified) gaps so Marc confirms or corrects them in the Inbox — gaps are
// first-class and keep tailoring from stretching non-existent experience.
const GAP_CANDIDATES: SeedFact[] = [
  {
    role_context: "cross-cutting",
    category: "gap",
    body: "No direct headcount people-management: reports at Accenture were matrixed/project-based and cross-functional, not a managed org.",
  },
  {
    role_context: "cross-cutting",
    category: "gap",
    body: "No shipped customer-facing AI/ML product surface — AI work has been PM-tooling-native (RAG for discovery, codebase analysis), not a product ML feature.",
  },
];

async function main() {
  if (!fs.existsSync(RESUME_PATH)) throw new Error(`Master resume not found at ${RESUME_PATH}`);
  const body = fs.readFileSync(RESUME_PATH, "utf-8");

  const supabase = createAdminClient();
  const ownerId = await getSingleOwnerId(supabase);

  // 1. Master resume — insert only if none exists (exactly-one-master invariant).
  const existingMaster = await supabase
    .from("resumes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("master", true)
    .maybeSingle();
  if (existingMaster.error) throw new Error(`Failed to check master resume: ${existingMaster.error.message}`);

  if (existingMaster.data) {
    console.log("Master resume already exists — leaving it untouched.");
  } else {
    const insert = await supabase.from("resumes").insert({
      owner_id: ownerId,
      master: true,
      label: "Master resume",
      body,
      created_by: "user",
    });
    if (insert.error) throw new Error(`Failed to insert master resume: ${insert.error.message}`);
    console.log("Inserted master resume.");
  }

  // 2. Seed facts — verified from the resume, proposed for gap candidates.
  const existingFacts = await supabase.from("facts").select("body").eq("owner_id", ownerId);
  if (existingFacts.error) throw new Error(`Failed to load existing facts: ${existingFacts.error.message}`);
  const seen = new Set((existingFacts.data ?? []).map((f) => f.body.trim()));

  const resumeFacts = parseResumeFacts(body);
  let verified = 0;
  let proposedGaps = 0;
  let skipped = 0;

  for (const fact of resumeFacts) {
    if (seen.has(fact.body)) {
      skipped += 1;
      continue;
    }
    const insert = await supabase.from("facts").insert({
      owner_id: ownerId,
      role_context: fact.role_context,
      category: fact.category,
      body: fact.body,
      status: "verified",
      source: "resume",
      verified_at: new Date(TODAY).toISOString(),
    });
    if (insert.error) {
      console.log(`  Skipped a fact (${insert.error.message}): ${fact.body.slice(0, 60)}…`);
      continue;
    }
    seen.add(fact.body);
    verified += 1;
  }

  for (const gap of GAP_CANDIDATES) {
    if (seen.has(gap.body)) {
      skipped += 1;
      continue;
    }
    const insert = await supabase.from("facts").insert({
      owner_id: ownerId,
      role_context: gap.role_context,
      category: gap.category,
      body: gap.body,
      status: "proposed",
      source: "seed",
    });
    if (insert.error) {
      console.log(`  Skipped a gap (${insert.error.message}): ${gap.body.slice(0, 60)}…`);
      continue;
    }
    seen.add(gap.body);
    proposedGaps += 1;
  }

  console.log(
    `Facts: ${verified} verified from resume, ${proposedGaps} proposed gap(s) for Inbox review, ${skipped} already present.`,
  );
  if (proposedGaps > 0) console.log("  Review the proposed gaps at /inbox before they inform tailoring.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
