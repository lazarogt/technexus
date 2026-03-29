import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/ui";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/**
 * Reusable select with generic option input and optional multiple selection.
 */
export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  /** Accessible field label shown above the control. */
  label?: ReactNode;
  /** Options rendered inside the native select element. */
  options: SelectOption[];
  /** Optional validation message rendered below the select. */
  error?: string;
  /** Optional supporting copy rendered when the field is valid. */
  hint?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, options, error, hint, id, multiple = false, ...props },
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
      <select
        aria-describedby={descriptionIds}
        aria-invalid={Boolean(error)}
        className={cn(
          "input-surface",
          multiple && "min-h-[144px]",
          error && "border-error focus:border-error",
          className
        )}
        id={fieldId}
        multiple={multiple}
        ref={ref}
        {...props}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
