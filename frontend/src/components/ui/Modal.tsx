import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/ui";
import { Button } from "./Button";

/**
 * Controlled modal with optional confirm and cancel actions.
 */
export type ModalProps = PropsWithChildren<{
  /** Whether the dialog is mounted and visible. */
  isOpen: boolean;
  /** Dialog title referenced by aria-labelledby. */
  title: ReactNode;
  /** Optional descriptive copy rendered under the title. */
  description?: ReactNode;
  /** Invoked when the dialog should close. */
  onClose: () => void;
  /** Optional confirm action. When omitted, only custom children/actions remain. */
  onConfirm?: () => void;
  /** Confirm button label. */
  confirmLabel?: string;
  /** Cancel button label. */
  cancelLabel?: string;
  /** Visual variant used by the confirm button. */
  confirmVariant?: "primary" | "secondary" | "success" | "warning" | "error";
  /** Disables confirm and cancel actions while a mutation is pending. */
  isPending?: boolean;
  /** Additional classes for the dialog panel. */
  className?: string;
}>;

const modalRoot = typeof document !== "undefined" ? document.body : null;

export function Modal({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  isPending = false,
  className,
  children
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
    );
    focusableElements[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && focusableElements.length > 0) {
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !modalRoot) {
    return null;
  }

  return createPortal(
    <div
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-modal flex items-center justify-center bg-ink/55 p-4 transition-opacity duration-200 ease-out motion-reduce:transition-none"
      role="dialog"
    >
      <button aria-label="Close modal" className="absolute inset-0" onClick={onClose} type="button" />
      <div
        className={cn("panel-surface relative z-10 w-full max-w-lg rounded-[30px] p-6 shadow-overlay transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:p-7", className)}
        ref={panelRef}
      >
        <div className="pr-8">
          <h2 className="font-display text-2xl font-bold text-ink" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-slate" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {onConfirm ? (
            <Button loading={isPending} onClick={onConfirm} variant={confirmVariant}>
              {confirmLabel}
            </Button>
          ) : null}
          <Button disabled={isPending} onClick={onClose} variant="secondary">
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    modalRoot
  );
}
