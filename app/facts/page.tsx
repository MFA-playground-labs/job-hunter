import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { SetupNeeded } from "@/components/setup-needed";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

export default async function FactsPage({ searchParams }: { searchParams: Promise<{ role_context?: string; category?: string; status?: string }> }) {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  const filters = await searchParams; const supabase = await createClient();
  let query = supabase.from("facts").select("*").order("updated_at", { ascending: false });
  if (filters.role_context) query = query.eq("role_context", filters.role_context as never);
  if (filters.category) query = query.eq("category", filters.category as never);
  if (filters.status) query = query.eq("status", filters.status as never);
  const { data, error } = await query; if (error) return <ErrorState message={error.message} />;
  const gaps = (data ?? []).filter((fact) => fact.category === "gap");
  return <div className="flex flex-col gap-5"><div className="flex items-center justify-between"><div><h1 className="text-lg font-semibold">Facts</h1><p className="text-sm text-muted-foreground">The reviewed evidence base for every AI workflow.</p></div><Link className="text-sm underline" href="/api/export/facts">Export Markdown</Link></div>{gaps.length > 0 && <Card><CardHeader><CardTitle className="text-sm">Gaps to preserve</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{gaps.map((fact) => <p className="text-sm" key={fact.id}>{fact.body}</p>)}</CardContent></Card>}{!data?.length ? <EmptyState title="No facts match these filters" /> : <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr><th className="p-3">Fact</th><th className="p-3">Context</th><th className="p-3">Status</th></tr></thead><tbody>{data.map((fact) => <tr key={fact.id} className="border-t"><td className="p-3">{fact.body}</td><td className="p-3">{fact.role_context} · {fact.category}</td><td className="p-3"><Badge variant="outline">{fact.status}</Badge></td></tr>)}</tbody></table></div>}</div>;
}
