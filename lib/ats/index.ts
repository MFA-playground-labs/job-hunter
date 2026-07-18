import type { AtsFetchResult } from "@/lib/ats/types";
import { fetchAshbyBoard } from "@/lib/ats/ashby";
import { fetchGreenhouseBoard } from "@/lib/ats/greenhouse";
import { fetchLeverBoard } from "@/lib/ats/lever";
import type { AtsType } from "@/types/database";

export function fetchAtsBoard(type: AtsType, slug: string): Promise<AtsFetchResult> {
  if (type === "greenhouse") return fetchGreenhouseBoard(slug);
  if (type === "ashby") return fetchAshbyBoard(slug);
  return fetchLeverBoard(slug);
}
