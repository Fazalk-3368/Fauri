import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** PKR with thousands separators and no trailing decimals. */
export function formatPkr(amount: number | null | undefined, locale = 'en') {
  if (amount == null) return '—';
  return new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDistance(metres: number, locale = 'en') {
  if (metres < 950) return `${Math.round(metres / 10) * 10} m`;
  const km = metres / 1000;
  return `${new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : 'en-PK', {
    maximumFractionDigits: 1,
  }).format(km)} km`;
}

/** Errors thrown by Postgres RPCs carry a readable message; surface it. */
export function errorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
  }
  return fallback;
}
