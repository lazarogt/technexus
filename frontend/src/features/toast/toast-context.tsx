import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from "react";

type Toast = {
  id: number;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toasts: Toast[];
  showToast: (input: { title: string; description?: string }) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast(input) {
        const id = nextId.current++;
        setToasts((current) => [...current, { id, ...input }]);

        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 2_800);
      },
      dismissToast(id) {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }
    }),
    [toasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
