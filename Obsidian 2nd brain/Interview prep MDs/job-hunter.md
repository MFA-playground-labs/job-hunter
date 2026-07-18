# job-hunter.md

Market-scan playbook. Sibling to `career-coach.md` but operates at the sourcing layer: career-coach decides what Marc should be aiming for, job-hunter goes and finds what's actually open right now that fits. Feeds candidates upward into `career-coach.md` (BATNA Build, Type 2 comparisons) and downward into `resume-tailoring.md` once a target is picked.

---

## WHEN YOU ARE INVOKED

- Marc asks for a job scan, market scan, "what's out there," or a BATNA refresh
- Marc names a specific sector or company set and wants current openings
- Marc explicitly names this playbook

If Marc just wants intel on ONE company/role he already found, that's not this playbook — that's a quick search + handoff to career-coach Type 1. This playbook is for breadth: scanning many companies/roles at once.

---

## INPUTS

Load at session start:

1. **`marc-facts.md`** — Cross-Cutting Facts (domain exposure, AI-native positioning) for relevance scoring.
2. **`career-coach.md` BATNA section / recent sessions** — Tier 1/2/3 target companies. Use `conversation_search` if the target list isn't current in context (e.g., "the BATNA list we built last time").
3. **Calibration dials** — asked fresh every session (see below). Do not assume prior answers carry over.
4. **Feedback summary from a prior HTML output**, if Marc pastes one in. This is the closest thing to persistent memory the system has — treat it as session input, fold into target list adjustments and into `marc-facts.md` proposals at session end.

---

## STEP 1 — CALIBRATION (every session)

Before searching anything, run a short calibration. Use `ask_user_input_v0` where possible — this is exactly the elicitation case it's built for.

Dimensions to calibrate:

- **Total comp floor** — a number Marc won't go below (cash + realistic equity). If he gives a range, use the low end as the floor for scoring.
- **Salary (base) floor** — separate from total comp; some roles are equity-heavy and Marc may want a base floor regardless.
- **Brand weight** — how much does company prestige/logo value matter for this scan? (low / medium / high)
- **Exit-opportunity weight** — how much does "what does this role position me for next" matter vs. the role itself? (low / medium / high)

Ask these as 1–3 quick questions (rank_priorities for brand vs. exit-ops vs. comp vs. role-content works well; floors as direct numeric asks in chat, not buttons).

**Do not skip this even if Marc seems to be repeating a prior session's answers verbatim.** Per his instruction, dials reset every time — re-ask. If he says "same as last time," ask him to restate the numbers/weights so they're explicit in this session's context (don't pull from memory or a prior chat).

---

## STEP 2 — SCOPE THE RUN

Every run is a bounded batch, not an open-ended crawl. Before searching, tell Marc the plan in 2–3 lines:

- Which companies from the target list are in scope this run (suggest 5–8 max for a target pass)
- Whether a broad sector sweep is included this run, and which sector(s)
- Estimated tool-call count

If the combined scope would push past ~20 search/fetch calls, cut it down and propose a second run rather than degrading quality. Two focused runs beat one shallow one.

---

## STEP 3 — TARGET PASS (BATNA companies)

For each in-scope target company:

1. **Try ATS API endpoints first** (faster, structured, less likely to break):
   - Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{company-slug}/jobs`
   - Ashby: `https://api.ashbyhq.com/posting-api/job-board/{company-slug}`
   - Lever: `https://api.lever.co/v0/postings/{company-slug}`
   - Slug guessing: try the obvious lowercase/hyphenated company name first; if it 404s, one web_search to find the correct board/slug, then retry.

2. **Fall back to web_search + career page fetch** if no ATS API responds. One search ("{company} careers product manager"), one fetch of the careers page.

3. **Target: 5+ PM/product/strategy-adjacent roles per company where they exist.** If a company has fewer than 5 open roles total, list what's there — don't pad. If a company has zero relevant roles, say so explicitly (this is itself a signal — hiring freeze, etc.).

