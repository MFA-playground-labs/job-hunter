import Link from "next/link"; import { Badge } from "@/components/ui/badge"; import { Button } from "@/components/ui/button"; import { SetupNeeded } from "@/components/setup-needed"; import { EmptyState } from "@/components/empty-state"; import { isSupabaseConfigured } from "@/lib/supabase/is-configured"; import { createClient } from "@/lib/supabase/server"; import { freshnessTier, hoursSinceScan } from "@/lib/freshness"; import { updateJob } from "./actions";

const TIER_ORDER = { hot: 0, warm: 1, cooling: 2, stale: 3 } as const;
const TIER_BADGE = { hot: "destructive", warm: "default", cooling: "outline" } as const;
const HOT_APPLY_THRESHOLD = 70;

function JobCard({ job, score, tier }: { job: { id: string; title: string; location: string | null; scanned_at: string | null; companies: { name: string } | null }; score?: { composite: number; rationale: string }; tier: "hot" | "warm" | "cooling" }) {
  const hours = hoursSinceScan(job.scanned_at);
  return <article className="rounded-lg border p-4" key={job.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-medium underline" href={`/jobs/${job.id}`}>{job.title}</Link><p className="text-sm text-muted-foreground">{job.companies?.name ?? "Unknown company"} · {job.location ?? "Location unknown"}</p></div><div className="flex items-center gap-2"><Badge variant={TIER_BADGE[tier]}>{tier === "hot" ? `Hot · ${Math.max(0, Math.round(24 - (hours ?? 24)))}h left` : tier[0].toUpperCase() + tier.slice(1)}</Badge>{score && <Badge variant="outline">{score.composite.toFixed(0)} / 100</Badge>}</div></div>{score && <details className="mt-2 text-sm"><summary>Scoring rationale</summary><p className="mt-2">{score.rationale}</p></details>}<div className="mt-3 flex gap-2"><form action={updateJob}><input name="id" type="hidden" value={job.id}/><input name="status" type="hidden" value="interested"/><Button size="sm">Interested</Button></form><form action={updateJob} className="flex gap-1"><input name="id" type="hidden" value={job.id}/><input name="status" type="hidden" value="passed"/><select name="pass_reason" className="h-7 rounded border text-xs"><option value="other">Pass reason</option><option value="comp_too_low">Comp too low</option><option value="brand_mismatch">Brand mismatch</option><option value="wrong_scope">Wrong scope</option><option value="location">Location</option><option value="domain">Domain</option></select><Button size="sm" variant="outline">Pass</Button></form></div></article>;
}

export default async function JobsPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded/>;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*, companies(name), job_scores(*)").order("scanned_at", { ascending: false });
  const withTier = (data ?? [])
    .filter((job) => job.status !== "passed")
    .map((job) => ({ job, score: job.job_scores.sort((a, b) => b.created_at.localeCompare(a.created_at))[0], tier: freshnessTier(job.scanned_at) }))
    .filter((entry) => entry.tier !== "stale");
  const applyNow = withTier.filter((entry) => entry.tier === "hot" && (entry.score?.composite ?? 0) >= HOT_APPLY_THRESHOLD);
  const rest = withTier
    .filter((entry) => !applyNow.includes(entry))
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || (b.score?.composite ?? 0) - (a.score?.composite ?? 0));

  return <div className="flex flex-col gap-6">
    <h1 className="text-lg font-semibold">Jobs</h1>
    {!withTier.length ? <EmptyState title="No fresh jobs yet" description="Import playbooks, create a calibration, then scan your target companies."/> : <>
      {applyNow.length > 0 && <section><h2 className="mb-2 text-sm font-medium text-destructive">Apply within 24h ({applyNow.length})</h2><div className="flex flex-col gap-3">{applyNow.map((entry) => <JobCard job={entry.job} score={entry.score} tier="hot" key={entry.job.id}/>)}</div></section>}
      <section><h2 className="mb-2 text-sm font-medium">Everything else</h2><div className="flex flex-col gap-3">{rest.map((entry) => <JobCard job={entry.job} score={entry.score} tier={entry.tier as "hot" | "warm" | "cooling"} key={entry.job.id}/>)}</div></section>
    </>}
  </div>;
}
