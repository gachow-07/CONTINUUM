import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Atomically reserves one request for an anonymous user. Fail closed if the quota cannot be checked. */
export async function enforceAnonymousAiLimit(supabase: SupabaseClient): Promise<{ error: Response | null; remaining: number | null }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: Response.json({ error: "Not signed in" }, { status: 401 }), remaining: null };
  if (!user.is_anonymous) return { error: null, remaining: null };
  const { data, error } = await supabase.rpc("consume_anonymous_ai_use");
  if (error || typeof data !== "number" || !Number.isInteger(data) || data < -1 || data > 2) return { error: Response.json({ error: "The anonymous AI limit could not be checked. Please try again later." }, { status: 503 }), remaining: null };
  if (data === -1) return { error: Response.json({ error: "You’ve used all 3 AI uses available in anonymous mode.", code: "anonymous_ai_limit" }, { status: 429 }), remaining: 0 };
  return { error: null, remaining: data };
}
export function anonymousAiHeaders(remaining: number | null): HeadersInit {
  return remaining === null ? {} : { "X-Anonymous-AI-Remaining": String(remaining) };
}
