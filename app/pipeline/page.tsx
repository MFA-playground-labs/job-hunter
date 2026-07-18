import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { STAGES } from "@/lib/stages";
import type { ApplicationWithRole } from "@/lib/pipeline-types";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  if (!isSupabaseConfigured()) {
    return <SetupNeeded />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("*, roles(*, companies(*))")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Pipeline</h1>
      {error ? (
        <ErrorState message={error.message} />
      ) : (
        <PipelineBoard applications={(data ?? []) as ApplicationWithRole[]} stages={STAGES} />
      )}
    </div>
  );
}
