import { PageHeader } from "@/components/page-header";
import { SetupNeeded } from "@/components/setup-needed";
import { ErrorState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded/>;
  const supabase = await createClient();
  const [playbooks, calibrations, sessions, lastScan] = await Promise.all([
    supabase.from("playbooks").select("slug, title, updated_at").order("title"),
    supabase.from("calibrations").select("*").order("created_at", { ascending: false }),
    supabase.from("sessions").select("type, model_costs, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("jobs").select("scanned_at").order("scanned_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const error = playbooks.error ?? calibrations.error ?? sessions.error ?? lastScan.error;
  if (error) return <ErrorState message={error.message}/>;
  return <div className="space-y-8"><PageHeader eyebrow="Workspace" title="Settings" description="Manage scanning, scoring inputs, playbooks, and model usage."/>
    <section className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border bg-background p-5"><h2 className="font-semibold">Scan cadence</h2><p className="mt-2 text-sm text-muted-foreground">{lastScan.data?.scanned_at ? `Last scan: ${new Date(lastScan.data.scanned_at).toLocaleString()}` : "No scans recorded yet."}</p><p className="mt-3 text-sm">Run job discovery twice daily so fresh roles reach the digest quickly.</p></div><div className="rounded-xl border bg-background p-5"><h2 className="font-semibold">Recent model sessions</h2><p className="mt-2 text-3xl font-semibold">{sessions.data?.length ?? 0}</p><p className="text-sm text-muted-foreground">Shown from the latest 30 sessions</p></div></section>
    <section><h2 className="text-xl font-semibold">Calibrations</h2><div className="mt-3 divide-y rounded-xl border bg-background">{(calibrations.data??[]).map(item=><div className="p-4" key={item.id}><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.label}</h3><Badge variant="outline">{item.location_policy.replaceAll("_"," ")}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Base floor {item.base_floor??"—"} · Total comp {item.total_comp_floor??"—"} · Brand {item.brand_weight} · Exit {item.exit_weight}</p></div>)}{!calibrations.data?.length&&<p className="p-4 text-sm text-muted-foreground">No calibration has been created yet.</p>}</div></section>
    <section><h2 className="text-xl font-semibold">Playbooks</h2><div className="mt-3 divide-y rounded-xl border bg-background">{(playbooks.data??[]).map(item=><div className="flex items-center justify-between gap-3 p-4" key={item.slug}><span className="font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{item.slug}</span></div>)}{!playbooks.data?.length&&<p className="p-4 text-sm text-muted-foreground">No playbooks imported. This does not block UI exploration.</p>}</div></section>
  </div>;
}
