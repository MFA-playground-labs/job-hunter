"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GenerateTailoredVersionButton({ roleId }: { roleId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to generate tailored resume");
        return;
      }
      if (json.stubbed) {
        toast.warning(json.stub_reason ?? "Generated with a placeholder prompt.");
      } else {
        toast.success("New tailored version generated");
      }
      router.refresh();
    } catch {
      toast.error("Failed to generate tailored resume");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Generating…" : "Generate tailored version"}
    </Button>
  );
}
