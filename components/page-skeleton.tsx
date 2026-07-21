import { cn } from "@/lib/utils";

export function PageSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6", className)} aria-busy="true" aria-label="Loading page">
      <div className="space-y-3 border-b border-border pb-5">
        <div className="h-3 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-6 py-5">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
            <div className="h-7 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
