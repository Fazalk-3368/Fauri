'use client';

import Link from 'next/link';
import { ArrowRight, Clock, MapPin, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from '@/components/ui';

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

export default function LandingPage() {
  const { dict } = useI18n();

  const steps = [
    { icon: MapPin, title: dict.landing.step1Title, body: dict.landing.step1Body },
    { icon: Zap, title: dict.landing.step2Title, body: dict.landing.step2Body },
    { icon: ShieldCheck, title: dict.landing.step3Title, body: dict.landing.step3Body },
    { icon: Clock, title: dict.landing.step4Title, body: dict.landing.step4Body },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg">
            <Wrench className="size-4" />
          </span>
          <span className="text-lg">{dict.common.appName}</span>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <LocaleToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {dict.landing.login}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-urgent/30 bg-urgent-soft px-3 py-1 text-xs font-medium text-urgent">
              <Clock className="size-3.5" />
              {/* Latin clock times must not be reordered by the RTL paragraph. */}
              <bdi dir="ltr">9:00 PM — 6:00 AM</bdi>
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              {dict.landing.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              {dict.landing.sub}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?role=customer">
                <Button size="lg" className="w-full sm:w-auto">
                  {dict.landing.ctaCustomer}
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </Button>
              </Link>
              <Link href="/signup?role=provider">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  {dict.landing.ctaProvider}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="border-t border-border bg-surface/50">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              {dict.landing.howItWorks}
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-4 text-xs font-semibold text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted">
          {dict.common.appName} — {dict.common.tagline}
        </div>
      </footer>
    </div>
  );
}
