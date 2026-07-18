import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { STAGE_LABELS } from "@/lib/stages";
import { computeDashboardData } from "@/lib/dashboard";
import type { ApplicationWithRole } from "@/lib/pipeline-types";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNeeded />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.from("applications").select("*, roles(*, companies(*))");

  if (error) {
    return <ErrorState message={error.message} />;
  }

  const applications = (data ?? []) as ApplicationWithRole[];
  const { dueThisWeek, stale, funnel } = computeDashboardData(applications);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Due this week</CardTitle>
          </CardHeader>
          <CardContent>
            {dueThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next 7 days.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dueThisWeek.map((a) => (
                  <li key={a.id} className="text-sm">
                    <Link href={`/roles/${a.role_id}`} className="font-medium hover:underline">
                      {a.roles?.title ?? "Untitled role"}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      — {a.next_action ?? "next action"} ({a.next_action_date})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stale applications (10+ days untouched)</CardTitle>
          </CardHeader>
          <CardContent>
            {stale.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing stale right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stale.map((a) => (
                  <li key={a.id} className="text-sm">
                    <Link href={`/roles/${a.role_id}`} className="font-medium hover:underline">
                      {a.roles?.title ?? "Untitled role"}
                    </Link>
                    <span className="text-muted-foreground"> — {STAGE_LABELS[a.stage]}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <EmptyState title="No applications yet" />
          ) : (
            <div className="flex flex-wrap gap-3">
              {funnel.map(({ stage, count }) => (
                <div key={stage} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="text-sm">{STAGE_LABELS[stage]}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
