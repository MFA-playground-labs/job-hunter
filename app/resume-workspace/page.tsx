import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { RoleWithCompany } from "@/lib/pipeline-types";

export default async function ResumeWorkspaceIndexPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNeeded />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("*, companies(*), resume_versions(id)")
    .order("first_seen", { ascending: false });

  if (error) {
    return <ErrorState message={error.message} />;
  }

  const roles = (data ?? []) as (RoleWithCompany & { resume_versions: { id: string }[] })[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Resume Workspace</h1>
      <p className="text-sm text-muted-foreground">
        Pick a role to view its tailored resume versions or generate a new one.
      </p>

      {roles.length === 0 ? (
        <EmptyState title="No roles yet" description="Roles will show up here once tracked." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {roles.map((role) => (
            <Link key={role.id} href={`/resume-workspace/${role.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">{role.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{role.companies?.name ?? "Unknown company"}</span>
                  <span>{role.resume_versions.length} version(s)</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
