"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ActionSubmit({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "outline" | "ghost" }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending}>{pending ? "Saving…" : children}</Button>;
}
