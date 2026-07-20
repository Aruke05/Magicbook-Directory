import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--control-radius)] px-4 text-sm font-semibold transition-[background,color,border-color,transform] duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  { variants: {
    variant: {
      primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
      secondary: "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
      ghost: "text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
      danger: "bg-[var(--danger)] text-white hover:brightness-95",
    },
    size: { default: "h-10", sm: "min-h-8 px-3 text-xs", icon: "size-10 p-0" },
  }, defaultVariants: { variant: "primary", size: "default" } },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)
  if (asChild) return <Slot className={classes} {...props}>{children}</Slot>
  return <button className={classes} disabled={disabled || loading} {...props}>
    {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}{children}
  </button>
}
