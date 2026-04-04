import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/features/toast/toast-context";

export function ToastViewport() {
  const { t } = useTranslation();
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className="toast-card">
          <div className="stack-xs">
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </div>
          <button type="button" className="toast-close" onClick={() => dismissToast(toast.id)} aria-label={t("buttons.closeNotification")}>
            <X size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}
