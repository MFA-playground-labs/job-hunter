export const STALE_SCAN_DAYS = 14;

export function isStaleScan(scannedAt: string | null, now = new Date()): boolean {
  if (!scannedAt) return false;
  const scanned = new Date(scannedAt);
  if (Number.isNaN(scanned.getTime())) return false;
  return now.getTime() - scanned.getTime() > STALE_SCAN_DAYS * 24 * 60 * 60 * 1000;
}
