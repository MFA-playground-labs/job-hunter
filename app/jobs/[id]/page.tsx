import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { hoursSinceScan } from "@/lib/freshness";
import { getJobsDigestGroup, latestScore } from "@/lib/job-workflow";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { JobActionControls } from "../job-action-controls";

function scoreLabel(value: number) { return `${Math.round(value)}/100`; }

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  const { id } = await params;
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("*, companies(name), job_scores(*, calibrations(label))")
    .eq("id", id)
    .single();

  if (error || !job) return <ErrorState message={error?.message ?? "Job not found."} />;
  const score = latestScore(job.job_scores ?? []);
  const age = hoursSinceScan(job.scanned_at);
  const group = getJobsDigestGroup(job.status, job.scanned_at);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
      <Link href="/jobs" className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">← Back to jobs</Link>
      <header className="border-b pb-6">
        <div className="flex flex-wrap items-center gap-2"><Badge variant={group === "hot" ? "destructive" : "outline"}>{group}</Badge><Badge variant="outline">{job.status}</Badge></div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{job.title}</h1>
        <p className="mt-1 text-muted-foreground">{job.companies?.name ?? "Unknown company"} · {job.location ?? "Location unavailable"}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <a href={job.url} target="_blank" rel="noreferrer" className="font-medium text-foreground underline underline-offset-4">Open original posting</a>
          <span>{age === null ? "Scan time unavailable" : age < 24 ? `Scanned ${Math.floor(age)}h ago` : `Scanned ${Math.floor(age / 24)}d ago`}</span>
          <span>Source: {job.source}</span>
          {job.comp_range && <span>{job.comp_range}{job.comp_is_estimate ? " · compensation estimate" : " · reported compensation"}</span>}
        </div>
        <div className="mt-5"><JobActionControls jobId={job.id} currentStatus={job.status} /></div>
      </header>

      <section aria-labelledby="fit-score"><h2 id="fit-score" className="font-medium">Fit score</h2>
        {score ? <div className="mt-3 border-l-2 border-primary pl-4"><p className="text-3xl font-semibold tabular-nums">{scoreLabel(score.composite)}</p><div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4"><p><span className="block text-xs text-muted-foreground">Compensation</span>{scoreLabel(score.comp_fit)}</p><p><span className="block text-xs text-muted-foreground">Brand</span>{scoreLabel(score.brand)}</p><p><span className="block text-xs text-muted-foreground">Exit opportunity</span>{scoreLabel(score.exit_opportunity)}</p><p><span className="block text-xs text-muted-foreground">Role content</span>{scoreLabel(score.role_content_fit)}</p></div><p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{score.rationale}</p><p className="mt-2 text-xs text-muted-foreground">Calibration: {score.calibrations?.label ?? "Unavailable"} · Model: {score.model}</p></div> : <p className="mt-2 text-sm text-muted-foreground">No fit score has been generated for this job yet.</p>}
      </section>

      <section className="border-t pt-6" aria-labelledby="description"><h2 id="description" className="font-medium">Job description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{job.jd_text ?? "No job description was captured."}</p></section>
    </div>
  );
}
