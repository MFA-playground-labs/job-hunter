import { describe, expect, it } from "vitest";
import {
  decideImport,
  normalizeJobNote,
  parseFrontmatter,
  type NormalizedInboxJob,
} from "@/lib/obsidian-job-inbox";

function note(fm: Record<string, string | boolean>, body = "Build agentic products.\nOwn the roadmap."): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function omit(fm: Record<string, string | boolean>, ...keys: string[]): Record<string, string | boolean> {
  const clone = { ...fm };
  for (const key of keys) delete clone[key];
  return clone;
}

const validFm = {
  careeros_managed: true,
  posting_id: "greenhouse:abc123",
  url: "https://boards.greenhouse.io/acme/jobs/123",
  source: "greenhouse",
  company: "Acme AI",
  role: "Staff Product Manager",
  location: "Remote",
  status: "inbox",
};

describe("normalizeJobNote — happy path", () => {
  it("normalizes a valid managed note and keeps the body as the snapshot", () => {
    const result = normalizeJobNote(note(validFm));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      posting_id: "greenhouse:abc123",
      url: "https://boards.greenhouse.io/acme/jobs/123",
      source: "greenhouse",
      company: "Acme AI",
      role: "Staff Product Manager",
      location: "Remote",
    });
    expect(result.job.jd_text).toContain("Build agentic products.");
    expect(result.job.content_hash).toHaveLength(64);
  });

  it("derives a stable posting_id from the url when cowork omits it", () => {
    const withoutId = omit(validFm, "posting_id");
    const a = normalizeJobNote(note(withoutId));
    const b = normalizeJobNote(note(withoutId));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.job.posting_id).toBe(b.job.posting_id); // deterministic
    expect(a.job.posting_id.startsWith("greenhouse:")).toBe(true);
  });

  it("defaults source to cowork and reflects it in a derived posting_id", () => {
    const bare = omit(validFm, "posting_id", "source");
    const result = normalizeJobNote(note(bare));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.source).toBe("cowork");
    expect(result.job.posting_id.startsWith("cowork:")).toBe(true);
  });
});

describe("normalizeJobNote — comp estimate labeling", () => {
  it("treats an est: prefix as an estimate and strips it", () => {
    const result = normalizeJobNote(note({ ...validFm, comp: "est: $220k–$260k" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.comp_is_estimate).toBe(true);
    expect(result.job.comp_range).toBe("$220k–$260k");
  });

  it("treats a plain comp string as a listed (non-estimate) range", () => {
    const result = normalizeJobNote(note({ ...validFm, comp: "$220k–$260k" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.comp_is_estimate).toBe(false);
    expect(result.job.comp_range).toBe("$220k–$260k");
  });

  it("defaults a missing comp to an estimate with no range", () => {
    const result = normalizeJobNote(note(validFm));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.comp_range).toBeNull();
    expect(result.job.comp_is_estimate).toBe(true);
  });
});

describe("normalizeJobNote — quarantine rules (DEC-005′)", () => {
  it("quarantines a note with no url", () => {
    const noUrl = omit(validFm, "url");
    const result = normalizeJobNote(note(noUrl));
    expect(result).toMatchObject({ ok: false, reason: "missing_url" });
  });

  it("quarantines a note with a non-resolvable url", () => {
    const result = normalizeJobNote(note({ ...validFm, url: "see the careers page" }));
    expect(result).toMatchObject({ ok: false, reason: "missing_url" });
  });

  it("rejects a note that is not careeros_managed", () => {
    const unmanaged = omit(validFm, "careeros_managed");
    const result = normalizeJobNote(note(unmanaged));
    expect(result).toMatchObject({ ok: false, reason: "not_managed" });
  });

  it("rejects a managed note missing company or role", () => {
    const noCompany = omit(validFm, "company");
    expect(normalizeJobNote(note(noCompany))).toMatchObject({ ok: false, reason: "missing_required" });
    const noRole = omit(validFm, "role");
    expect(normalizeJobNote(note(noRole))).toMatchObject({ ok: false, reason: "missing_required" });
  });
});

describe("content_hash — change detection", () => {
  it("is stable for the same body and changes when the body changes", () => {
    const a = normalizeJobNote(note(validFm, "Same body."));
    const b = normalizeJobNote(note(validFm, "Same body."));
    const c = normalizeJobNote(note(validFm, "Different body — reposted with new scope."));
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(a.job.content_hash).toBe(b.job.content_hash);
    expect(a.job.content_hash).not.toBe(c.job.content_hash);
  });
});

describe("decideImport — idempotency", () => {
  const job = { content_hash: "hash-v1" } as NormalizedInboxJob;

  it("inserts when there is no existing row", () => {
    expect(decideImport(null, job)).toEqual({ type: "insert" });
  });

  it("touches (no rescore) when the content is unchanged", () => {
    expect(decideImport({ content_hash: "hash-v1" }, job)).toEqual({ type: "touch" });
  });

  it("updates when the content hash differs", () => {
    expect(decideImport({ content_hash: "hash-v0" }, job)).toEqual({ type: "update" });
  });
});

describe("parseFrontmatter", () => {
  it("keeps colons in values (urls) intact", () => {
    const { frontmatter } = parseFrontmatter(note(validFm));
    expect(frontmatter.url).toBe("https://boards.greenhouse.io/acme/jobs/123");
    expect(frontmatter.careeros_managed).toBe(true);
  });
});
