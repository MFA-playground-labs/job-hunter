import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { RoleWithCompany } from "@/lib/pipeline-types";
import type { ResumeVersion } from "@/types/database";
import { GenerateTailoredVersionButton } from "./generate-button";

export default async function ResumeWorkspaceRolePage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNeeded />;
  }

  const { roleId } = await params;
  const supabase = await createClient();

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("*, companies(*)")
    .eq("id", roleId)
    .maybeSingle();

  if (roleError) {
    return <ErrorState message={roleError.message} />;
  }
  if (!role) {
    notFound();
  }

  const typedRole = role as RoleWithCompany;

  const { data: versions, error: versionsError } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("role_id", roleId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">{typedRole.title}</h1>
        <p className="text-sm text-muted-foreground">
          {typedRole.companies?.name ?? "Unknown company"}
        </p>
      </div>

      <div>
        <GenerateTailoredVersionButton roleId={roleId} />
      </div>

      {versionsError ? (
        <ErrorState message={versionsError.message} />
      ) : (versions as ResumeVersion[] | null)?.length ? (
        <div className="flex flex-col gap-4">
          {(versions as ResumeVersion[]).map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="text-sm">
                  {new Date(v.created_at).toLocaleString()}
                </CardTitle>
                {v.tailoring_notes && (
                  <p className="text-xs text-muted-foreground">{v.tailoring_notes}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {v.content ?? "(empty)"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No tailored versions yet"
          description="Click 'Generate tailored version' to run a tailoring pass against this role's JD."
        />
      )}
    </div>
  );
}
