import { describe, expect, it } from "vitest";
import { freshnessTier } from "@/lib/freshness";
import { getJobsDigestGroup, isPassReason, matchesJobFilters, parseJobFilters } from "@/lib/job-workflow";
import { groupOutreach } from "@/lib/workflow-view";
import { buildOutreachTouch, canMovePipeline, canReviewFact, canTriageJob } from "@/lib/workflow-transitions";

describe("job workflow", () => {
  it("only accepts allow-listed URL filters", () => {
    expect(parseJobFilters({ freshness: "hot", minScore: "70", status: "interested", company: "Acme" })).toMatchObject({ freshness: "hot", minScore: 70, status: "interested", company: "Acme" });
    expect(parseJobFilters({ freshness: "not-a-tier", minScore: "99", status: "anything" })).toMatchObject({ freshness: "all", minScore: 0, status: "all" });
  });

  it("keeps passed jobs in their own group regardless of scan age", () => {
    expect(getJobsDigestGroup("passed", "2026-01-01T00:00:00Z")).toBe("passed");
    expect(getJobsDigestGroup("new", "2026-01-01T00:00:00Z")).toBe("stale");
  });

  it("keeps a passed job's real freshness available for filtering", () => {
    const scannedAt = "2026-01-01T00:00:00Z";
    expect(getJobsDigestGroup("passed", scannedAt)).toBe("passed");
    expect(freshnessTier(scannedAt, new Date("2026-01-01T12:00:00Z"))).toBe("hot");
  });

  it("filters a digest entry across score and exact selectable values", () => {
    expect(matchesJobFilters({ company: "Acme", location: "Remote", status: "new", tier: "hot", score: { composite: 76 } }, { freshness: "hot", minScore: 70, company: "Acme", location: "Remote", status: "new" })).toBe(true);
    expect(matchesJobFilters({ company: "Acme", location: "Remote", status: "new", tier: "hot", score: { composite: 76 } }, { freshness: "all", minScore: 85, company: "", location: "", status: "all" })).toBe(false);
  });

  it("requires an allow-listed pass reason", () => {
    expect(isPassReason("location")).toBe(true);
    expect(isPassReason("because I said so")).toBe(false);
  });
});

describe("outreach workflow", () => {
  it("treats follow-ups due today as overdue without changing their status", () => {
    const entry = { status: "replied" as const, next_follow_up: "2026-07-20" };
    const grouped = groupOutreach([entry], "2026-07-20");
    expect(grouped.overdue).toEqual([entry]);
    expect(grouped.upcoming).toEqual([]);
  });
  it("preserves relationship status and only changes follow-up when supplied", () => {
    expect(buildOutreachTouch("replied", "2026-07-20")).toEqual({ status: "replied", last_touch: "2026-07-20" });
    expect(buildOutreachTouch("meeting", "2026-07-20", "2026-07-27")).toMatchObject({ status: "meeting", next_follow_up: "2026-07-27" });
  });
});

describe("mutation transition guards", () => {
  it("allows only forward pipeline transitions and triageable jobs", () => {
    expect(canMovePipeline("applied", "interviewing")).toBe(true);
    expect(canMovePipeline("interviewing", "interested")).toBe(false);
    expect(canTriageJob("new")).toBe(true);
    expect(canTriageJob("applied")).toBe(false);
  });
  it("reviews only proposed facts", () => {
    expect(canReviewFact("proposed")).toBe(true);
    expect(canReviewFact("verified")).toBe(false);
    expect(canReviewFact("retired")).toBe(false);
  });
});
