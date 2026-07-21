import type { JobStatus, OutreachStatus } from "@/types/database";
import { freshnessTier } from "@/lib/freshness";

export const PIPELINE_STAGES: JobStatus[] = ["interested", "applied", "interviewing", "offer"];

export function groupPipeline<T extends { status: JobStatus }>(jobs: T[]) {
  return Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, jobs.filter((job) => job.status === stage)]),
  ) as Record<(typeof PIPELINE_STAGES)[number], T[]>;
}

export function nextPipelineAction(status: JobStatus) {
  return ({
    interested: "Prepare application",
    applied: "Plan follow-up",
    interviewing: "Prepare for next round",
    offer: "Review offer",
  } as Partial<Record<JobStatus, string>>)[status] ?? "Review status";
}

export function groupOutreach<T extends { status: OutreachStatus; next_follow_up: string | null }>(
  entries: T[],
  today: string,
) {
  const active = entries.filter((entry) => !["dormant", "closed"].includes(entry.status));
  return {
    overdue: active.filter((entry) => entry.next_follow_up && entry.next_follow_up <= today),
    upcoming: active.filter((entry) => !entry.next_follow_up || entry.next_follow_up > today),
    dormant: entries.filter((entry) => ["dormant", "closed"].includes(entry.status)),
  };
}

export function buildDashboardSummary<T extends { status: JobStatus; scanned_at: string | null; updated_at: string }>(jobs: T[]) {
  const counts = jobs.reduce<Partial<Record<JobStatus, number>>>((result, job) => {
    result[job.status] = (result[job.status] ?? 0) + 1;
    return result;
  }, {});
  const hotUntriaged = jobs.filter((job) => job.status === "new" && freshnessTier(job.scanned_at) === "hot").length;
  const hoursToAct = jobs
    .filter((job) => ["interested", "applied"].includes(job.status) && job.scanned_at)
    .map((job) => (new Date(job.updated_at).getTime() - new Date(job.scanned_at!).getTime()) / 3_600_000)
    .filter((hours) => hours >= 0)
    .sort((a, b) => a - b);
  return {
    counts,
    hotUntriaged,
    medianHoursToAct: hoursToAct.length ? hoursToAct[Math.floor(hoursToAct.length / 2)] : null,
  };
}
