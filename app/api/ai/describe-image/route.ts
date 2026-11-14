import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiErrorResponse, describeEvidenceImage } from "@/lib/ai/openai";
import { imageMime } from "@/lib/ai/image-format.mjs";

export const maxDuration = 60;
const body = z.object({ fileId: z.string().uuid() });
const maxBytes = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid file." }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { data: file, error } = await supabase.from("files").select("storage_path").eq("id", parsed.data.fileId).maybeSingle();
  if (error || !file) return Response.json({ error: "File not found or you do not have access." }, { status: 404 });
  const { data: blob, error: downloadError } = await supabase.storage.from("project-files").download(file.storage_path);
  if (downloadError || !blob) return Response.json({ error: "Could not open this file." }, { status: 404 });
  if (blob.size > maxBytes) return Response.json({ error: "AI image descriptions support images up to 5 MB." }, { status: 400 });
  const bytes = Buffer.from(await blob.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime) return Response.json({ error: "AI image descriptions support PNG, JPEG, WebP, and GIF images." }, { status: 400 });
  try {
    return Response.json({ description: await describeEvidenceImage(bytes, mime) });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
