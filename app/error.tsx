"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageState } from "@/components/page-state";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageState
      kind="error"
      title="This workspace couldn’t load"
      description="The data may be temporarily unavailable. Try loading the page again."
      action={<Button onClick={() => unstable_retry()}>Try again</Button>}
    />
  );
}
