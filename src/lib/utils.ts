import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** PKR with thousands separators and no trailing decimals. */
export function formatPkr(amount: number | null | undefined, locale = 'en') {
  // Hyphen, not an em-dash: this string renders on screen wherever a price is
  // still unset, and the em-dash is banned from user-visible copy.
  if (amount == null) return '-';
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

/**
 * Postgres error classes whose messages name constraints, columns and tables.
 * Useful in a log, meaningless to a customer, and they describe the schema to
 * anyone poking at the app.
 */
const INTERNAL_PG_CODES = new Set([
  '23502', // not_null_violation
  '23503', // foreign_key_violation
  '23505', // unique_violation
  '23514', // check_violation
  '22001', // string_data_right_truncation
  '42703', // undefined_column
  '42P01', // undefined_table
]);

/**
 * Errors raised by our own RPCs carry a message written for the user
 * ("This job is no longer open"), so those are surfaced as-is. Anything the
 * database produced on its own falls back to the generic string.
 */
export function errorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error !== 'object') return fallback;

  const { code, message } = error as { code?: unknown; message?: unknown };

  if (typeof code === 'string') {
    if (INTERNAL_PG_CODES.has(code) || code.startsWith('PGRST')) return fallback;
    // An RLS refusal and an RPC's deliberate "only the customer may do this"
    // share errcode 42501; only the former names the policy.
    if (code === '42501' && typeof message === 'string' && /row-level security/i.test(message)) {
      return fallback;
    }
  }

  return typeof message === 'string' && message.length > 0 ? message : fallback;
}

/**
 * `next` arrives from the query string, so an absolute URL there would turn a
 * successful login into an off-site handoff — a clean phishing setup, since the
 * victim has just proved the site is real by signing into it. Same-origin paths
 * only. Backslashes are rejected because browsers fold them to slashes.
 */
export function safeNext(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}
