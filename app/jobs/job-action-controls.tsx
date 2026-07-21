"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PASS_REASONS, PASS_REASON_LABELS } from "@/lib/job-workflow";
import type { JobActionState } from "./actions";
import { updateJob } from "./actions";

const initialState: JobActionState = { ok: false, message: "", fieldErrors: {} };

function ResultMessage({ state }: { state: JobActionState }) {
  if (!state.message) return null;
  return (
    <p aria-live="polite" className={state.ok ? "text-xs text-emerald-700" : "text-xs text-destructive"}>
      {state.message}
    </p>
  );
}

export function JobActionControls({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const [interestState, interestAction, interestPending] = useActionState(updateJob, initialState);
  const [passState, passAction, passPending] = useActionState(updateJob, initialState);
  const [open, setOpen] = useState(false);

  if (!new Set(["new", "interested"]).has(currentStatus)) {
    return <p className="text-xs capitalize text-muted-foreground">{currentStatus} — manage this opportunity in Pipeline.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Job actions">
      <form action={interestAction}>
        <input name="id" type="hidden" value={jobId} />
        <input name="status" type="hidden" value="interested" />
        <Button className="min-h-11" disabled={interestPending || interestState.ok || currentStatus === "interested"}>
          {interestPending ? "Saving…" : interestState.ok ? "Interested" : "Interested"}
        </Button>
      </form>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button className="min-h-11" variant="outline" disabled={passPending} />}>
          Pass
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pass on this job?</DialogTitle>
            <DialogDescription>A reason is required so your search preferences stay useful.</DialogDescription>
          </DialogHeader>
          <form action={passAction} className="grid gap-4">
            <input name="id" type="hidden" value={jobId} />
            <input name="status" type="hidden" value="passed" />
            <div className="grid gap-2">
              <Label htmlFor={`pass-reason-${jobId}`}>Reason</Label>
              <select
                id={`pass-reason-${jobId}`}
                name="pass_reason"
                required
                defaultValue=""
                aria-invalid={Boolean(passState.fieldErrors.pass_reason)}
                className="h-11 rounded-md border bg-background px-3 text-sm"
              >
                <option disabled value="">Choose a reason</option>
                {PASS_REASONS.map((reason) => <option key={reason} value={reason}>{PASS_REASON_LABELS[reason]}</option>)}
              </select>
              {passState.fieldErrors.pass_reason && <p className="text-xs text-destructive">{passState.fieldErrors.pass_reason}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`pass-note-${jobId}`}>Note <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id={`pass-note-${jobId}`} name="pass_note" maxLength={1000} placeholder="A little context for later" />
            </div>
            <ResultMessage state={passState} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />} disabled={passPending}>Cancel</DialogClose>
              <Button type="submit" variant="destructive" disabled={passPending}>{passPending ? "Passing…" : "Pass job"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ResultMessage state={interestState} />
    </div>
  );
}
