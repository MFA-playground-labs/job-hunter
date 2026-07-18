export function SetupNeeded() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center">
      <p className="text-sm font-medium">Supabase isn&apos;t connected yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Fill in <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        in <code>.env.local</code> (copy from <code>.env.local.example</code>), then run{" "}
        <code>supabase start</code> for local dev or point at a real Supabase project.
      </p>
    </div>
  );
}
