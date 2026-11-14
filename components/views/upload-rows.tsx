"use client";
import { useState } from "react";
import { FileText, X } from "lucide-react";
import { Select } from "@/components/ui/form";
import { CATEGORY_LABEL, guessCategory, uploadToProject } from "@/lib/client";
import { formatBytes } from "@/lib/utils";
import type { FileCategory } from "@/lib/types";
import type { FileInput } from "@/app/actions/knowledge";
import { Dropzone } from "./common";

export interface PendingFile { file: File; category: FileCategory }

/** Dropzone plus a per-file category selector (CAD, FEA, calculation…). */
export function UploadRows({ items, onChange }: { items: PendingFile[]; onChange: (i: PendingFile[]) => void }) {
  return (
    <div>
      <Dropzone files={[]} onChange={(fs) => onChange([...items, ...fs.map((file) => ({ file, category: guessCategory(file) }))])} hint="CAD files and screenshots, calculations, FEA / CFD results, documents" />
      {items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{it.file.name}</span><span className="text-muted-foreground">{formatBytes(it.file.size)}</span>
              <Select aria-label={`Category for ${it.file.name}`} className="h-7 w-auto py-0 text-xs" value={it.category} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, category: e.target.value as FileCategory } : x)))}>
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <button type="button" aria-label={`Remove ${it.file.name}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-0.5 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function useUploader() {
  const [progress, setProgress] = useState("");
  async function upload(projectId: string, items: PendingFile[], description = ""): Promise<FileInput[]> {
    const out: FileInput[] = [];
    for (let i = 0; i < items.length; i++) {
      setProgress(`Uploading ${i + 1} of ${items.length}…`);
      const path = await uploadToProject(projectId, items[i].file);
      out.push({ name: items[i].file.name, storage_path: path, mime: items[i].file.type || null, size: items[i].file.size, category: items[i].category, description });
    }
    setProgress("");
    return out;
  }
  return { upload, progress };
}
