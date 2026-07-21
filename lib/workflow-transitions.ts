import type { JobStatus, OutreachStatus } from "@/types/database";

const PIPELINE_NEXT: Partial<Record<JobStatus, readonly JobStatus[]>> = {
  interested: ["applied", "closed"], applied: ["interviewing", "rejected", "closed"],
  interviewing: ["offer", "rejected", "closed"], offer: ["closed"],
};
export function canMovePipeline(from: JobStatus, to: JobStatus) { return (PIPELINE_NEXT[from] ?? []).includes(to); }
export function canTriageJob(status: JobStatus) { return status === "new" || status === "interested"; }
export function canReviewFact(status: string) { return status === "proposed"; }
export function buildOutreachTouch(status: OutreachStatus, lastTouch: string, followUp?: string) {
  return { status, last_touch: lastTouch, ...(followUp ? { next_follow_up: followUp } : {}) };
}
