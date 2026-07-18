import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { loadPlaybookFiles } from "@/lib/playbooks";

export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { loaded, missing } = loadPlaybookFiles();
  let imported = 0;
  let skipped = 0;
  for (const playbook of loaded) {
    const existing = await auth.supabase.from("playbooks").select("id, content_hash").eq("slug", playbook.slug).maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    if (existing.data?.content_hash === playbook.content_hash) { skipped += 1; continue; }
    const { filename: _filename, ...row } = playbook;
    const write = await auth.supabase.from("playbooks").upsert(row, { onConflict: "owner_id,slug" });
    if (write.error) return NextResponse.json({ error: write.error.message }, { status: 500 });
    imported += 1;
  }
  return NextResponse.json({ imported, skipped, missing });
}
