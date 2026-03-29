import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/ui";

export type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "error";

/**
 * Shared action button with semantic visual variants.
 */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual priority and status styling for the button. */
  variant?: ButtonVariant;
  /** Expands the button to the full available width. */
  fullWidth?: boolean;
  /** Shows a loading label without changing the click contract. */
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-pine",
  secondary: "border border-black/10 bg-white text-ink hover:border-pine hover:text-pine",
  success: "bg-success text-white hover:brightness-110",
  warning: "bg-warning text-white hover:brightness-110",
  error: "bg-error text-white hover:brightness-110"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", fullWidth = false, loading = false, children, disabled, ...props },
  ref
) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      aria-busy={loading}
      disabled={disabled || loading}
      ref={ref}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
});
