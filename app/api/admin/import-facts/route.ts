import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { appendSessionCosts, createSession, runLLM } from "@/lib/llm";
import { extractVerifiedDate, FACT_EXTRACTION_SCHEMA, FACT_EXTRACTION_SYSTEM, isExtractedFact } from "@/lib/fact-import";

function chunkMarkdown(value: string) {
  if (Buffer.byteLength(value) <= 100_000) return [value];
  const chunks: string[] = [];
  let current = "";
  for (const section of value.split(/(?=^#{1,6}\s)/m)) {
    if (Buffer.byteLength(current + section) > 90_000 && current) { chunks.push(current); current = ""; }
    current += section;
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const filePath = path.join(process.cwd(), "docs", "marc-facts.md");
  let source: string;
  try { source = await fs.readFile(filePath, "utf8"); } catch { return NextResponse.json({ error: "Missing docs/marc-facts.md. Add Marc's fact corpus there, then try again." }, { status: 404 }); }
  const sessionId = await createSession(auth.supabase, "fact_import");
  const costs = [];
  const extracted = [];
  try {
    for (const chunk of chunkMarkdown(source)) {
      const result = await runLLM({ task: "fact_extraction", system: FACT_EXTRACTION_SYSTEM, messages: [{ role: "user", content: chunk }], jsonSchema: FACT_EXTRACTION_SCHEMA });
      costs.push(result.cost);
      const facts = (result.parsed as { facts?: unknown[] } | null)?.facts ?? [];
      extracted.push(...facts.filter(isExtractedFact));
    }
    const existing = await auth.supabase.from("facts").select("body");
    if (existing.error) throw new Error(existing.error.message);
    const known = new Set((existing.data ?? []).map((fact) => fact.body));
    const rows = extracted.flatMap((fact) => {
      const marker = extractVerifiedDate(fact.body);
      if (known.has(marker.body)) return [];
      known.add(marker.body);
      return [{ role_context: fact.role_context, category: fact.category, body: marker.body, status: marker.verifiedDate ? "verified" as const : "proposed" as const, verified_at: marker.verifiedDate, source: "seed" as const }];
    });
    if (rows.length) { const write = await auth.supabase.from("facts").insert(rows); if (write.error) throw new Error(write.error.message); }
    await appendSessionCosts(auth.supabase, sessionId, costs);
    return NextResponse.json({ imported: rows.length, skipped: extracted.length - rows.length });
  } catch (error) {
    await appendSessionCosts(auth.supabase, sessionId, costs);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fact import failed" }, { status: 500 });
  }
}
