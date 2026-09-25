'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Briefcase,
  LogOut,
  Plus,
  Search,
  User,
  Wallet,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/types/database';

function NotificationBell({ userId }: { userId: string }) {
  const { dict } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { items, unreadCount, markAllRead } = useNotifications(userId, (n) => {
    toast.push({ title: n.title, body: n.body, tone: 'info' });
    // A new nearby job should appear in the feed without a manual refresh.
    // Chat is already streaming its own rows, so refreshing the whole server
    // tree on every message just re-renders the page mid-conversation.
    if (n.type !== 'new_message') router.refresh();
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) void markAllRead();
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          unreadCount > 0
            ? `${dict.nav.notifications} (${unreadCount})`
            : dict.nav.notifications
        }
        className="relative grid size-11 place-items-center rounded-xl text-muted transition-colors duration-100 hover:bg-surface-2 hover:text-fg"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span
            key={unreadCount}
            className="animate-pop absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-urgent px-1 text-[10px] font-bold text-urgent-fg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute end-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{dict.notifications.title}</p>
            </div>
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <BellOff className="mx-auto size-6 text-muted/60" aria-hidden />
                  <p className="mt-2 text-sm text-muted">{dict.notifications.empty}</p>
                </div>
              ) : (
                items.map((n) => {
                  const body = (
                    <div className="flex items-start gap-2.5 px-4 py-3">
                      <span
                        aria-hidden
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          n.read_at ? 'bg-transparent' : 'bg-brand',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                      </div>
                    </div>
                  );
                  return n.job_id ? (
                    <Link
                      key={n.id}
                      href={`/jobs/${n.job_id}`}
                      onClick={() => setOpen(false)}
                      className="block border-b border-border transition-colors duration-100 last:border-0 hover:bg-surface-2"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id} className="border-b border-border last:border-0">
                      {body}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LocaleToggle() {
  const { dict, toggleLocale, isSwitching } = useI18n();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      disabled={isSwitching}
      className="min-h-11 rounded-xl px-3 text-sm font-medium text-muted transition-colors duration-100 hover:bg-surface-2 hover:text-fg disabled:opacity-50"
    >
      {dict.common.language}
    </button>
  );
}

export function AppHeader({ profile }: { profile: Profile }) {
  const { dict } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const isProvider = profile.role === 'provider';

  const links = isProvider
    ? [
        { href: '/dashboard', label: dict.nav.findWork, icon: Search },
        { href: '/earnings', label: dict.nav.earnings, icon: Wallet },
      ]
    : [
        { href: '/dashboard', label: dict.nav.myJobs, icon: Briefcase },
        { href: '/jobs/new', label: dict.nav.postJob, icon: Plus },
      ];

  // Profile is a destination on the tab bar, so it belongs in the same list.
  const tabs = [...links, { href: '/profile', label: dict.nav.profile, icon: User }];

  // The job page puts its own primary action in a fixed bar at the bottom.
  // Two stacked bars on a phone is worse than losing the tabs for one screen,
  // and the header still gets you back to the dashboard.
  const hideTabBar = /^\/jobs\/[^/]+$/.test(pathname);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
            aria-label={dict.common.appName}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-brand text-brand-fg">
              <Wrench className="size-4" />
            </span>
            <span className="font-display text-lg">{dict.common.appName}</span>
          </Link>

          <nav className="ms-4 hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors duration-100',
                  pathname === href
                    ? 'bg-brand-soft text-brand-soft-fg'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1">
            <LocaleToggle />
            <NotificationBell userId={profile.id} />

            {/* Profile and sign-out live on the tab bar below sm, so there is
                no burger and no icon-only control without a label. */}
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/profile"
                aria-label={dict.nav.profile}
                className="grid size-11 place-items-center rounded-xl transition-colors duration-100 hover:bg-surface-2"
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-fg">
                  {profile.full_name.slice(0, 1).toUpperCase()}
                </span>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} aria-label={dict.nav.logout}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom tab bar. The single biggest signal that this is an app rather
          than a website, and it removes the old burger entirely: every control
          here carries a visible label, so nothing is icon-only and unnamed. */}
      <nav
        aria-label={dict.nav.dashboard}
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden',
          hideTabBar && 'hidden',
        )}
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors duration-100',
                  active ? 'text-brand-ink' : 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'grid min-h-7 w-12 place-items-center rounded-full transition-colors duration-100',
                    active && 'bg-brand-soft',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="truncate">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={signOut}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium text-muted transition-colors duration-100"
          >
            <span className="grid min-h-7 w-12 place-items-center">
              <LogOut className="size-5" />
            </span>
            <span className="truncate">{dict.nav.logout}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
