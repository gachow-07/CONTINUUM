import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:duration-75 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-[#2b4a7d] shadow-sm hover:-translate-y-px",
        accent: "btn-sheen bg-gradient-to-b from-[#4f97ff] to-[#2f7cf2] text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_4px_14px_-4px_rgb(61_139_255/0.55)] hover:-translate-y-px hover:shadow-[0_1px_0_rgb(255_255_255/0.22)_inset,0_10px_26px_-6px_rgb(61_139_255/0.7)]",
        outline: "border border-border-strong bg-surface hover:bg-muted hover:border-[#3a4760] text-foreground",
        ghost: "hover:bg-muted text-foreground",
        danger: "bg-danger text-white hover:bg-danger/85 shadow-sm hover:-translate-y-px",
        "danger-ghost": "text-danger hover:bg-danger-soft",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-3.5", lg: "h-10 px-4 text-sm", icon: "h-8 w-8" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
export { buttonVariants };
