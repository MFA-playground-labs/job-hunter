import type { AtsType } from "@/types/database";

export interface NormalizedPosting {
  title: string;
  url: string;
  location: string | null;
  jd_text: string | null;
  source: AtsType;
}

export type AtsFetchResult =
  | { status: "ok"; postings: NormalizedPosting[] }
  | { status: "not_found" }
  | { status: "error"; message: string };
