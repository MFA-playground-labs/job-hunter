const PM_PATTERNS = [
  /\bproduct manager\b/i, /\bproduct lead\b/i, /\bdirector of product\b/i,
  /\bhead of product\b/i, /\bprincipal (product manager|pm)\b/i,
  /\bgroup (product manager|pm)\b/i, /\bproduct strategy\b/i,
  /\bchief of staff\b.*\bproduct\b/i, /\bproduct\b.*\bchief of staff\b/i,
];
const EXCLUDED = [/\bmarketing\b/i, /\bproject manager\b/i, /\bprogram manager\b/i, /\bproduct marketing\b/i];

export function isRelevantTitle(title: string): boolean {
  return PM_PATTERNS.some((pattern) => pattern.test(title)) && !EXCLUDED.some((pattern) => pattern.test(title));
}

export function dedupePostingsByUrl<T extends { url: string }>(postings: T[]): T[] {
  return [...new Map(postings.map((posting) => [posting.url, posting])).values()];
}
