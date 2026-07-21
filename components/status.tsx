import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-primary/15 bg-primary/10 text-primary",
  success: "border-emerald-600/15 bg-emerald-600/10 text-emerald-800",
  warning: "border-amber-600/15 bg-amber-500/10 text-amber-900",
  danger: "border-destructive/15 bg-destructive/10 text-destructive",
};

export function Status({ children, tone = "neutral", className }: { children: ReactNode; tone?: StatusTone; className?: string }) {
  return <Badge variant="outline" className={cn("border", toneClasses[tone], className)}>{children}</Badge>;
}

export function Freshness({ label, stale = false, className }: { label: string; stale?: boolean; className?: string }) {
  return <Status tone={stale ? "warning" : "neutral"} className={className}>{label}</Status>;
}
