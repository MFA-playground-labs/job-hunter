import { requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser(); if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("facts").select("*").order("role_context").order("category");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const grouped = new Map<string, typeof data>();
  for (const fact of data ?? []) { const key = `${fact.role_context} / ${fact.category}`; grouped.set(key, [...(grouped.get(key) ?? []), fact]); }
  const markdown = [...grouped].map(([key, facts]) => `## ${key}\n\n${facts.map((fact) => `- ${fact.body}${fact.status === "verified" && fact.verified_at && !/\[verified:\s*[^\]]+\]/i.test(fact.body) ? ` [verified: ${fact.verified_at.slice(0, 10)}]` : ""}`).join("\n")}`).join("\n\n");
  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": "attachment; filename=careeros-facts.md" } });
}
