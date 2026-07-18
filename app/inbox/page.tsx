import { SetupNeeded } from "@/components/setup-needed";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { reviewFact } from "./actions";

export default async function InboxPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createClient();
  const { data, error } = await supabase.from("facts").select("*").eq("status", "proposed").order("created_at", { ascending: false });
  if (error) return <ErrorState message={error.message} />;
  return <div className="flex flex-col gap-4"><div><h1 className="text-lg font-semibold">Fact Inbox</h1><p className="text-sm text-muted-foreground">Proposals stay out of the verified corpus until you approve them.</p></div>{!data?.length ? <EmptyState title="No proposed facts" /> : data.map((fact) => <Card key={fact.id}><CardHeader><CardTitle className="text-sm">{fact.category} · {fact.role_context}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm whitespace-pre-wrap">{fact.body}</p><div className="flex flex-wrap gap-2"><form action={reviewFact}><input type="hidden" name="id" value={fact.id} /><input type="hidden" name="action" value="verify" /><Button>Verify</Button></form><form action={reviewFact}><input type="hidden" name="id" value={fact.id} /><input type="hidden" name="action" value="reject" /><Button variant="outline">Reject</Button></form></div></CardContent></Card>)}</div>;
}
