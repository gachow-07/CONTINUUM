"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Search, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { cn, formatBytes } from "@/lib/utils";
import { fileUrl, isImage } from "@/lib/client";
import { refHref } from "@/lib/links";
import type { FileRow, Subsystem } from "@/lib/types";

/** `?open=<id>` drives which detail drawer is open, so every record is deep-linkable. */
export function useOpenParam() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = sp.get("open");
  const setOpen = (id: string | null) => {
    const q = new URLSearchParams(sp.toString());
    if (id) q.set("open", id); else q.delete("open");
    const s = q.toString();
    router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
  };
  return [open, setOpen] as const;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  );
}

export function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="w-auto min-w-[140px] max-w-[200px]">
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

export function SubsystemTag({ id, subsystems }: { id: string | null; subsystems: Subsystem[] }) {
  const s = subsystems.find((x) => x.id === id);
  return s ? <Badge tone="neutral">{s.name}</Badge> : null;
}

export function TagList({ tags, onClick, active }: { tags: string[]; onClick?: (t: string) => void; active?: string }) {
  return (
    <>
      {tags.map((t) => (
        <button key={t} type="button" onClick={onClick ? (e) => { e.stopPropagation(); onClick(t); } : undefined}
          className={cn("rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors", active === t ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-muted-foreground", onClick && "hover:border-border-strong")}>
          #{t}
        </button>
      ))}
    </>
  );
}

/** Link chip pointing at a piece of evidence elsewhere in the project. */
export function RefChip({ projectId, type, id, label, onNavigate }: { projectId: string; type: string; id: string; label: string; onNavigate?: () => void }) {
  return (
    <Link href={refHref(projectId, type, id)} onClick={onNavigate} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent">
      <span className="rounded bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{type}</span><span className="truncate">{label}</span>
    </Link>
  );
}

export function FileThumb({ file, className }: { file: FileRow; className?: string }) {
  if (isImage(file.mime, file.name)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(file.storage_path)} alt={file.description || file.name} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
  }
  return <div className={cn("flex h-full w-full items-center justify-center bg-muted text-muted-foreground", className)}><FileText className="h-6 w-6" /></div>;
}

/** Drag-and-drop / click file picker. */
export function Dropzone({ files, onChange, multiple = true, accept, hint }: { files: File[]; onChange: (f: File[]) => void; multiple?: boolean; accept?: string; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => { if (!list) return; const arr = Array.from(list); onChange(multiple ? [...files, ...arr] : arr.slice(0, 1)); };
  return (
    <div>
      <div role="button" tabIndex={0} onClick={() => ref.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={cn("flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors", drag ? "border-accent bg-accent-soft" : "border-border-strong bg-muted/40 hover:bg-muted")}>
        <Upload className="h-5 w-5 text-muted-foreground" />
        <p className="text-[13px] font-medium">Drop files here or click to browse</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <input ref={ref} type="file" multiple={multiple} accept={accept} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{f.name}</span><span className="text-muted-foreground">{formatBytes(f.size)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} className="rounded p-0.5 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-1.5 flex items-center justify-between"><h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>{action}</div>
      <div className="text-[13px] leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

export function NotDocumented({ children = "Not documented" }: { children?: React.ReactNode }) {
  return <span className="inline-flex items-center rounded border border-dashed border-warning/40 bg-warning-soft px-1.5 py-0.5 text-xs text-warning">{children}</span>;
}
