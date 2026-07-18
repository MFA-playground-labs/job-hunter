import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { STAGE_LABELS } from "@/lib/stages";
import type { RoleWithCompany } from "@/lib/pipeline-types";
import type { Application, ResumeVersion } from "@/types/database";

const SCORES: { key: keyof RoleWithCompany; label: string }[] = [
  { key: "comp_score", label: "Comp" },
  { key: "brand_score", label: "Brand" },
  { key: "exit_score", label: "Exit" },
  { key: "content_score", label: "Content" },
  { key: "composite_score", label: "Composite" },
];

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return <SetupNeeded />;
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("*, companies(*)")
    .eq("id", id)
    .maybeSingle();

  if (roleError) {
    return <ErrorState message={roleError.message} />;
  }
  if (!role) {
    notFound();
  }

  const typedRole = role as RoleWithCompany;

  const [{ data: applications }, { data: resumeVersions }] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("role_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("resume_versions")
      .select("*")
      .eq("role_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const application = (applications as Application[] | null)?.[0] ?? null;
  const versions = (resumeVersions as ResumeVersion[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{typedRole.title}</h1>
        <p className="text-sm text-muted-foreground">
          {typedRole.companies?.name ?? "Unknown company"}
          {typedRole.status ? ` · ${typedRole.status}` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Job description</CardTitle>
          </CardHeader>
          <CardContent>
            {typedRole.jd_text ? (
              <p className="whitespace-pre-wrap text-sm">{typedRole.jd_text}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No JD text stored for this role yet.</p>
            )}
            {typedRole.source_url && (
              <a
                href={typedRole.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                View original posting
              </a>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Scores</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {SCORES.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span>{(typedRole[key] as number | null) ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Application</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {application ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge>{STAGE_LABELS[application.stage]}</Badge>
                  </div>
                  {application.next_action && (
                    <p>
                      <span className="text-muted-foreground">Next: </span>
                      {application.next_action}
                      {application.next_action_date ? ` (${application.next_action_date})` : ""}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No application tracked for this role yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Resume versions</CardTitle>
          <Link
            href={`/resume-workspace/${id}`}
            className="text-sm text-primary hover:underline"
          >
            Open resume workspace →
          </Link>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <EmptyState
              title="No tailored versions yet"
              description="Generate one from the resume workspace."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {versions.map((v) => (
                <li key={v.id} className="rounded-md border px-3 py-2 text-sm">
                  <p className="text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                  {v.tailoring_notes && <p className="mt-1">{v.tailoring_notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
