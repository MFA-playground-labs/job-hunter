import { cn } from "@/lib/utils";

export function Score({ score, label = "Fit score", className }: { score: number | null | undefined; label?: string; className?: string }) {
  const value = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const tone = value === null ? "bg-muted text-muted-foreground" : value >= 80 ? "bg-emerald-600/10 text-emerald-800" : value >= 60 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-900";

  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold tabular-nums", tone, className)} aria-label={`${label}: ${value ?? "unavailable"}`}>
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] opacity-75">{label}</span>
      <span>{value ?? "—"}</span>
    </span>
  );
}
