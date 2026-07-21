import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SetupNeeded } from "@/components/setup-needed";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { groupPipeline, nextPipelineAction, PIPELINE_STAGES } from "@/lib/workflow-view";

export default async function PipelinePage() {
  if (!isSupabaseConfigured()) return <SetupNeeded/>;
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select("*, companies(name)").in("status", PIPELINE_STAGES).order("updated_at", { ascending: false });
  if (error) return <ErrorState message={error.message}/>;
  const grouped = groupPipeline(data ?? []);
  return <div className="space-y-7">
    <header><p className="text-sm font-medium text-primary">Application flow</p><h1 className="text-3xl font-semibold tracking-tight">Pipeline</h1><p className="mt-1 text-muted-foreground">Keep every opportunity moving toward a clear next action.</p></header>
    {!data?.length ? <EmptyState title="No active opportunities" description="Mark a role Interested from Jobs to start your pipeline."/> : <div className="grid gap-4 lg:grid-cols-4">
      {PIPELINE_STAGES.map((stage) => <section className="rounded-2xl bg-muted/50 p-3" key={stage} aria-labelledby={`stage-${stage}`}>
        <div className="mb-3 flex items-center justify-between px-1"><h2 id={`stage-${stage}`} className="font-semibold capitalize">{stage}</h2><Badge variant="outline">{grouped[stage].length}</Badge></div>
        <div className="space-y-2">{grouped[stage].map((job) => <Link className="block rounded-xl border bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/jobs/${job.id}`} key={job.id}>
          <p className="font-medium leading-snug">{job.title}</p><p className="mt-1 text-sm text-muted-foreground">{job.companies?.name ?? "Unknown company"}</p>
          <div className="mt-4 border-t pt-3"><p className="text-xs font-medium text-primary">{nextPipelineAction(job.status)}</p><p className="mt-1 text-xs text-muted-foreground">Updated {new Date(job.updated_at).toLocaleDateString()}</p></div>
        </Link>)}</div>
      </section>)}
    </div>}
  </div>;
}
