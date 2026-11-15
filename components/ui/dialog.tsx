"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ title, description, children, className, wide }: {
  title: string; description?: string; children: React.ReactNode; className?: string; wide?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="overlay-anim fixed inset-0 z-50 bg-[#05080f]/60 backdrop-blur-[3px]" />
      <D.Content
        className={cn(
          "dialog-anim fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border-strong bg-surface shadow-[var(--shadow-pop),0_0_0_1px_rgb(255_255_255/0.02)]",
          wide ? "max-w-2xl" : "max-w-lg",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <D.Title className="text-[15px] font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-xs text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-muted-foreground transition-[color,background-color,transform] duration-200 hover:rotate-90 hover:bg-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></D.Close>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

/** Right-side detail drawer. */
export function DrawerContent({ title, description, children, actions }: { title: React.ReactNode; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <D.Portal>
      <D.Overlay className="overlay-anim fixed inset-0 z-50 bg-[#05080f]/50 backdrop-blur-[2px]" />
      <D.Content className="drawer-anim fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col border-l border-border-strong bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <D.Title className="text-base font-semibold leading-snug">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-xs text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">Details</D.Description>}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <D.Close className="rounded-md p-1.5 text-muted-foreground transition-[color,background-color,transform] duration-200 hover:rotate-90 hover:bg-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></D.Close>
          </div>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
