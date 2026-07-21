import { PageState } from "@/components/page-state";

export function SetupNeeded() {
  return (
    <PageState
      kind="setup"
      title="Supabase isn’t connected yet"
      description={
        <>
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then point the app at your hosted Supabase project.
        </>
      }
    />
  );
}
