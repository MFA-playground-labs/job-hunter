import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createAnthropicClient, TAILORING_MODEL } from "@/lib/anthropic";

// TODO(playbook): resume-tailoring.md hasn't been dropped into /docs/ yet, so
// this is a placeholder system prompt, not the real tailoring logic. Swap this
// out for the actual playbook content verbatim once it's available — see
// docs/README.md. Do not hand-write tailoring rules here in the meantime.
const STUB_SYSTEM_PROMPT = `You are a resume tailoring assistant. Given a job description and a set
of candidate facts, propose a tailored resume. (Placeholder system prompt —
the real resume-tailoring.md playbook has not been provided yet.)`;

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
  if (!role_id || typeof role_id !== "string") {
    return NextResponse.json({ error: "role_id is required" }, { status: 400 });
  }

  // RLS scopes this to the authenticated user's own rows — a role_id
  // belonging to someone else simply won't be found.
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, title, jd_text, company_id, companies(name)")
    .eq("id", role_id)
    .single();

  if (roleError || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const { data: facts } = await supabase
    .from("facts")
    .select("category, subject_role, fact_text, verified_date")
    .order("subject_role", { ascending: true });

  const anthropic = createAnthropicClient();

  const factsBlock =
    facts && facts.length > 0
      ? facts
          .map((f) => `[${f.category}/${f.subject_role ?? "cross-cutting"}] ${f.fact_text}`)
          .join("\n")
      : "(no facts in the database yet — facts-migrator has nothing to migrate until marc-facts.md is provided)";

  const userPrompt = `Job title: ${role.title}
Job description:
${role.jd_text ?? "(no JD text stored for this role yet)"}

Candidate facts:
${factsBlock}`;

  const completion = await anthropic.messages.create({
    model: TAILORING_MODEL,
    max_tokens: 4096,
    system: STUB_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = completion.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const { data: resumeVersion, error: insertError } = await supabase
    .from("resume_versions")
    .insert({
      role_id,
      content,
      tailoring_notes:
        "Generated with a placeholder system prompt — resume-tailoring.md not yet provided.",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // TODO(playbook): fact-capture.md's "FACT CAPTURE — SESSION END" block is
  // what should drive writing newly-surfaced facts back to the `facts` table
  // here. Not implemented — no fact extraction logic is fabricated in its
  // place. Wire this up once fact-capture.md is available.

  return NextResponse.json({
    resume_version: resumeVersion,
    stubbed: true,
    stub_reason:
      "resume-tailoring.md not found in /docs/ — used a placeholder system prompt instead of the real playbook.",
  });
}
