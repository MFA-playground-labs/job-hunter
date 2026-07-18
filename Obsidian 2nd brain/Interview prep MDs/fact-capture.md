# fact-capture.md

Tertiary playbook. Governs how the system reads from and writes to `marc-facts.md`, the durable file-based fact corpus for Marc Agosin. Load this at the start of every session (to read the corpus) and at the end of every session (to emit proposed additions).

The goal: every session leaves the corpus slightly richer. After 5–10 tailoring jobs, the interviewer should rarely need to ask about scope, team size, methods, or outcomes that have already been captured in the file.

This playbook replaces the earlier memory-tool-based approach. We use a project file instead of the `memory_user_edits` tool because:
- The file is deterministic and in-context every session (no async propagation)
- Marc can see, edit, and audit it directly
- No 30-entry cap
- Richer structure (grouped by role, with categories)
- Portable and survives outside Anthropic's memory system

---

## PART 1 — READ PATH: How to use `marc-facts.md` at session start

### 1.1 Treat the file as authoritative for accumulated knowledge
The master resume is the source of truth for what's in print. `marc-facts.md` is the source of truth for everything Marc has confirmed in prior sessions that didn't make it onto the resume (team sizes, specific methods, named artifacts, tradeoffs, gaps, etc.).

### 1.2 Merge `marc-facts.md` into gap analysis
Before deciding which bullets need interviewing, read `marc-facts.md` in full. When mapping the JD against Marc's experience, use BOTH the master resume AND the file. A requirement that looks like a gap in the master resume may already be answered in the file.

### 1.3 Respect the Explicit Gaps section
If `marc-facts.md` lists a gap that matches a JD requirement, do not attempt to reframe it. Flag it as a cover-letter opportunity and move on.

### 1.4 Do not re-ask what the file already answers
If an interview question is about to probe a fact already recorded in the file, skip it. Only ask if the JD needs a more specific slice than what's captured.

---

## PART 2 — WRITE PATH: What to save to `marc-facts.md`

Save **atomic, reusable, verified facts**. Not narrative, not opinions, not bullet drafts.

### 2.1 High-value fact categories

- **Role scope facts.** Team size, reporting structure, customer base, ARR, product scope, stakeholders.
  - Example: `ADP embedded products team: 8 eng, 1 designer, Marc as sole PM`
  - Example: `ADP embedded product ARR at start of tenure: ~$40M`

- **Methodology facts.** Specific methods with context.
  - Example: `Used RAG-over-Jira for discovery synthesis at ADP`
  - Example: `400+ hours of executive interviews at EY-Parthenon across ~15 engagements`

- **Outcome facts.** Verified metrics with attribution and time window.
  - Example: `ADP digital sales plan beat by 25%, FY25 Q1–Q3, Marc owned PLG strategy`

- **Artifact facts.** Specific documents, frameworks, or systems Marc built or named.
  - Example: `Built product operating model from zero at Accenture ACA, covering 100+ FTE eng`
  - Example: `ADP in-product upsell triggers: [specific surfaces/events when Marc names them]`

- **Tradeoff / judgment facts.** Decisions that show PM judgment.
  - Example: `Overturned tablet-first hypothesis at ADP using behavioral analytics, reprioritized roadmap`

- **Domain / vertical facts.** Industries, segments, customer types.
  - Example: `EY-Parthenon AdTech engagement: CTV programmatic, ~$300M transaction, Marc led product workstream`

- **Gap facts.** Things Marc explicitly does NOT have.
  - Example: `Gap: No customer-facing AI/ML shipping experience. AI work is PM-tooling native.`
  - Example: `Gap: No direct headcount management. 5 Accenture direct reports were matrix/project-based.`

### 2.2 What NOT to save

- **Draft bullets.** Those live in chat, not in the fact file. Bullets are derivatives of facts.
- **JD-specific framing.** "Marc is a great fit for growth PM" is not a fact; it depends on the JD.
- **Numbers Marc could not confirm.** If he said "maybe 30%, not sure," do not save 30%.
- **Sensitive or HR-adjacent info.** Comp, performance reviews, manager conflicts, reasons for leaving.
- **Redundant restatements.** If a fact is already in the file, don't add a slightly rephrased duplicate.
- **Inferred or extrapolated facts.** Only save what Marc explicitly confirmed.

