import { NextResponse } from "next/server";
import { fetchAtsBoard } from "@/lib/ats";
import { dedupePostingsByUrl, isRelevantTitle } from "@/lib/ats/filter";
import { requireUserOrCron } from "@/lib/api";
import { appendSessionCosts, createSession } from "@/lib/llm";
import { scoreJob } from "@/lib/scoring";

export const maxDuration = 300;

export async function GET(request: Request) { return scan(request); }
export async function POST(request: Request) { return scan(request); }

async function scan(request: Request) {
  const auth = await requireUserOrCron(request);
  if (auth.error) return auth.error;
  const supabase = auth.supabase;
  if (!supabase) return NextResponse.json({ error: "Cron calls require a configured service session; use the authenticated UI for scans." }, { status: 503 });
  let calibrationId: string | null = null;
  if (request.method === "POST") { try { calibrationId = (await request.json()).calibration_id ?? null; } catch {} }
  let calibrationReused = false;
  if (!calibrationId && auth.cron) { const latest = await supabase.from("calibrations").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(); calibrationId = latest.data?.id ?? null; calibrationReused = Boolean(calibrationId); }
  if (!calibrationId) return NextResponse.json({ error: "Choose a calibration before scanning." }, { status: 400 });
  const calibration = await supabase.from("calibrations").select("*").eq("id", calibrationId).single();
  if (calibration.error) return NextResponse.json({ error: calibration.error.message }, { status: 400 });
  const sessionId = await createSession(supabase, "job_scan", JSON.stringify({ calibration_id: calibrationId, calibration_reused: calibrationReused }));
  const companies = await supabase.from("companies").select("*").not("ats_slug", "is", null).not("ats_type", "is", null);
  if (companies.error) return NextResponse.json({ error: companies.error.message }, { status: 500 });
  const costs = []; let added = 0; const zeroOpenings: string[] = [];
  for (const company of companies.data ?? []) {
    const result = await fetchAtsBoard(company.ats_type!, company.ats_slug!);
    await supabase.from("companies").update({ ats_last_status: result.status === "error" ? `error: ${result.message}` : result.status }).eq("id", company.id);
    if (result.status !== "ok") continue;
    const relevant = dedupePostingsByUrl(result.postings.filter((posting) => isRelevantTitle(posting.title)));
    if (!relevant.length) zeroOpenings.push(company.id);
    for (const posting of relevant) {
      const insert = await supabase.from("jobs").upsert({ company_id: company.id, title: posting.title, url: posting.url, location: posting.location, jd_text: posting.jd_text, source: posting.source, scanned_at: new Date().toISOString(), status: "new" }, { onConflict: "owner_id,url", ignoreDuplicates: true }).select("id").maybeSingle();
      if (insert.error) continue;
      if (!insert.data) continue;
      added += 1;
      try { const scored = await scoreJob(supabase, { title: posting.title, company: company.name, location: posting.location, jd_text: posting.jd_text }, calibration.data); costs.push(scored.cost); await supabase.from("job_scores").insert({ job_id: insert.data.id, calibration_id: calibrationId, ...scored.score, model: scored.model }); } catch { /* Persist the real posting even when scoring is unavailable. */ }
    }
  }
  await appendSessionCosts(supabase, sessionId, costs);
  return NextResponse.json({ added, zero_openings: zeroOpenings, calibration_reused: calibrationReused, calibration_id: calibrationId });
}
