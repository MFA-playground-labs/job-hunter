import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { hoursSinceScan } from "@/lib/freshness";
import {
  getJobsDigestGroup,
  latestScore,
  matchesJobFilters,
  parseJobFilters,
  type JobsDigestGroup,
} from "@/lib/job-workflow";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { JobActionControls } from "./job-action-controls";

const GROUPS: Array<{ id: JobsDigestGroup; label: string; description: string }> = [
  { id: "hot", label: "Hot", description: "Scanned within the last 24 hours" },
  { id: "warm", label: "Warm", description: "Scanned in the last three days" },
  { id: "cooling", label: "Cooling", description: "Still fresh, but no longer urgent" },
  { id: "passed", label: "Passed", description: "Kept with your decision context" },
  { id: "stale", label: "Stale", description: "Review the original posting before acting" },
];

const GROUP_BADGE: Record<JobsDigestGroup, "default" | "secondary" | "outline" | "destructive"> = {
  hot: "destructive",
  warm: "default",
  cooling: "secondary",
  passed: "outline",
  stale: "outline",
};

function scanAge(scannedAt: string | null) {
  const hours = hoursSinceScan(scannedAt);
  if (hours === null) return "Scan time unavailable";
  if (hours < 1) return "Scanned less than 1h ago";
  if (hours < 48) return `Scanned ${Math.floor(hours)}h ago`;
  return `Scanned ${Math.floor(hours / 24)}d ago`;
}

function ScoreBreakdown({ score }: { score: { composite: number; comp_fit: number; brand: number; exit_opportunity: number; role_content_fit: number } | undefined }) {
  if (!score) return <span className="text-xs text-muted-foreground">Not yet scored</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Fit score breakdown">
      <span className="font-medium text-foreground">{Math.round(score.composite)}/100 fit</span>
      <span>Comp {Math.round(score.comp_fit)}</span>
      <span>Brand {Math.round(score.brand)}</span>
      <span>Exit {Math.round(score.exit_opportunity)}</span>
      <span>Role {Math.round(score.role_content_fit)}</span>
    </div>
  );
}

function JobCard({ entry }: { entry: { job: { id: string; title: string; location: string | null; scanned_at: string | null; status: string; comp_range: string | null; comp_is_estimate: boolean; source: string; companies: { name: string } | null }; score: { composite: number; comp_fit: number; brand: number; exit_opportunity: number; role_content_fit: number; rationale: string; model: string } | undefined; group: JobsDigestGroup } }) {
  const { job, score, group } = entry;
  return (
    <article className="border-b py-5 first:pt-1 last:border-b-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/jobs/${job.id}`} className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
              {job.title}
            </Link>
            <Badge variant={GROUP_BADGE[group]}>{group}</Badge>
            {job.status !== "new" && <Badge variant="outline">{job.status}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{job.companies?.name ?? "Unknown company"} · {job.location ?? "Location unavailable"}</p>
          <ScoreBreakdown score={score} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{scanAge(job.scanned_at)}</span>
            {job.comp_range && <span>{job.comp_range}{job.comp_is_estimate ? " · estimate" : " · reported"}</span>}
            <span>Source: {job.source}</span>
          </div>
          {score && (
            <details className="max-w-2xl text-sm">
              <summary className="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Why this score?</summary>
              <p className="mt-2 leading-6 text-muted-foreground">{score.rationale}</p>
              <p className="mt-1 text-xs text-muted-foreground">Scored with {score.model}</p>
            </details>
          )}
        </div>
        <JobActionControls jobId={job.id} currentStatus={job.status} />
      </div>
    </article>
  );
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) return <SetupNeeded />;

  const filters = parseJobFilters(await searchParams);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, companies(name), job_scores(*)")
    .order("scanned_at", { ascending: false });

  if (error) return <ErrorState message={error.message} />;

  const entries = (data ?? []).map((job) => {
    const score = latestScore(job.job_scores ?? []);
    const company = job.companies?.name ?? "Unknown company";
    const group = getJobsDigestGroup(job.status, job.scanned_at);
    return { job, score, company, group, tier: group === "passed" ? "stale" : group };
  }).filter((entry) => matchesJobFilters({
    company: entry.company,
    location: entry.job.location,
    status: entry.job.status,
    tier: entry.tier,
    score: entry.score,
  }, filters));

  const companies = [...new Set((data ?? []).map((job) => job.companies?.name).filter((name): name is string => Boolean(name)))].sort();
  const locations = [...new Set((data ?? []).map((job) => job.location).filter((location): location is string => Boolean(location)))].sort();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
      <header className="flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Daily work</p>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compare active roles, make a decision, and retain the evidence behind it.</p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{entries.length} matching {entries.length === 1 ? "job" : "jobs"}</p>
      </header>

      <form className="grid gap-3 border-b pb-5 sm:grid-cols-2 lg:grid-cols-5" action="/jobs" method="get">
        <label className="grid gap-1 text-xs font-medium">Freshness
          <select name="freshness" defaultValue={filters.freshness} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="all">All freshness</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cooling">Cooling</option><option value="stale">Stale</option></select>
        </label>
        <label className="grid gap-1 text-xs font-medium">Minimum fit score
          <select name="minScore" defaultValue={String(filters.minScore)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="0">Any score</option><option value="50">50+</option><option value="70">70+</option><option value="85">85+</option></select>
        </label>
        <label className="grid gap-1 text-xs font-medium">Company
          <select name="company" defaultValue={filters.company} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All companies</option>{companies.map((company) => <option key={company} value={company}>{company}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs font-medium">Location
          <select name="location" defaultValue={filters.location} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">All locations</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select>
        </label>
        <label className="grid gap-1 text-xs font-medium">Status
          <select name="status" defaultValue={filters.status} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="all">All statuses</option><option value="new">New</option><option value="interested">Interested</option><option value="passed">Passed</option><option value="applied">Applied</option><option value="interviewing">Interviewing</option><option value="offer">Offer</option><option value="rejected">Rejected</option><option value="closed">Closed</option></select>
        </label>
        <div className="flex items-end gap-2 lg:col-span-5"><button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80" type="submit">Apply filters</button><Link href="/jobs" className="h-9 rounded-md px-3 py-2 text-sm hover:bg-muted">Clear</Link></div>
      </form>

      {entries.length === 0 ? (
        <EmptyState title="No jobs match these filters" description="Try clearing a filter, or run a scan to bring in new roles." />
      ) : (
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const grouped = entries.filter((entry) => entry.group === group.id);
            if (!grouped.length) return null;
            return <section key={group.id} aria-labelledby={`jobs-${group.id}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3"><div><h2 id={`jobs-${group.id}`} className="font-medium">{group.label} <span className="text-muted-foreground">({grouped.length})</span></h2><p className="text-xs text-muted-foreground">{group.description}</p></div></div>
              <div>{grouped.map((entry) => <JobCard entry={entry} key={entry.job.id} />)}</div>
            </section>;
          })}
        </div>
      )}
    </div>
  );
}