4. **Capture per role:** title, location (flag remote vs. NYC/in-office — relevant given Marc's stated remote-first preference vs. revealed NYC-tolerance), level signal (Senior/Staff/Director/etc.), and a one-line read on fit.

---

## STEP 4 — BROAD SECTOR PASS

If in scope for this run:

- Pick 1–2 sectors per Marc's current trajectory (AI agent products, fintech/embedded, web3 — per `career-coach.md` calibration notes)
- Search for roles at companies NOT already on the target list (the point is discovery, not re-confirming known targets)
- Looser bar than the target pass — surface candidates, don't require 5 per company
- Flag any company that looks like it should graduate to the BATNA target list (well-funded, Series B+, role fit is strong) — note this for the career-coach handoff

---

## STEP 5 — SCORING

For every role surfaced (target pass + broad pass), score against the session's calibration:

- **Comp fit** — does the role's posted/estimated range clear the total comp and salary floors? If no range posted, search Levels.fyi/Glassdoor for the company+level and note it's an estimate.
- **Brand score** — weight per this session's dial. Use funding stage, market position, name recognition as inputs.
- **Exit-opportunity score** — weight per this session's dial. What does 2 years in this role + company set up?
- **Role-content fit** — independent of the dials: does the role itself match Marc's target band (Senior PM / GTM / growth, AI-native wedge relevant)? This is always scored regardless of dial weights — a perfect-comp role that's the wrong job is still a bad match.

Produce a single composite score per role for sorting, but keep the component scores visible in the output — Marc should be able to see *why* something ranked where it did, not just the number.

---

## STEP 6 — OUTPUT

### Chat summary (always)
- 3–5 sentence overview: how many companies/roles scanned, top 3–5 picks by composite score, anything notable (a target company with zero openings, a new company worth adding to BATNA, a sector that's gone quiet)
- Link to the HTML artifact

### HTML artifact (the scan report)

Build as a single-file HTML artifact (see `frontend-design` skill for styling before building). Requirements:

- **Grouped by company**, companies grouped by tier (Target Tier 1 / Target Tier 2 / Broad sweep)
- **Role cards** showing: title, company, location, level, composite score, component score breakdown (comp/brand/exit/content), one-line fit read, and a link to the actual posting
- **Feedback controls per card:**
  - Interested / Pass toggle
  - If Pass: reason tag — multi-select from: `comp too low`, `brand mismatch`, `wrong scope/level`, `location/remote mismatch`, `domain mismatch`, `other` (free text)
  - If Interested: optional note field (free text)
- **No browser storage** — all state lives in React/JS memory for the session. Before Marc closes the artifact, he needs to copy the summary.
- **Summary export block** at the bottom: a "Copy summary" button that generates a compact text block of all Interested roles (with notes) and all Pass roles (with reason tags), formatted for Marc to paste back into the next chat session.

Example export format the button should generate:
```
JOB SCAN FEEDBACK — [date]

INTERESTED:
- [Company] — [Role title] — note: [Marc's note, if any]
- ...

PASS:
- [Company] — [Role title] — reason: [tag(s)]
- ...
```

---

## STEP 7 — FEEDBACK INTEGRATION (when Marc pastes a prior export)

If Marc pastes a summary export from a previous scan's HTML output at the start of a session:

1. **Pass reasons feed scoring adjustments for this run** — e.g., repeated `comp too low` on a company/tier suggests raising the floor or deprioritizing that tier; repeated `domain mismatch` on a sector suggests narrowing the broad-pass sector choice.
2. **Interested roles with notes** — if a note suggests Marc wants to pursue it, flag for handoff to `resume-tailoring.md` or `career-coach.md` Type 1 (single opportunity evaluation), don't just file it.
3. **Patterns across multiple pasted exports** (if Marc has run this a few times) — this is where stated-vs-revealed (career-coach Framework G) gets real data. If Marc says "brand matters a lot" but consistently marks high-brand/low-content roles as Pass with `wrong scope` reasons, surface that.
4. **Durable patterns → propose for `marc-facts.md`** at session end (e.g., "Marc has passed on 3 consecutive in-office NYC roles citing location — confirm this is now a hard constraint, not just dial input?").

---

## INTEGRATION WITH OTHER PLAYBOOKS

- **`career-coach.md`** — the target list (BATNA Tier 1/2/3) comes from here. New companies discovered in the broad pass that look strong should be proposed back to career-coach for BATNA list updates, not silently added.
- **`resume-tailoring.md`** — when Marc flags a role as Interested with intent to pursue, hand off the JD to tailoring. Don't tailor inside this playbook.
- **`linkedin-outreach.md`** — if a target company has zero open roles but is high-interest, that's a signal to shift from "apply" to "network in" — flag for outreach rather than treating as a dead end.
- **`fact-capture.md`** — durable preference patterns (location constraints, comp floors that recur identically across sessions, sectors Marc keeps deprioritizing) get proposed as facts at session end, same format as other playbooks.

---

## HARD RULES

- **Never fabricate a job posting.** Every role in the output must come from an actual search/fetch result with a real link. If a company's board returns nothing, say "0 open roles found" — don't generate plausible-sounding placeholder roles.
- **Postings are perishable.** Note the scan date in the HTML output. If Marc runs this again in 2+ weeks, treat it as a fresh scan, not an update — postings disappear and reappear.
- **Comp estimates must be labeled as estimates** when not from the posting itself (Levels.fyi/Glassdoor-derived). Never present an estimate as a confirmed range.
- **Respect the scope budget from Step 2.** Running long is worse than running narrow — narrow scans can be repeated; a scan that times out or degrades produces nothing usable.
- **Dials reset every session.** Do not silently reuse a previous session's calibration even if it's visible in context — re-ask per Step 1.
- **5+ roles per company is a target, not a requirement.** Companies with genuinely fewer open roles get listed as-is. Padding with irrelevant roles (e.g., listing a Sales role to hit a count on a PM-focused scan) is worse than an honest short list.

---

## WHAT NOT TO DO

- Do not run this playbook for a single-company check — that's a quick search, not a scan.
- Do not skip calibration because "Marc probably wants the same as last time" — ask.
- Do not build the HTML artifact before scoring is complete; the artifact should be the final step, built once with finished data.
- Do not propose BATNA list changes directly — surface discoveries and let career-coach (or Marc directly) decide.
- Do not treat a pasted feedback export as automatically actionable for tailoring — flag interested roles for Marc's confirmation before handing off to tailoring.
