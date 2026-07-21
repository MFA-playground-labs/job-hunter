import { ActionSubmit } from "@/components/action-submit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SetupNeeded } from "@/components/setup-needed";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { groupOutreach } from "@/lib/workflow-view";
import { saveOutreach, updateOutreachStatus } from "./actions";

type Entry = { id: string; contact: string; company_id: string | null; channel: string | null; status: string; notes: string | null; last_touch: string | null; next_follow_up: string | null; companies: { name: string } | null };

function OutreachRow({ entry, overdue = false }: { entry: Entry; overdue?: boolean }) {
  return <article className="grid gap-4 rounded-xl border bg-background p-4 shadow-sm md:grid-cols-[1.3fr_1fr_auto] md:items-center">
    <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{entry.contact}</h3>{overdue && <Badge variant="destructive">Overdue</Badge>}</div><p className="text-sm text-muted-foreground">{entry.companies?.name ?? "No company"} · {entry.channel ?? "Channel not set"}</p>{entry.notes && <p className="mt-2 text-sm">{entry.notes}</p>}</div>
    <div className="text-sm"><p className="font-medium capitalize">{entry.status}</p><p className="text-muted-foreground">{entry.next_follow_up ? `Follow up ${new Date(`${entry.next_follow_up}T00:00:00`).toLocaleDateString()}` : "No follow-up scheduled"}</p></div>
    <form action={updateOutreachStatus} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="status" value="sent"/><Input className="h-11 w-36" name="next_follow_up" type="date" aria-label={`Reschedule follow-up with ${entry.contact}`}/><Button className="min-h-11" variant="outline" type="submit">Save touch</Button></form>
  </article>;
}

export default async function OutreachPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded/>;
  const supabase = await createClient();
  const [entriesResult, companiesResult] = await Promise.all([
    supabase.from("outreach").select("*, companies(name)").order("next_follow_up"),
    supabase.from("companies").select("id, name").order("name"),
  ]);
  const error = entriesResult.error ?? companiesResult.error;
  if (error) return <ErrorState message={error.message}/>;
  const groups = groupOutreach(entriesResult.data ?? [], new Date().toISOString().slice(0, 10));
  return <div className="space-y-8">
    <header><p className="text-sm font-medium text-primary">Relationship cadence</p><h1 className="text-3xl font-semibold tracking-tight">Outreach</h1><p className="mt-1 text-muted-foreground">Follow up when it matters and keep warm conversations visible.</p></header>
    {groups.overdue.length > 0 && <section className="space-y-3"><div><h2 className="text-xl font-semibold">Due now</h2><p className="text-sm text-muted-foreground">These conversations need your attention first.</p></div>{groups.overdue.map((entry) => <OutreachRow key={entry.id} entry={entry} overdue/>)}</section>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">Upcoming</h2>{groups.upcoming.length ? groups.upcoming.map((entry) => <OutreachRow key={entry.id} entry={entry}/>) : <EmptyState title="No upcoming follow-ups"/>}</section>
    {groups.dormant.length > 0 && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Dormant and closed ({groups.dormant.length})</summary><div className="mt-4 space-y-3">{groups.dormant.map((entry) => <OutreachRow key={entry.id} entry={entry}/>)}</div></details>}
    <details className="rounded-2xl bg-muted/60 p-5"><summary className="cursor-pointer font-semibold">Add outreach</summary><form action={saveOutreach} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Input name="contact" placeholder="Contact" aria-label="Contact" required/>
      <select name="company_id" aria-label="Company" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Company</option>{(companiesResult.data ?? []).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
      <select name="channel" aria-label="Channel" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="linkedin">LinkedIn</option><option value="email">Email</option><option value="intro">Intro</option><option value="other">Other</option></select>
      <Input name="next_follow_up" type="date" aria-label="Next follow-up"/><Input name="notes" placeholder="Notes" aria-label="Notes"/><ActionSubmit>Add outreach</ActionSubmit>
    </form></details>
  </div>;
}
