import "server-only";
import OpenAI from "openai";
import { OPENAI_MODEL, openaiConfigured } from "@/lib/env";

export class AiNotConfigured extends Error {
  constructor() {
    super("AI features need an OpenAI API key. Add OPENAI_API_KEY to your environment (see README → Setup) and restart the app.");
  }
}

let client: OpenAI | null = null;

/** Calls OpenAI with a strict JSON schema and returns the parsed object. */
export async function callJson<T>(opts: { system: string; messages: { role: "user" | "assistant"; content: string }[]; name: string; schema: object; temperature?: number }): Promise<T> {
  if (!openaiConfigured()) throw new AiNotConfigured();
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: OPENAI_MODEL(),
    temperature: opts.temperature ?? 0.2,
    messages: [{ role: "system", content: opts.system }, ...opts.messages],
    response_format: { type: "json_schema", json_schema: { name: opts.name, strict: true, schema: opts.schema as Record<string, unknown> } },
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("The AI service returned an empty response.");
  return JSON.parse(text) as T;
}

export function aiErrorResponse(e: unknown) {
  if (e instanceof AiNotConfigured) return Response.json({ error: e.message, code: "not_configured" }, { status: 503 });
  const msg = e instanceof Error ? e.message : "AI request failed";
  const status = typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 500;
  return Response.json({ error: status === 401 ? "OpenAI rejected the API key. Check OPENAI_API_KEY." : msg }, { status: status >= 400 && status < 600 ? status : 500 });
}
