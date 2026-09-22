'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: string; title: string; body?: string; tone: ToastTone; href?: string };

type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = { success: CheckCircle2, error: TriangleAlert, info: Info } as const;
const TONE_CLASS: Record<ToastTone, string> = {
  success: 'border-brand/40 text-brand',
  error: 'border-danger/40 text-danger',
  info: 'border-border text-info',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 6000),
      );
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, body) => push({ title, body, tone: 'success' }),
      error: (title, body) => push({ title, body, tone: 'error' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          const content = (
            <>
              <Icon className={cn('mt-0.5 size-5 shrink-0', TONE_CLASS[toast.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{toast.title}</p>
                {toast.body && <p className="mt-0.5 text-xs text-muted">{toast.body}</p>}
              </div>
            </>
          );

          return (
            <div
              key={toast.id}
              className={cn(
                'animate-in-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-[var(--shadow-lift)]',
                TONE_CLASS[toast.tone],
              )}
            >
              {toast.href ? (
                <a href={toast.href} className="flex flex-1 items-start gap-3">
                  {content}
                </a>
              ) : (
                content
              )}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted hover:text-fg"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
