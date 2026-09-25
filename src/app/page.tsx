'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Clock,
  MapPin,
  Radio,
  ShieldCheck,
  Wrench,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from '@/components/ui';
import { HeroPreview } from '@/components/landing/HeroPreview';

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

function Logo() {
  const { dict } = useI18n();
  return (
    <div className="flex items-center gap-2 font-semibold">
      <span className="grid size-9 place-items-center rounded-lg bg-brand text-brand-fg">
        <Wrench className="size-4" />
      </span>
      <span className="font-display text-lg">{dict.common.appName}</span>
    </div>
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

  const trust = [
    { icon: Banknote, title: dict.landing.trustCash, body: dict.landing.trustCashBody },
    { icon: Radio, title: dict.landing.trustFast, body: dict.landing.trustFastBody },
    { icon: BadgeCheck, title: dict.landing.trustChoice, body: dict.landing.trustChoiceBody },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
          <div className="ms-auto flex items-center gap-1">
            <LocaleToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {dict.landing.login}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: asymmetric split. Copy on the start side, the product itself
            on the end side, rather than a centred block over empty space. */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 end-[-10%] size-[36rem] rounded-full bg-brand-soft/50 blur-3xl"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-urgent/25 bg-urgent-soft px-3 py-1.5 text-xs font-medium text-urgent-soft-fg">
                {/* A real state indicator: this is the window the product is for. */}
                <span className="relative grid size-2 place-items-center text-urgent">
                  <span className="pulse-ring absolute inset-0 rounded-full" />
                  <span className="size-2 rounded-full bg-urgent" />
                </span>
                {/* Latin clock times must not be reordered by the RTL paragraph. */}
                <bdi dir="ltr">9:00 PM to 6:00 AM</bdi>
              </span>

              <h1 className="font-display mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {dict.landing.headline}
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
                {dict.landing.sub}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup?role=customer" className="group">
                  <Button size="lg" className="w-full sm:w-auto">
                    {dict.landing.ctaCustomer}
                    <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  </Button>
                </Link>
                <Link href="/signup?role=provider">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    {dict.landing.ctaProvider}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:ps-4">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Trust: its own section, because a trust strip inside the hero
            pushes the stack past four elements. */}
        <section className="border-y border-border bg-surface/60">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 sm:py-14">
            {trust.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-soft-fg">
                  <Icon className="size-5" />
                </span>
                {/* dir="auto" because these strings are still English in both
                    locales: without it, bidi drags the full stop to the wrong
                    end of the line on the Urdu page. */}
                <div className="min-w-0" dir="auto">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works: a stepped sequence, connected. */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {dict.landing.howItWorks}
          </h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative">
                {/* Logical inset, so the connector mirrors under RTL. */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-5 hidden h-px w-full bg-border lg:block"
                    style={{ insetInlineStart: '3rem' }}
                  />
                )}
                <span className="relative z-10 grid size-10 place-items-center rounded-xl border border-border bg-surface text-brand-ink shadow-sm">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Tradesmen band: its own surface, so the provider CTA gets a moment
            instead of competing inside the hero. */}
        {/* Tinted rather than dark: the contrast rhythm without the black. */}
        <section className="border-y border-brand/15 bg-brand-soft">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:gap-16">
            <div dir="auto">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {dict.landing.providerTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-soft-fg">
                {dict.landing.providerBody}
              </p>
            </div>
            <Link href="/signup?role=provider" className="lg:justify-self-end">
              {/* Not the urgent variant: amber means emergency and nothing
                  else now, and this is a signup. */}
              <Button size="lg" className="w-full sm:w-auto">
                {dict.landing.ctaProvider}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo />
          <span className="ms-auto">{dict.common.tagline}</span>
        </div>
      </footer>
    </div>
  );
}
