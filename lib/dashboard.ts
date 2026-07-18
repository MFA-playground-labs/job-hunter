import { CLOSED_STAGES, STAGES } from "@/lib/stages";
import type { ApplicationWithRole } from "@/lib/pipeline-types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeDashboardData(applications: ApplicationWithRole[]) {
  const now = Date.now();
  const weekFromNow = now + 7 * DAY_MS;
  const tenDaysAgo = now - 10 * DAY_MS;

  const dueThisWeek = applications
    .filter((a) => !CLOSED_STAGES.includes(a.stage) && a.next_action_date)
    .filter((a) => new Date(a.next_action_date!).getTime() <= weekFromNow)
    .sort(
      (a, b) => new Date(a.next_action_date!).getTime() - new Date(b.next_action_date!).getTime(),
    );

  const stale = applications
    .filter((a) => !CLOSED_STAGES.includes(a.stage))
    .filter((a) => new Date(a.updated_at).getTime() < tenDaysAgo)
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());

  const funnel = STAGES.map((stage) => ({
    stage,
    count: applications.filter((a) => a.stage === stage).length,
  }));

  return { dueThisWeek, stale, funnel };
}
