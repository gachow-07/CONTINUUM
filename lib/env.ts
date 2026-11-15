// Central place that knows which integrations are configured.
export const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const anthropicConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export const ANTHROPIC_MODEL = () => process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