---

## PART 3 — HOW TO WRITE (the actual mechanics)

### 3.1 End-of-session output format
At the end of every session, emit a clearly labeled block Marc can copy into `marc-facts.md`. The block must be structured so Marc can paste additions into the correct section of the file with minimal friction.

Format:

```
FACT CAPTURE — SESSION END

Target file: marc-facts.md

Proposed additions:

### To ROLE 1 — ADP / [subsection]
- [new atomic fact]

### To ROLE 2 — EY-Parthenon / [subsection]
- [new atomic fact]

### To CROSS-CUTTING FACTS / [subsection]
- [new atomic fact]

### To EXPLICIT GAPS
- [new gap fact]

Proposed replacements (fact was corrected or made more specific):
- Section: [section name]
  OLD: [prior version]
  NEW: [updated version]
  Reason: [what changed]

Facts considered but NOT proposed (and why):
- [fact] — reason: [uncertain, redundant, out of scope]

Notes for Marc:
- [any flags, e.g., "this fact overlaps with an existing entry; consider consolidating"]
- [e.g., "file is getting long in the ADP Methods section; consider consolidating similar entries"]
```

### 3.2 Phrasing rules for entries
- Each entry is a single line, one fact
- Start with the role or subject implicit from the section it goes into
- Concrete numbers and proper nouns
- Past tense for completed work, present tense for ongoing
- No hedging language ("I think," "probably") — if uncertain, don't propose the fact
- Tildes for approximations are fine (matches Marc's voice)
- Optional: `[verified: YYYY-MM-DD]` tag for facts that may need re-confirmation later

### 3.3 Offer to regenerate the full file
At the end of high-yield sessions (lots of new facts, or facts that cross several sections), offer to regenerate the full `marc-facts.md` with the additions integrated, so Marc can download it and replace the project file in one step rather than hand-editing.

Do not regenerate by default — only when asked or when the number of additions is large enough that hand-editing would be error-prone (roughly 5+ additions across 3+ sections).

### 3.4 Respect Marc's veto
If Marc says "don't save that" or "forget what I said about X," do not include it in the fact capture block. If it already made it into the file in a prior session, propose a replacement that removes it.

---

## PART 4 — CONSOLIDATION

Over time, the file will grow. Periodically (every ~10 sessions or when a section gets dense), propose consolidation:

- Merge related facts into denser single entries where possible
- Remove any fact that has since been contradicted and not replaced
- Flag sections that are thin even after many sessions — those may be areas Marc genuinely has less to say about, or areas worth a proactive interview

Consolidation proposals should be surfaced to Marc as an optional side task, not forced.

---

## PART 5 — RECURSION GOAL

The system should get measurably better over time. Signals of success:

- **Interview turns decrease.** Session 1 might need 6-question interviews on 3 bullets. Session 5 should need 2–3 questions on 1 bullet.
- **Gray space shrinks.** Fewer bullets flagged as "needs more detail" because the fact file already covers them.
- **Cross-session consistency.** The same scope numbers appear across different tailored resumes.
- **Explicit Gaps list grows.** The system learns what Marc doesn't have and stops trying to reframe those gaps.

If after 5+ sessions the interview turns are NOT decreasing, audit the fact file. Most likely: facts weren't being captured in reusable form, or the read path isn't being honored at session start.

---

## PART 6 — HARD RULES

- Never propose a fact Marc did not explicitly confirm
- Never propose draft bullets as facts
- Never propose JD-specific opinions as facts
- Never propose sensitive info (comp, performance, HR)
- Always surface the fact capture block at end of session, even if the block is empty ("No new facts this session")
- Always respect "don't save that" from Marc
- Never edit `marc-facts.md` silently — Marc owns the file; the system only proposes additions
