'use client';

import { cloneElement, forwardRef, isValidElement, useEffect, useId, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'urgent';
type ButtonSize = 'sm' | 'md' | 'lg';

// Every variant darkens to a real token on hover. `hover:opacity-90` used to
// make danger and urgent translucent over whatever sat behind them instead.
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active shadow-sm',
  secondary:
    'bg-surface text-fg border border-border hover:bg-surface-2 hover:border-border-strong',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
  urgent: 'bg-urgent text-urgent-fg hover:bg-urgent-hover',
};

// min-h rather than h: a fixed height clips Nastaliq, which carries a 1.9
// line-height on buttons. md and lg clear the 44px touch target.
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3.5 py-2 text-sm rounded-xl gap-1.5',
  md: 'min-h-11 px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'min-h-13 px-6 py-3 text-base rounded-xl gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold select-none',
        'transition-[background-color,border-color,transform,box-shadow] duration-100 ease-out',
        'active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/* Form fields                                                                */
/* -------------------------------------------------------------------------- */
const fieldBase =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-fg ' +
  'placeholder:text-placeholder transition-colors duration-100 ease-out ' +
  'hover:border-border-strong focus:border-brand ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, 'min-h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-28 resize-y', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldBase, 'min-h-11 pe-8', className)} {...props} />;
  },
);

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const uid = useId();
  const hintId = `${htmlFor ?? uid}-hint`;
  const errorId = `${htmlFor ?? uid}-error`;

  // Hint and error used to render as loose siblings, so a screen reader never
  // announced either. Wire them to the control and mark it invalid.
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        ...(required ? { required: true } : {}),
      })
    : children;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="text-danger ms-1" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="text-xs text-danger-soft-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */
export function Card({
  className,
  interactive,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-sm',
        interactive &&
          'transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.995]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type BadgeTone = 'neutral' | 'brand' | 'urgent' | 'warn' | 'danger' | 'success' | 'info';

// Every tinted tone pairs with its *-soft-fg. The old pairing put text-urgent
// on bg-urgent-soft at 2.6:1, failing AA on the label that carries job status
// across every list screen.
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  brand: 'bg-brand-soft text-brand-soft-fg border-transparent',
  urgent: 'bg-urgent-soft text-urgent-soft-fg border-transparent',
  warn: 'bg-warn-soft text-warn-soft-fg border-transparent',
  danger: 'bg-danger-soft text-danger-soft-fg border-transparent',
  success: 'bg-success-soft text-success-soft-fg border-transparent',
  info: 'bg-info-soft text-info-soft-fg border-transparent',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type AlertTone = 'info' | 'warn' | 'danger' | 'success';

const alertTones: Record<AlertTone, string> = {
  info: 'border-info/30 bg-info-soft text-info-soft-fg',
  warn: 'border-warn/30 bg-warn-soft text-warn-soft-fg',
  danger: 'border-danger/30 bg-danger-soft text-danger-soft-fg',
  success: 'border-success/30 bg-success-soft text-success-soft-fg',
};

export function Alert({
  tone = 'info',
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-sm',
        alertTones[tone],
        className,
      )}
    >
      {Icon && <Icon className="mt-0.5 size-5 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */
/**
 * Built on the native <dialog>, which brings the focus trap, Escape handling,
 * backdrop and top-layer stacking with it. Replaces window.confirm and
 * window.prompt.
 *
 * No close affordance in the chrome on purpose: the caller supplies its own
 * buttons, which carry dictionary text, so this never ships a hardcoded
 * English label into a fully localized app.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fires for Escape and for a programmatic close alike; onClose is idempotent.
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        // A backdrop click lands on the dialog element itself.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-fg shadow-xl',
        'backdrop:bg-black/40 open:animate-in-up',
      )}
    >
      <div className="p-5 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {footer && (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        )}
      </div>
    </dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-hidden />;
}

/** Shaped like the content it stands in for, rather than a generic spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} aria-hidden />;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger-soft-fg"
    >
      {children}
    </p>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
          <Icon className="size-6" />
        </span>
      )}
      <p className="font-semibold text-fg">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
