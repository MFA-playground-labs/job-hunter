import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { PlaybookModule } from "@/types/database";

// The playbook corpus lives in the repo (synced from Marc's Obsidian vault)
// and is imported verbatim into the `playbooks` table. slug is the stable
// identity; content_hash makes reimport idempotent.

export const PLAYBOOK_DIR = path.join(process.cwd(), "Obsidian 2nd brain", "Interview prep MDs");

export interface PlaybookSource {
  slug: string;
  module: PlaybookModule;
  title: string;
  filename: string;
}

export const PLAYBOOK_SOURCES: PlaybookSource[] = [
  {
    slug: "tailoring-system",
    module: "tailoring",
    title: "Resume Tailoring — System Prompt",
    filename: "SYSTEM_PROMPT.md",
  },
  {
    slug: "resume-tailoring",
    module: "tailoring",
    title: "Resume Tailoring — Playbook",
    filename: "resume-tailoring 1.md",
  },
  {
    slug: "interviewer",
    module: "interviewer",
    title: "Interviewer Protocol",
    filename: "interviewer 1.md",
  },
  {
    slug: "resume-teardown",
    module: "teardown",
    title: "Resume Teardown",
    filename: "resume-teardown 1.md",
  },
  {
    slug: "fact-capture",
    module: "fact_capture",
    title: "Fact Capture",
    filename: "fact-capture.md",
  },
  {
    slug: "job-hunter",
    module: "job_hunter",
    title: "Job Hunter (Scanner Rules)",
    filename: "job-hunter.md",
  },
  {
    slug: "career-coach",
    module: "career_coach",
    title: "Career Coach",
    filename: "Career_coach.md_",
  },
  {
    slug: "linkedin-outreach",
    module: "outreach",
    title: "LinkedIn Outreach",
    filename: "Messenger_",
  },
];

export function contentHash(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

export interface LoadedPlaybook extends PlaybookSource {
  body: string;
  content_hash: string;
  source_path: string;
}

export function loadPlaybookFiles(): { loaded: LoadedPlaybook[]; missing: string[] } {
  const loaded: LoadedPlaybook[] = [];
  const missing: string[] = [];

  for (const source of PLAYBOOK_SOURCES) {
    const filePath = path.join(PLAYBOOK_DIR, source.filename);
    if (!fs.existsSync(filePath)) {
      missing.push(source.filename);
      continue;
    }
    const body = fs.readFileSync(filePath, "utf-8");
    loaded.push({
      ...source,
      body,
      content_hash: contentHash(body),
      source_path: path.relative(process.cwd(), filePath),
    });
  }

  return { loaded, missing };
}
