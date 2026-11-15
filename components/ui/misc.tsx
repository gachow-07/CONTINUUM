"use client";
import * as React from "react";
import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent } from "./dialog";

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="animate-rise flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
      <div className="animate-float mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-accent-soft to-muted text-accent ring-1 ring-accent/20">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className ?? ""}`} />;
}

export function SetupNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 text-[13px] text-warning">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div><p className="font-semibold">{title}</p><div className="mt-1 space-y-1">{children}</div></div>
    </div>
  );
}

/** Confirmation dialog for destructive actions. `onConfirm` may be async. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Delete", onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string; onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); } }}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="animate-fade-in mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-xs text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
