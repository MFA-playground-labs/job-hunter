import type { AtsFetchResult, NormalizedPosting } from "@/lib/ats/types";

function stripHtml(value: string | null | undefined) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null;
}

export function parseLeverBoard(payload: unknown): NormalizedPosting[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((job) => {
    const value = job as Record<string, unknown>;
    const title = typeof value.text === "string" ? value.text.trim() : "";
    const url = typeof value.hostedUrl === "string" ? value.hostedUrl : "";
    if (!title || !url) return [];
    const categories = value.categories as { location?: unknown } | undefined;
    const description = [value.descriptionPlain, value.description, value.additionalPlain, value.additional].filter((part): part is string => typeof part === "string").join("\n");
    return [{ title, url, location: typeof categories?.location === "string" ? categories.location : null, jd_text: stripHtml(description), source: "lever" }];
  });
}

export async function fetchLeverBoard(slug: string): Promise<AtsFetchResult> {
  try {
    const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "error", message: `Lever returned ${response.status}` };
    return { status: "ok", postings: parseLeverBoard(await response.json()) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Lever request failed" };
  }
}
