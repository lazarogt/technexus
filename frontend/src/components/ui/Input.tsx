import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/ui";

/**
 * Typed input wrapper with label, helper copy and error state.
 */
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Accessible field label shown above the control. */
  label?: ReactNode;
  /** Optional validation message rendered below the input. */
  error?: string;
  /** Optional supporting message when no error is present. */
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref
) {
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const descriptionIds = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="block">
      {label ? (
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <input
        aria-describedby={descriptionIds}
        aria-invalid={Boolean(error)}
        className={cn("input-surface", error && "border-error focus:border-error", className)}
        id={fieldId}
        ref={ref}
        {...props}
      />
      {error ? (
        <span className="mt-2 block text-sm font-semibold text-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="mt-2 block text-sm text-slate" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
});
