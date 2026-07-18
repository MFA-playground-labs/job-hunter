import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetupNeeded } from "@/components/setup-needed";
import { ErrorState } from "@/components/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { isStaleScan } from "@/lib/staleness";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createClient();
  const [jobs, facts, companies, sessions] = await Promise.all([supabase.from("jobs").select("status, scanned_at").order("scanned_at", { ascending: false }), supabase.from("facts").select("status"), supabase.from("companies").select("id, name, ats_last_status"), supabase.from("sessions").select("model_costs, created_at").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())]);
  const error = jobs.error ?? facts.error ?? companies.error ?? sessions.error; if (error) return <ErrorState message={error.message} />;
  const counts = Object.entries((jobs.data ?? []).reduce<Record<string, number>>((result, job) => ({ ...result, [job.status]: (result[job.status] ?? 0) + 1 }), {}));
  const today = new Date().toDateString(); const newToday = (jobs.data ?? []).filter((job) => job.scanned_at && new Date(job.scanned_at).toDateString() === today).length;
  const stale = (jobs.data ?? []).filter((job) => isStaleScan(job.scanned_at)).length;
  const verified = (facts.data ?? []).filter((fact) => fact.status === "verified").length; const proposed = (facts.data ?? []).filter((fact) => fact.status === "proposed").length;
  const spend = (sessions.data ?? []).flatMap((session) => Array.isArray(session.model_costs) ? session.model_costs : []).reduce<number>((sum, cost) => sum + (typeof cost === "object" && cost && "cost_usd" in cost && typeof cost.cost_usd === "number" ? cost.cost_usd : 0), 0);
  const zeroOpenings = (companies.data ?? []).filter((company) => company.ats_last_status === "ok").length;
  return <div className="flex flex-col gap-5"><h1 className="text-lg font-semibold">Dashboard</h1><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm">Pipeline</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{counts.map(([status, count]) => <span className="text-sm" key={status}>{status}: {count}</span>) || "No jobs yet"}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Facts</CardTitle></CardHeader><CardContent><Link href="/inbox" className="text-sm underline">{verified} verified · {proposed} proposed</Link></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">New jobs today</CardTitle></CardHeader><CardContent>{newToday}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Stale scans</CardTitle></CardHeader><CardContent>{stale}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Companies with no current roles</CardTitle></CardHeader><CardContent><Link href="/outreach" className="underline">{zeroOpenings} review in outreach</Link></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">LLM spend this month</CardTitle></CardHeader><CardContent>${spend.toFixed(2)} / $30.00</CardContent></Card></div></div>;
}
