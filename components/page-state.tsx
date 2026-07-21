import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

type StateKind = "empty" | "error" | "setup" | "loading";

const stateIcon = { empty: Inbox, error: AlertCircle, setup: Wrench, loading: LoaderCircle };

export function PageState({
  title,
  description,
  kind = "empty",
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  kind?: StateKind;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = stateIcon[kind];
  return (
    <section className={cn("flex min-h-56 flex-col items-center justify-center border border-dashed border-border bg-muted/25 px-6 py-12 text-center", className)} aria-live={kind === "loading" ? "polite" : undefined}>
      <span className={cn("mb-3 grid size-10 place-items-center rounded-full", kind === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
        <Icon aria-hidden="true" className={cn("size-5", kind === "loading" && "animate-spin motion-reduce:animate-none")} />
      </span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description ? <div className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
