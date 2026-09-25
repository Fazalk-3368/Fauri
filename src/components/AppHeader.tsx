'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Bell,
  Briefcase,
  LogOut,
  Menu,
  Plus,
  Search,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useToast } from '@/components/ui/toast';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/types/database';

function NotificationBell({ userId }: { userId: string }) {
  const { dict } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { items, unreadCount, markAllRead } = useNotifications(userId, (n) => {
    toast.push({ title: n.title, body: n.body, tone: 'info' });
    // A new nearby job should appear in the feed without a manual refresh.
    // Chat is already streaming its own rows, so refreshing the whole server
    // tree on every message just re-renders the page mid-conversation.
    if (n.type !== 'new_message') router.refresh();
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) void markAllRead();
        }}
        className="relative grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
        aria-label={dict.nav.notifications}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-urgent px-1 text-[10px] font-bold text-[oklch(0.2_0.03_60)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute end-0 z-40 mt-2 w-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{dict.notifications.title}</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  {dict.notifications.empty}
                </p>
              ) : (
                items.map((n) => {
                  const body = (
                    <div className={cn('px-4 py-3', !n.read_at && 'bg-brand-soft/40')}>
                      <p className="text-sm font-medium text-fg">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                    </div>
                  );
                  return n.job_id ? (
                    <Link
                      key={n.id}
                      href={`/jobs/${n.job_id}`}
                      onClick={() => setOpen(false)}
                      className="block border-b border-border last:border-0 hover:bg-surface-2"
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
      className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50"
    >
      {dict.common.language}
    </button>
  );
}

export function AppHeader({ profile }: { profile: Profile }) {
  const { dict } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg">
            <Wrench className="size-4" />
          </span>
          <span className="text-lg">{dict.common.appName}</span>
        </Link>

        <nav className="ms-4 hidden items-center gap-1 sm:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-brand-soft text-brand'
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
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg sm:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2"
            >
              <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold">
                {profile.full_name.slice(0, 1).toUpperCase()}
              </span>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label={dict.nav.logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-surface px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-surface-2"
              >
                <Icon className="size-4 text-muted" />
                {label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-surface-2"
            >
              {dict.nav.profile}
              <Badge tone={isProvider ? 'brand' : 'neutral'} className="ms-auto">
                {isProvider ? dict.auth.provider : dict.auth.customer}
              </Badge>
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" />
              {dict.nav.logout}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
