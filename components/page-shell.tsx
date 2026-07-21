import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  width?: "default" | "reading" | "wide";
};

const widths = {
  default: "max-w-6xl",
  reading: "max-w-3xl",
  wide: "max-w-7xl",
};

export function PageShell({ children, className, width = "default", ...props }: PageShellProps) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-6", widths[width], className)} {...props}>
      {children}
    </div>
  );
}
