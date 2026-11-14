import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type LimitClaim = { allowed: boolean; retry_after_seconds: number; remaining: number };

export class AiRateLimited extends Error {
  constructor(public readonly retryAfter: number) {
    super("AI request limit reached. Please wait before trying again.");
  }
}

export class AiSafetyUnavailable extends Error {
  constructor() {
    super("The AI safety check is unavailable, so no paid AI request was sent.");
  }
}

/**
 * Claims one paid AI request in Supabase before contacting OpenAI.
 * The database function enforces limits atomically across all Vercel instances.
 */
export async function claimAiRequest(supabase: SupabaseClient, route: "chat" | "decision-assist" | "generate-doc" | "summarize") {
  const { data, error } = await supabase.rpc("claim_ai_request", { p_route: route });
  if (error) throw new AiSafetyUnavailable();

  const claim = (Array.isArray(data) ? data[0] : data) as LimitClaim | null;
  if (!claim || typeof claim.allowed !== "boolean") throw new AiSafetyUnavailable();
  if (!claim.allowed) throw new AiRateLimited(Math.max(1, claim.retry_after_seconds || 60));
  return claim;
}

