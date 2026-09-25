'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  const { dict } = useI18n();
  return (
    <div className={cn('flex items-center gap-2 font-semibold', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg">
        <Wrench className="size-4" />
      </span>
      <span className="font-display text-lg">{dict.common.appName}</span>
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

export function MarketingNav() {
  const { dict } = useI18n();
  const pathname = usePathname();

  const links = [
    { href: '/features', label: dict.landing.navFeatures },
    { href: '/pricing', label: dict.landing.navPricing },
    { href: '/about', label: dict.landing.navAbout },
    { href: '/contact', label: dict.landing.navContact },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-1 px-4 sm:px-6">
        <Link href="/" aria-label={dict.common.appName}>
          <Logo />
        </Link>

        {/* Hidden below lg rather than collapsed into a burger: four links are
            not worth a menu, and the page CTAs are never more than a scroll
            away on a phone. */}
        <nav className="ms-6 hidden items-center gap-1 lg:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-100',
                pathname === href
                  ? 'bg-brand-soft text-brand-soft-fg'
                  : 'text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <LocaleToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              {dict.landing.login}
            </Button>
          </Link>
          <Link href="/signup?role=customer">
            <Button size="sm">{dict.landing.ctaCustomer}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const { dict } = useI18n();

  const columns = [
    {
      title: dict.landing.footerProduct,
      links: [
        { href: '/features', label: dict.landing.navFeatures },
        { href: '/pricing', label: dict.landing.navPricing },
        { href: '/signup?role=provider', label: dict.landing.ctaProvider },
        { href: '/login', label: dict.landing.login },
      ],
    },
    {
      title: dict.landing.footerCompany,
      links: [
        { href: '/about', label: dict.landing.navAbout },
        { href: '/contact', label: dict.landing.navContact },
      ],
    },
    {
      title: dict.landing.footerLegal,
      links: [
        { href: '/privacy', label: dict.landing.navPrivacy },
        { href: '/terms', label: dict.landing.navTerms },
        { href: '/data-deletion', label: dict.landing.navDataDeletion },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p dir="auto" className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              {dict.landing.footerTagline}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} dir="auto">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-fg transition-colors duration-100 hover:text-brand-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-6 text-xs text-muted">
          <span dir="auto">
            {new Date().getFullYear()} {dict.common.appName}. {dict.landing.footerRights}
          </span>
          <span className="ms-auto" dir="auto">
            {dict.common.tagline}
          </span>
        </div>
      </div>
    </footer>
  );
}
