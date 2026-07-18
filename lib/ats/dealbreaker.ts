const DOMAIN_PATTERNS: Record<string, RegExp> = {
  gambling: /\b(gambling|casino|sportsbook|sports betting|igaming|slot machines?)\b/i,
  defense: /\b(defense contractor|weapons? system|munitions|military-industrial|aerospace and defense|DoD prime)\b/i,
};

export function isExcludedByDealbreaker(jdText: string | null, excludedDomains: string[]): boolean {
  if (!jdText || !excludedDomains.length) return false;
  return excludedDomains.some((domain) => DOMAIN_PATTERNS[domain]?.test(jdText) ?? false);
}
