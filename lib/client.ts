"use client";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { FileCategory } from "@/lib/types";
import type { ActionResult } from "@/app/actions/helpers";
import { actionErrorMessage } from "@/lib/action-error.mjs";

/** Runs a server action, shows a toast, and returns the result. */
export async function act<T extends object = object>(p: Promise<ActionResult<T>>, success?: string): Promise<ActionResult<T>> {
  try {
    const r = await p;
    if (r.ok) { if (success) toast.success(success); }
    else {
      const error = actionErrorMessage(r.error);
      toast.error(error);
      return { ok: false, error };
    }
    return r;
  } catch (e) {
    const error = actionErrorMessage(e instanceof Error ? e.message : "Something went wrong");
    toast.error(error);
    return { ok: false, error };
  }
}

export function guessCategory(file: File): FileCategory {
  const n = file.name.toLowerCase();
  if (/\.(step|stp|iges|igs|stl|sldprt|sldasm|f3d|dwg|dxf|obj|3mf)$/.test(n)) return "cad";
  if (/\.(xlsx?|csv|mat|m)$/.test(n) || /calc/.test(n)) return "calculation";
  if (/fea|ansys|stress/.test(n)) return "fea";
  if (/cfd|flow/.test(n)) return "cfd";
  if (file.type.startsWith("image/")) return "cad_screenshot";
  if (/\.(pdf|docx?|txt|md)$/.test(n)) return "document";
  return "other";
}

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  cad: "CAD file", cad_screenshot: "CAD screenshot", calculation: "Calculation", fea: "FEA result", cfd: "CFD result", document: "Document", image: "Image", other: "Other",
};

/** Uploads straight from the browser to private Supabase Storage (protected by storage RLS). Returns the stored path. */
export async function uploadToProject(projectId: string, file: File): Promise<string> {
  const supabase = createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${projectId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("project-files").upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`Upload of ${file.name} failed: ${error.message}`);
  return path;
}

export const fileUrl = (path: string, download?: string) => `/api/storage?path=${encodeURIComponent(path)}${download ? `&download=${encodeURIComponent(download)}` : ""}`;
export const isImage = (mime: string | null, name: string) => Boolean(mime?.startsWith("image/")) || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
