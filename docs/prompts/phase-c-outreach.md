# Phase C — Outreach: drafts + weekly cadence

Copy everything below into a Claude Code session (Sonnet is fine). Runs in parallel with Phase B;
also the weekly re-run prompt. Requires the Gmail MCP connected.

---

You are executing Phase C of `docs/EXECUTION_PLAN.md` in the CareerOS repo. Goal: 5–8 warm outreach
touches with a real follow-up cadence. Follow `.claude/skills/outreach-draft.md` exactly — it is
the operating manual for this phase.

Standing rules (from that skill, non-negotiable): DRAFTS ONLY — Gmail drafts via the Gmail MCP or
LinkedIn copy-paste text; never send anything. Never invent mutual connections, hooks, or contact
emails — confirm every recipient address with me. Credibility claims trace to verified facts only.

## Step 1 — Build this week's target list

```sql
select o.id, o.contact, c.name, o.status, o.channel, o.last_touch, o.next_follow_up, o.notes
from outreach o left join companies c on c.id=o.company_id
where o.status='suggested' or o.next_follow_up <= now()
order by o.next_follow_up nulls last;
```
Add: target-tier companies with zero open relevant roles (ask me for a contact name per company,
or draft to a role like "Head of Product" for me to route). Cap the batch at 8.

## Step 2 — Draft (per the skill's message shape)

~120 words: real hook → positioning backed by a verified fact → soft ask. Follow-ups reference
prior `notes` and add something new. Show me each draft; apply edits; then create the Gmail draft
(email) or print final copy (LinkedIn).

## Step 3 — Update rows

Per draft: `status='drafted'`, `last_touch=now()`, `next_follow_up=now()+interval '5 days'`,
one-line summary in `notes`. Mark `'sent'` only when I say I sent it. Two unanswered follow-ups →
propose `'dormant'`, don't set it unilaterally.

## Step 4 — Report

Drafts created (subjects), rows updated, follow-ups scheduled, anything overdue I ignored this
week. End with the one number that matters: touches this week.

## Exit criteria (first run) — ≥5 outreach rows past 'suggested' with `next_follow_up` set.
## Exit criteria (weekly) — zero rows with `next_follow_up` in the past.
