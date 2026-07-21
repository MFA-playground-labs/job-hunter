import { freshnessTier, type FreshnessTier } from "@/lib/freshness";
import type { JobStatus, PassReason } from "@/types/database";

export const PASS_REASONS = [
  "comp_too_low",
  "brand_mismatch",
  "wrong_scope",
  "location",
  "domain",
  "other",
] as const satisfies readonly PassReason[];

export const PASS_REASON_LABELS: Record<PassReason, string> = {
  comp_too_low: "Compensation is too low",
  brand_mismatch: "Company or brand mismatch",
  wrong_scope: "Role scope is not right",
  location: "Location does not work",
  domain: "Domain is not a fit",
  other: "Other reason",
};

export const JOB_STATUSES = [
  "new",
  "interested",
  "passed",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "closed",
] as const satisfies readonly JobStatus[];

export type JobFilterStatus = "all" | JobStatus;
export type JobFilters = {
  freshness: "all" | FreshnessTier;
  minScore: 0 | 50 | 70 | 85;
  company: string;
  location: string;
  status: JobFilterStatus;
};

export const DEFAULT_JOB_FILTERS: JobFilters = {
  freshness: "all",
  minScore: 0,
  company: "",
  location: "",
  status: "all",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

function safeFilterText(value: string) {
  return value.length <= 80 ? value : "";
}

export function parseJobFilters(params: SearchParams): JobFilters {
  const freshness = first(params, "freshness");
  const status = first(params, "status");
  const score = Number(first(params, "minScore"));

  return {
    freshness: freshness === "hot" || freshness === "warm" || freshness === "cooling" || freshness === "stale" ? freshness : "all",
    minScore: score === 50 || score === 70 || score === 85 ? score : 0,
    company: safeFilterText(first(params, "company")),
    location: safeFilterText(first(params, "location")),
    status: status === "all" || JOB_STATUSES.includes(status as JobStatus) ? status as JobFilterStatus : "all",
  };
}

export type JobsDigestEntry<TJob, TScore extends { composite: number; created_at: string }> = {
  job: TJob;
  score: TScore | undefined;
  tier: FreshnessTier;
  group: JobsDigestGroup;
};

export type JobsDigestGroup = "hot" | "warm" | "cooling" | "passed" | "stale";

export function latestScore<T extends { created_at: string }>(scores: T[]) {
  return [...scores].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function getJobsDigestGroup(status: JobStatus, scannedAt: string | null): JobsDigestGroup {
  if (status === "passed") return "passed";
  return freshnessTier(scannedAt);
}

export function matchesJobFilters(
  entry: { company: string; location: string | null; status: JobStatus; tier: FreshnessTier; score?: { composite: number } },
  filters: JobFilters,
) {
  return (
    (filters.freshness === "all" || entry.tier === filters.freshness) &&
    (filters.status === "all" || entry.status === filters.status) &&
    (entry.score?.composite ?? 0) >= filters.minScore &&
    (!filters.company || entry.company === filters.company) &&
    (!filters.location || entry.location === filters.location)
  );
}

export function isPassReason(value: string): value is PassReason {
  return PASS_REASONS.includes(value as PassReason);
}

export function isJobStatus(value: string): value is JobStatus {
  return JOB_STATUSES.includes(value as JobStatus);
}

export function isSafeRecordId(value: string) {
  // Supabase IDs are UUIDs in production; accepting a UUID only prevents an
  // action endpoint from becoming a generic update primitive.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
