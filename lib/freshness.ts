import { STALE_SCAN_DAYS } from "@/lib/staleness";

export type FreshnessTier = "hot" | "warm" | "cooling" | "stale";

const HOT_HOURS = 24;
const WARM_HOURS = 72;

export function hoursSinceScan(scannedAt: string | null, now = new Date()): number | null {
  if (!scannedAt) return null;
  const scanned = new Date(scannedAt);
  if (Number.isNaN(scanned.getTime())) return null;
  return (now.getTime() - scanned.getTime()) / (60 * 60 * 1000);
}

export function freshnessTier(scannedAt: string | null, now = new Date()): FreshnessTier {
  const hours = hoursSinceScan(scannedAt, now);
  if (hours === null) return "stale";
  if (hours <= HOT_HOURS) return "hot";
  if (hours <= WARM_HOURS) return "warm";
  if (hours <= STALE_SCAN_DAYS * 24) return "cooling";
  return "stale";
}
