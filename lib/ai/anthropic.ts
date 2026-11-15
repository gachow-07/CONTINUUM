import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL, anthropicConfigured } from "@/lib/env";

export class AiNotConfigured extends Error {
  constructor() {
    super("AI features need an Anthropic API key. Add ANTHROPIC_API_KEY to your environment (see README → Setup) and restart the app.");
  }
}

let client: Anthropic | null = null;

/** Calls Claude with a strict JSON schema and returns the parsed object. */
export async function callJson<T>(opts: { system: string; messages: { role: "user" | "assistant"; content: string }[]; name: string; schema: object }): Promise<T> {
  if (!anthropicConfigured()) throw new AiNotConfigured();
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL(),
    max_tokens: 8192,
    system: opts.system,
    messages: opts.messages,
    output_config: {
      format: { type: "json_schema", schema: opts.schema as Record<string, unknown> },
    },
  });
  const text = res.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("The AI service returned an empty response.");
  return JSON.parse(text) as T;
}

export function aiErrorResponse(e: unknown) {
  if (e instanceof AiNotConfigured) return Response.json({ error: e.message, code: "not_configured" }, { status: 503 });
  const msg = e instanceof Error ? e.message : "AI request failed";
  const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 500;
  const error = status === 401
    ? "Anthropic rejected the API key. Check ANTHROPIC_API_KEY."
    : status === 402
      ? "Anthropic API billing is not active. Add API credits in the Claude Console."
      : msg;
  return Response.json({ error }, { status: status >= 400 && status < 600 ? status : 500 });
}
