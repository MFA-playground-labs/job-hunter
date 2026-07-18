import { describe, expect, it } from "vitest";
import { parseGreenhouseBoard } from "@/lib/ats/greenhouse";
import { parseAshbyBoard } from "@/lib/ats/ashby";
import { parseLeverBoard } from "@/lib/ats/lever";
import { dedupePostingsByUrl, isRelevantTitle } from "@/lib/ats/filter";
import { extractVerifiedDate } from "@/lib/fact-import";
import { computeCostUsd } from "@/lib/llm";
import { rankFactsByKeywords } from "@/lib/retrieval";
import { parseFeed } from "@/lib/rss";
import { isStaleScan } from "@/lib/staleness";

describe("ATS parsers", () => {
  it("normalizes Greenhouse, Ashby, and Lever postings", () => {
    expect(parseGreenhouseBoard({ jobs: [{ title: "Product Manager", absolute_url: "https://example.com/gh", location: { name: "NYC" }, content: "<p>Build</p>" }] })[0]).toMatchObject({ source: "greenhouse", title: "Product Manager", location: "NYC" });
    expect(parseAshbyBoard({ jobs: [{ title: "Product Lead", jobUrl: "https://example.com/a", location: "Remote", descriptionHtml: "<p>Lead</p>" }] })[0]).toMatchObject({ source: "ashby", location: "Remote" });
    expect(parseLeverBoard([{ text: "Principal PM", hostedUrl: "https://example.com/l", categories: { location: "SF" } }])[0]).toMatchObject({ source: "lever", location: "SF" });
    expect(parseGreenhouseBoard({ error: "not found" })).toEqual([]);
  });
});

describe("scanner rules", () => {
  it("keeps only relevant product roles and dedupes URLs", () => {
    expect(isRelevantTitle("Director of Product")).toBe(true);
    expect(isRelevantTitle("Product Marketing Manager")).toBe(false);
    expect(isRelevantTitle("Project Manager")).toBe(false);
    expect(dedupePostingsByUrl([{ url: "a", value: 1 }, { url: "a", value: 2 }])).toEqual([{ url: "a", value: 2 }]);
  });
  it("marks scans older than fourteen days stale", () => {
    expect(isStaleScan("2026-01-01T00:00:00Z", new Date("2026-01-15T00:00:01Z"))).toBe(true);
    expect(isStaleScan("2026-01-01T00:00:00Z", new Date("2026-01-15T00:00:00Z"))).toBe(false);
  });
});

describe("facts, costs, and feeds", () => {
  it("extracts verification markers without fabricating dates", () => {
    expect(extractVerifiedDate("Won account [verified: 2026-02-01]")).toEqual({ body: "Won account", verifiedDate: "2026-02-01" });
    expect(extractVerifiedDate("No marker").verifiedDate).toBeNull();
  });
  it("ranks relevant facts and computes cached token costs", () => {
    const ranked = rankFactsByKeywords([{ body: "Led AI product strategy", verified_at: "2026-02-01" }, { body: "Built reporting", verified_at: "2026-03-01" }], "AI product", 2);
    expect(ranked[0].body).toContain("AI");
    expect(computeCostUsd("haiku", { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } as never)).toBe(1);
  });
  it("parses RSS and Atom-like entries", () => {
    const rss = "<rss><channel><item><title>Acme raises Series B</title><link>https://example.com/acme</link><pubDate>2026-01-01</pubDate></item></channel></rss>";
    expect(parseFeed(rss, "fixture")).toEqual([{ title: "Acme raises Series B", url: "https://example.com/acme", publishedAt: "2026-01-01", summary: null, source: "fixture" }]);
  });
});
