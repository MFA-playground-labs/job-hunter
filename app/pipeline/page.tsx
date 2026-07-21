import { SetupNeeded } from "@/components/setup-needed";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE_STAGES } from "@/lib/workflow-view";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  if (!isSupabaseConfigured()) return <SetupNeeded/>;
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select("*, companies(name)").in("status", PIPELINE_STAGES).order("updated_at", { ascending: false });
  if (error) return <ErrorState message={error.message}/>;
  return <div className="space-y-7">
    <header><p className="text-sm font-medium text-primary">Application flow</p><h1 className="text-3xl font-semibold tracking-tight">Pipeline</h1><p className="mt-1 text-muted-foreground">Keep every opportunity moving toward a clear next action.</p></header>
    {!data?.length ? <EmptyState title="No active opportunities" description="Mark a role Interested from Jobs to start your pipeline."/> : <PipelineBoard jobs={data}/>} 
  </div>;
}
