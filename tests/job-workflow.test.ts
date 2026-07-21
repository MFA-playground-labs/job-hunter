import { describe, expect, it } from "vitest";
import { getJobsDigestGroup, isPassReason, matchesJobFilters, parseJobFilters } from "@/lib/job-workflow";

describe("job workflow", () => {
  it("only accepts allow-listed URL filters", () => {
    expect(parseJobFilters({ freshness: "hot", minScore: "70", status: "interested", company: "Acme" })).toMatchObject({ freshness: "hot", minScore: 70, status: "interested", company: "Acme" });
    expect(parseJobFilters({ freshness: "not-a-tier", minScore: "99", status: "anything" })).toMatchObject({ freshness: "all", minScore: 0, status: "all" });
  });

  it("keeps passed jobs in their own group regardless of scan age", () => {
    expect(getJobsDigestGroup("passed", "2026-01-01T00:00:00Z")).toBe("passed");
    expect(getJobsDigestGroup("new", "2026-01-01T00:00:00Z")).toBe("stale");
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
