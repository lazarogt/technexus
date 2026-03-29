import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/ui";

/**
 * Shared textarea with the same label and validation semantics as Input.
 */
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Accessible field label shown above the control. */
  label?: ReactNode;
  /** Optional validation message rendered below the textarea. */
  error?: string;
  /** Optional supporting copy rendered when the field is valid. */
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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
      <textarea
        aria-describedby={descriptionIds}
        aria-invalid={Boolean(error)}
        className={cn(
          "input-surface min-h-[120px]",
          error && "border-error focus:border-error",
          className
        )}
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
