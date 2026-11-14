// Central place that knows which integrations are configured.
export const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const openaiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

export const OPENAI_MODEL = () => process.env.OPENAI_MODEL || "gpt-4o";
