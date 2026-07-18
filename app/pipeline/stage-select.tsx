"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_LABELS } from "@/lib/stages";
import type { Application } from "@/types/database";
import { updateApplicationStage } from "./actions";

export function StageSelect({
  applicationId,
  currentStage,
  stages,
}: {
  applicationId: string;
  currentStage: Application["stage"];
  stages: Application["stage"][];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentStage}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await updateApplicationStage(applicationId, value as Application["stage"]);
          if (result?.error) {
            toast.error(result.error);
          }
        });
      }}
    >
      <SelectTrigger size="sm" className="w-full text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
