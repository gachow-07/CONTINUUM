import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] text-foreground placeholder:text-[#6b778a] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#3a4760] focus:border-accent focus:bg-[#0f1520] focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:bg-muted disabled:opacity-70";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, "h-9", className)} {...p} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, "min-h-[84px] py-2 leading-relaxed", className)} {...p} />,
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref} className={cn(field, "h-9 appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8", className)}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }} {...p}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Field({ label, hint, error, children, className, required }: {
  label: string; hint?: string; error?: string; children: React.ReactNode; className?: string; required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
