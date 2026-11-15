import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const GLOBAL_LIMIT_MESSAGE = "Why have the judges used 100 API calls already? Chill on the wallet we haven't won yet";
type LimitResult = { error: Response | null; remaining: number | null; globalRemaining: number | null };
/** Atomically reserves one request for an anonymous user. Fail closed if quota cannot be checked. */
export async function enforceAnonymousAiLimit(supabase: SupabaseClient): Promise<LimitResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: Response.json({ error: "Not signed in" }, { status: 401 }), remaining: null, globalRemaining: null };
  if (!user.is_anonymous) return { error: null, remaining: null, globalRemaining: null };
  const { data, error } = await supabase.rpc("consume_anonymous_ai_use");
  if (!error && data?.status === "global_limit") return { error: Response.json({ error: GLOBAL_LIMIT_MESSAGE, code: "anonymous_global_ai_limit" }, { status: 429 }), remaining: null, globalRemaining: 0 };
  if (!error && data?.status === "user_limit") return { error: Response.json({ error: "You’ve used all 3 AI uses available in anonymous mode.", code: "anonymous_ai_limit" }, { status: 429 }), remaining: 0, globalRemaining: null };
  if (error || data?.status !== "allowed" || !Number.isInteger(data.user_remaining) || data.user_remaining < 0 || data.user_remaining > 2 || !Number.isInteger(data.global_remaining) || data.global_remaining < 0 || data.global_remaining > 99) return { error: Response.json({ error: "The anonymous AI limit could not be checked. Please try again later." }, { status: 503 }), remaining: null, globalRemaining: null };
  return { error: null, remaining: data.user_remaining, globalRemaining: data.global_remaining };
}
export function anonymousAiHeaders(quota: LimitResult): HeadersInit {
  return quota.remaining === null ? {} : { "X-Anonymous-AI-Remaining": String(quota.remaining), "X-Anonymous-AI-Global-Remaining": String(quota.globalRemaining) };
}
