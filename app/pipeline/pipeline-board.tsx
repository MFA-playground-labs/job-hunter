"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { STAGE_LABELS } from "@/lib/stages";
import type { ApplicationWithRole } from "@/lib/pipeline-types";
import type { Application } from "@/types/database";
import { StageSelect } from "./stage-select";

export function PipelineBoard({
  applications,
  stages,
}: {
  applications: ApplicationWithRole[];
  stages: Application["stage"][];
}) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Applications will show up here once roles are tracked. Seed data or add a role to get started."
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const items = applications.filter((a) => a.stage === stage);
        return (
          <div key={stage} className="flex w-72 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((app) => (
                <Card key={app.id} className="gap-3 py-3">
                  <CardHeader className="px-3">
                    <CardTitle className="text-sm font-medium">
                      <Link href={`/roles/${app.role_id}`} className="hover:underline">
                        {app.roles?.title ?? "Untitled role"}
                      </Link>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {app.roles?.companies?.name ?? "Unknown company"}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 px-3">
                    {app.next_action && (
                      <p className="text-xs text-muted-foreground">{app.next_action}</p>
                    )}
                    <StageSelect applicationId={app.id} currentStage={app.stage} stages={stages} />
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">Nothing here.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
