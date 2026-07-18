import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createAnthropicClient, TAILORING_MODEL } from "@/lib/anthropic";

// TODO(playbook): resume-teardown.md hasn't been provided yet, so the real
// four-stage critique format from that playbook can't be reproduced here.
// This stub asks for a generic critique instead — swap in the real playbook
// content verbatim (system prompt only) once it's available in /docs/.
const STUB_SYSTEM_PROMPT = `You are a resume critique assistant. Given a resume and the job
description it was tailored for, critique it. (Placeholder system prompt —
the real resume-teardown.md playbook, including its four-stage output
format, has not been provided yet.)`;

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
  const resume_version_id = body?.resume_version_id;
  const role_id = body?.role_id;
  if (!resume_version_id || !role_id) {
    return NextResponse.json(
      { error: "resume_version_id and role_id are required" },
      { status: 400 },
    );
  }

  const [{ data: resumeVersion, error: rvError }, { data: role, error: roleError }] =
    await Promise.all([
      supabase.from("resume_versions").select("id, content, role_id").eq("id", resume_version_id).single(),
      supabase.from("roles").select("id, title, jd_text").eq("id", role_id).single(),
    ]);

  if (rvError || !resumeVersion) {
    return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
  }
  if (roleError || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (resumeVersion.role_id !== role_id) {
    return NextResponse.json(
      { error: "resume_version_id does not belong to role_id" },
      { status: 400 },
    );
  }

  const anthropic = createAnthropicClient();

  const userPrompt = `Job title: ${role.title}
Job description:
${role.jd_text ?? "(no JD text stored for this role yet)"}

Resume to critique:
${resumeVersion.content ?? "(empty resume content)"}`;

  const completion = await anthropic.messages.create({
    model: TAILORING_MODEL,
    max_tokens: 4096,
    system: STUB_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const critique_raw = completion.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return NextResponse.json({
    // `stages` mirrors the four-stage structured output resume-teardown.md
    // is supposed to produce. Left null rather than guessed at — populate
    // this once the real playbook defines the actual stage names/shape.
    stages: null,
    critique_raw,
    stubbed: true,
    stub_reason:
      "resume-teardown.md not found in /docs/ — used a placeholder system prompt and returned raw critique text instead of the real four-stage structure.",
  });
}
