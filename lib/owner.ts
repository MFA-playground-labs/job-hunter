import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// CareerOS is a single-user service. Server-side scripts resolve "the owner" by
// listing auth users and failing closed on ambiguity (CON-016) — never guess an
// owner when more than one exists without an explicit choice.
export async function getSingleOwnerId(
  supabase: SupabaseClient<Database>,
  opts: { allowMultiple?: boolean } = {},
): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(`Failed to list Supabase users: ${error.message}`);
  if (data.users.length === 0) {
    throw new Error("No Supabase auth user found — create the single CareerOS user first.");
  }
  if (data.users.length > 1 && !opts.allowMultiple) {
    throw new Error(
      `Ambiguous owner: ${data.users.length} auth users found. Refusing to guess (CON-016). ` +
        "Set the intended owner explicitly before running this script.",
    );
  }
  return data.users[0].id;
}
