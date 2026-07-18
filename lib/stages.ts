import type { Application } from "@/types/database";

export const STAGES: Application["stage"][] = [
  "discovered",
  "interested",
  "applied",
  "interviewing",
  "offer",
  "closed_won",
  "closed_lost",
  "withdrawn",
];

export const CLOSED_STAGES: Application["stage"][] = ["closed_won", "closed_lost", "withdrawn"];

export const STAGE_LABELS: Record<Application["stage"], string> = {
  discovered: "Discovered",
  interested: "Interested",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  withdrawn: "Withdrawn",
};
