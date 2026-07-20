---
name: outreach-draft
description: Draft referral/intro outreach messages (Gmail drafts or LinkedIn copy) for target companies from Marc's verified facts, and keep the outreach table's cadence fields current. Use when Marc asks to "draft outreach", work a zero-openings target company, follow up with a contact, or turn a 'suggested' outreach row into a real message. Drafts only — never sends.
---

# Outreach drafting (subscription-based)

Same skills-first pattern as `scan-jobs.md` / `tailor-resume.md`: reasoning in-session, writes via
the `supabase` MCP server, email drafting via the connected Gmail MCP. For Director-level searches
warm outreach converts better than cold applies — this skill is the engine behind the `/outreach`
page.

## Hard rules

- **Draft, never send.** Email goes through `mcp__claude_ai_Gmail__create_draft` only. Marc reviews
  and sends from Gmail himself. LinkedIn messages are produced as copy-paste text (no LinkedIn
  automation exists or should be added).
- **Only verified facts.** Credibility claims in a message must trace to verified `facts` rows or
  the master resume. Never invent mutual connections, shared history, or interest signals. If Marc
  names a contact relationship ("former colleague"), take his word in-session and propose it as a
  `status='proposed'` fact for the Inbox.
- **No fabricated personalization.** Company-specific hooks must come from real sources: the
  `companies` row (`fit_rationale`, `funding_stage`, sector), `jobs`/`funding_events` rows, or a
  web search of public material. Cite the hook's source to Marc when presenting the draft.

## Steps

1. **Pick targets.** Via `mcp__supabase__execute_sql`, load candidates in priority order:
   - `status='suggested'` outreach rows (zero-openings signal from scans);
   - rows with `next_follow_up <= now()` (overdue follow-ups — check `status` and prior `notes`);
   - or the company/contact Marc named.
2. **Load context** (batched): the company row, any open jobs + scores there, verified facts +
   gaps, and `select body from playbooks where slug in ('linkedin-outreach','outreach')` (follow it
   if present, else use the built-in approach below).
3. **Draft.** Default shape for cold/warm intro (~120 words max, email or LinkedIn):
   one-line specific hook (why this company, from a real source) → one-line positioning (Marc's
   archetype backed by a verified fact) → soft ask (15-min conversation / who owns PM hiring),
   never "please refer me" on first touch. Follow-ups reference the prior touch from `notes` and
   add one new piece of value or context; two unanswered follow-ups → propose `status='dormant'`.
4. **Review with Marc**, then for email: `mcp__claude_ai_Gmail__create_draft` (confirm recipient
   address with Marc — never guess emails). For LinkedIn: print final copy for pasting.
5. **Update the row** (or insert one if none exists):
   ```sql
   update outreach set status='drafted', notes = $notes, last_touch = now(),
     next_follow_up = now() + interval '5 days', updated_at = now()
   where id = $id;
   ```
   `status` moves to `'sent'` only when Marc says he sent it (or a later session finds the sent
   mail in Gmail). Record in `notes` a one-line summary of the message and where the draft lives.
   Cadence default: first follow-up +5 business days, second +7; adjust if Marc says otherwise.
6. **Report**: drafts created (with Gmail draft subjects), rows updated, and any follow-ups now
   scheduled — plus what's still overdue.

## What this skill does NOT do

- Never sends email, connects on LinkedIn, or messages anyone.
- Never promotes companies between tiers (Companies page decision).
- Does not touch `sessions`/`model_costs`.
