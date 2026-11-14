import { createClient } from "@/lib/supabase/server";

// Redirects to a short-lived signed URL. The signed URL is only issued if storage RLS lets the user read the object.
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  const download = new URL(req.url).searchParams.get("download");
  if (!path) return new Response("Missing path", { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("project-files").createSignedUrl(path, 300, download ? { download } : undefined);
  if (error || !data) return new Response("Not found", { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
