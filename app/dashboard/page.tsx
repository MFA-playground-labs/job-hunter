import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Clock3, Mail, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SetupNeeded } from "@/components/setup-needed";
import { ErrorState } from "@/components/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { isStaleScan } from "@/lib/staleness";
import { buildDashboardSummary } from "@/lib/workflow-view";

function ActionRow({ href, icon, title, detail, count }: { href: string; icon: React.ReactNode; title: string; detail: string; count: number }) {
  return <Link href={href} className="group flex min-h-20 items-center gap-4 border-b px-1 py-4 last:border-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{detail}</span></span><Badge variant={count ? "default" : "outline"}>{count}</Badge><ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1"/>
  </Link>;
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded/>;
  const supabase = await createClient();
  const now = new Date(); const today = now.toISOString().slice(0, 10); const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [jobs, facts, companies, sessions, applicationsWeek, outreachWeek, outreachDue] = await Promise.all([
    supabase.from("jobs").select("id, company_id, status, scanned_at, updated_at"),
    supabase.from("facts").select("status"),
    supabase.from("companies").select("id, name"),
    supabase.from("sessions").select("model_costs, created_at").gte("created_at", monthStart),
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("applied_at", weekAgo),
    supabase.from("outreach").select("id", { count: "exact", head: true }).gte("last_touch", weekAgo),
    supabase.from("outreach").select("id", { count: "exact", head: true }).lte("next_follow_up", today).not("status", "in", "(dormant,closed)"),
  ]);
  const error = jobs.error ?? facts.error ?? companies.error ?? sessions.error ?? applicationsWeek.error ?? outreachWeek.error ?? outreachDue.error;
  if (error) return <ErrorState message={error.message}/>;
  const summary = buildDashboardSummary(jobs.data ?? []);
  const proposed = (facts.data ?? []).filter((fact) => fact.status === "proposed").length;
  const interviewing = summary.counts.interviewing ?? 0;
  const stale = (jobs.data ?? []).filter((job) => isStaleScan(job.scanned_at)).length;
  const companiesWithOpenJobs = new Set((jobs.data ?? []).filter((job) => ["new", "interested"].includes(job.status) && !isStaleScan(job.scanned_at)).map((job) => job.company_id).filter(Boolean));
  const zeroOpenings = (companies.data ?? []).filter((company) => !companiesWithOpenJobs.has(company.id)).length;
  const spend = (sessions.data ?? [])
    .flatMap((session) => Array.isArray(session.model_costs) ? session.model_costs : [])
    .reduce<number>((sum, cost) => sum + (typeof cost === "object" && cost && "cost_usd" in cost && typeof cost.cost_usd === "number" ? cost.cost_usd : 0), 0);
  return <div className="space-y-9">
    <header><p className="text-sm font-medium text-primary">Today</p><h1 className="text-3xl font-semibold tracking-tight">Your job search, in motion.</h1><p className="mt-1 text-muted-foreground">Start with the most time-sensitive work, then keep the funnel moving.</p></header>
    <section className="rounded-2xl border bg-background px-5 shadow-sm" aria-labelledby="today-heading"><h2 id="today-heading" className="sr-only">Priority actions</h2>
      <ActionRow href="/jobs?freshness=hot&status=new" icon={<BriefcaseBusiness className="size-5"/>} title="Review hot opportunities" detail="Fresh roles awaiting a decision" count={summary.hotUntriaged}/>
      <ActionRow href="/outreach" icon={<Mail className="size-5"/>} title="Follow up with contacts" detail="Conversations due today or earlier" count={outreachDue.count ?? 0}/>
      <ActionRow href="/pipeline" icon={<Clock3 className="size-5"/>} title="Move applications forward" detail="Interested roles, applications, interviews, and offers" count={(summary.counts.interested ?? 0) + (summary.counts.applied ?? 0) + interviewing + (summary.counts.offer ?? 0)}/>
      <ActionRow href="/inbox" icon={<Sparkles className="size-5"/>} title="Review proposed facts" detail="Optional—fact capture remains deferred" count={proposed}/>
    </section>
    <section><div className="mb-4"><h2 className="text-xl font-semibold">This week</h2><p className="text-sm text-muted-foreground">The activity that builds interview momentum.</p></div><div className="grid divide-y rounded-2xl border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {[{label:"Applications",value:applicationsWeek.count ?? 0},{label:"Outreach touches",value:outreachWeek.count ?? 0},{label:"Interviewing",value:interviewing}].map((metric) => <div className="p-5" key={metric.label}><p className="text-3xl font-semibold">{metric.value}</p><p className="mt-1 text-sm text-muted-foreground">{metric.label}</p></div>)}
    </div></section>
    <section><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System health</h2><div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm"><span>{stale} stale scans</span><Link className="hover:text-primary" href="/companies">{zeroOpenings} companies without fresh active roles</Link><span>${spend.toFixed(2)} / $30 model spend</span></div></section>
  </div>;
}
