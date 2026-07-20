# Phase B — Funnel: triage → tailor → apply

Copy everything below into a Claude Code session (Sonnet is fine). Requires Phase A complete
(verified facts + master resume exist — check first, stop and say so if not).

---

You are executing Phase B of `docs/EXECUTION_PLAN.md` in the CareerOS repo. Goal: move scored jobs
through triage into submitted applications. Target: 3–5 applications, submitted within 48h of triage.

Standing rules: never fabricate postings/facts/comp; tailored resumes use only verified facts and
the master resume; never submit anything for me; re-check DB counts before bulk writes (shared DB).

## Step 1 — State check

```sql
select (select count(*) from jobs where status='new') as untriaged,
       (select count(*) from jobs where status='interested') as interested,
       (select count(*) from facts where status='verified') as facts,
       (select count(*) from resumes where master=true) as master;
```
If facts=0 or master=0 → stop, tell me to run `docs/prompts/phase-a-fuel.md`.

## Step 2 — [MARC] Triage

If untriaged > 0: give me the ranked list (title, company, composite, one-line rationale, URL) and
send me to `/jobs` to mark Interested / Pass **with pass reasons** on every row. Pass reasons are
training data — push back if I skip them. Wait until I say triage is done.

## Step 3 — Re-score Interested jobs (facts now exist)

Original scores were made with no facts corpus (low confidence, flagged in rationales). For jobs
now `status='interested'`, re-run scoring per the scoring step of `.claude/skills/scan-jobs.md`
(inline reasoning, same calibration, insert new `job_scores` rows — never overwrite old ones).
Flag any job whose composite dropped ≥10 points so I can reconsider.

## Step 4 — Tailor the top 3–5

For each top Interested job, follow `.claude/skills/tailor-resume.md` exactly (verified facts only,
`ats_keyword_report` honest about unmatched keywords, review the diff with me before writing the
`resumes` row).

## Step 5 — [MARC] Submit + log

I submit each application at the real posting URL. After I confirm each one, create the
`applications` row (job_id, resume_id, `applied_at=now()`) and set the job `status='applied'`.
Never create an applications row before I confirm submission.

## Exit criteria (verify and report)

- ≥3 rows in `applications`, each linked to a tailored resume
- zero jobs left in `status='new'`
- dashboard funnel tile shows the applications
