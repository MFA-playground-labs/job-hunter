import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createAnthropicClient, TAILORING_MODEL } from "@/lib/anthropic";

// TODO(playbook): interviewer.md hasn't been provided yet — this is a
// placeholder system prompt, not the real interview logic.
const STUB_SYSTEM_PROMPT = `You are conducting a structured interview to surface facts about the
candidate's experience for a specific role. Ask one question at a time.
(Placeholder system prompt — the real interviewer.md playbook has not been
provided yet.)`;

interface TurnInput {
  role: "user" | "assistant";
  content: string;
}

// This flow is inherently multi-turn, but the Phase 1 schema (by design —
// see db-schema-architect.md) has no interview_sessions/messages table to
// persist conversation state server-side. Rather than invent a new table
// outside that scope, this route is stateless: the caller resends the full
// transcript each turn, scoped to a role_id so state never leaks across
// roles. Flagging this as a good candidate for a follow-up schema migration
// (an interview_sessions table) once real usage patterns are clearer.
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured (.env.local)" }, { status: 503 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const role_id = body?.role_id;
  const transcript: TurnInput[] = Array.isArray(body?.transcript) ? body.transcript : [];

  if (!role_id || typeof role_id !== "string") {
    return NextResponse.json({ error: "role_id is required" }, { status: 400 });
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, title, jd_text")
    .eq("id", role_id)
    .single();

  if (roleError || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const anthropic = createAnthropicClient();

  const completion = await anthropic.messages.create({
    model: TAILORING_MODEL,
    max_tokens: 1024,
    system: `${STUB_SYSTEM_PROMPT}\n\nRole context — title: ${role.title}. JD: ${role.jd_text ?? "(none stored)"}.`,
    messages:
      transcript.length > 0
        ? transcript.map((t) => ({ role: t.role, content: t.content }))
        : [{ role: "user", content: "Begin the interview." }],
  });

  const reply = completion.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // TODO(playbook): once fact-capture.md is available, run its "FACT
  // CAPTURE — SESSION END" logic here to write surfaced facts back to the
  // `facts` table when the caller signals the interview is complete.

  return NextResponse.json({
    reply,
    transcript: [...transcript, { role: "assistant", content: reply }],
    stubbed: true,
    stub_reason:
      "interviewer.md not found in /docs/ — used a placeholder system prompt, and interview state is stateless/client-resent pending a possible interview_sessions table.",
  });
}
