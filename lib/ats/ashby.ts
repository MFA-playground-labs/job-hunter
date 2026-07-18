import type { AtsFetchResult, NormalizedPosting } from "@/lib/ats/types";

function stripHtml(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null;
}

export function parseAshbyBoard(payload: unknown): NormalizedPosting[] {
  const jobs = (payload as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs.flatMap((job) => {
    const value = job as Record<string, unknown>;
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const url = typeof value.jobUrl === "string" ? value.jobUrl : typeof value.url === "string" ? value.url : "";
    if (!title || !url) return [];
    const location = value.location as { name?: unknown } | string | undefined;
    return [{ title, url, location: typeof location === "string" ? location : typeof location?.name === "string" ? location.name : null, jd_text: stripHtml(typeof value.descriptionHtml === "string" ? value.descriptionHtml : typeof value.description === "string" ? value.description : null), source: "ashby" }];
  });
}

export async function fetchAshbyBoard(slug: string): Promise<AtsFetchResult> {
  try {
    const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`);
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "error", message: `Ashby returned ${response.status}` };
    return { status: "ok", postings: parseAshbyBoard(await response.json()) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Ashby request failed" };
  }
}
