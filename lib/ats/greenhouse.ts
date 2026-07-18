import type { AtsFetchResult, NormalizedPosting } from "@/lib/ats/types";

function stripHtml(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null;
}

export function parseGreenhouseBoard(payload: unknown): NormalizedPosting[] {
  const jobs = (payload as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs.flatMap((job) => {
    const value = job as Record<string, unknown>;
    const title = typeof value.title === "string" ? value.title.trim() : "";
    const url = typeof value.absolute_url === "string" ? value.absolute_url : "";
    if (!title || !url) return [];
    const location = value.location as { name?: unknown } | undefined;
    return [{ title, url, location: typeof location?.name === "string" ? location.name : null, jd_text: stripHtml(typeof value.content === "string" ? value.content : null), source: "greenhouse" }];
  });
}

export async function fetchGreenhouseBoard(slug: string): Promise<AtsFetchResult> {
  try {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`);
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "error", message: `Greenhouse returned ${response.status}` };
    return { status: "ok", postings: parseGreenhouseBoard(await response.json()) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Greenhouse request failed" };
  }
}
