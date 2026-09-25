'use client';

import Link from 'next/link';
import {
  Banknote,
  Flame,
  KeyRound,
  Languages,
  Navigation,
  Radio,
  Star,
  Wind,
  Zap,
  Droplets,
  HandCoins,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Button, Card } from '@/components/ui';

/** Small caps label above a section heading. Used sparingly, not on every one. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p dir="auto" className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-ink">
      {children}
    </p>
  );
}

/** Shared top-of-page block for every marketing route except the landing. */
export function PageHero({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
}) {
  return (
    // isolate + -z-10: see the note on the landing hero. A positioned blob
    // paints above static text unless it is pushed behind explicitly.
    <section className="relative isolate overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 end-[-12%] -z-10 size-[28rem] rounded-full bg-brand-soft/60 blur-3xl"
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 dir="auto" className="font-display mt-3 text-4xl font-semibold sm:text-5xl">
          {title}
        </h1>
        {lede && (
          <p dir="auto" className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {lede}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Long-form body for the legal and about pages. These are written in English
 * only and deliberately not routed through the dictionary: machine-shaped
 * Urdu legal text would be worse than none, and this copy needs a lawyer
 * before it is relied on.
 */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <div
        dir="ltr"
        className="space-y-6 text-base leading-relaxed text-muted [&_a]:text-brand-ink [&_a]:underline [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ms-5 [&_li]:list-disc [&_p]:text-pretty [&_strong]:font-semibold [&_strong]:text-fg [&_ul]:space-y-2"
      >
        {children}
      </div>
    </section>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 dir="auto" className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
      {children}
    </h2>
  );
}

/**
 * Feature band. The track is duplicated so the translate can loop seamlessly;
 * the copy is aria-hidden so a screen reader hears the list once.
 */
export function FeatureMarquee() {
  const { dict } = useI18n();
  const items = [
    dict.landing.marquee1,
    dict.landing.marquee2,
    dict.landing.marquee3,
    dict.landing.marquee4,
    dict.landing.marquee5,
    dict.landing.marquee6,
    dict.landing.marquee7,
    dict.landing.marquee8,
  ];

  // The track is rendered twice so the 50% translate loops seamlessly. The
  // duplicate is aria-hidden, so the list is announced once.
  const track = (duplicate: boolean) => (
    <ul
      className="flex shrink-0 items-center gap-8 pe-8"
      aria-hidden={duplicate || undefined}
      dir="auto"
    >
      {items.map((label) => (
        <li key={label} className="flex shrink-0 items-center gap-8 text-sm font-medium">
          <span className="text-brand" aria-hidden>
            &#10022;
          </span>
          <span className="whitespace-nowrap text-fg">{label}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="overflow-hidden border-y border-border bg-surface py-4">
      {/* dir=ltr on the rail only: the animation translates one fixed way, and
          the items inside keep their own direction. */}
      <div className="flex" dir="ltr">
        <div className="marquee-track flex">
          {track(false)}
          {track(true)}
        </div>
      </div>
    </section>
  );
}

/**
 * Four figures, none of them invented. Hours, trade count, fee and payment
 * method are all things the product actually guarantees, so there is no
 * fabricated metric being animated for effect.
 */
export function StatsRow() {
  const { dict } = useI18n();
  const stats = [
    { value: dict.landing.statHoursValue, label: dict.landing.statHoursLabel },
    { value: dict.landing.statTradesValue, label: dict.landing.statTradesLabel },
    { value: dict.landing.statFeeValue, label: dict.landing.statFeeLabel },
    { value: dict.landing.statPayValue, label: dict.landing.statPayLabel },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ value, label }, i) => (
          <div
            key={label}
            className="animate-in-up border-s-2 border-brand/25 ps-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <dt dir="auto" className="font-display text-2xl font-semibold text-brand-ink sm:text-3xl">
              {value}
            </dt>
            <dd dir="auto" className="mt-1.5 text-sm leading-relaxed text-muted">
              {label}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FeatureGrid() {
  const { dict } = useI18n();
  const features = [
    { icon: Radio, title: dict.landing.f1Title, body: dict.landing.f1Body },
    { icon: HandCoins, title: dict.landing.f2Title, body: dict.landing.f2Body },
    { icon: Banknote, title: dict.landing.f3Title, body: dict.landing.f3Body },
    { icon: Navigation, title: dict.landing.f4Title, body: dict.landing.f4Body },
    { icon: Star, title: dict.landing.f5Title, body: dict.landing.f5Body },
    { icon: Languages, title: dict.landing.f6Title, body: dict.landing.f6Body },
  ];

  return (
    <section className="border-t border-border bg-surface/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <Eyebrow>{dict.landing.featuresEyebrow}</Eyebrow>
          <SectionTitle>{dict.landing.featuresTitle}</SectionTitle>
          <p dir="auto" className="mt-4 text-base leading-relaxed text-muted">
            {dict.landing.featuresSub}
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, i) => (
            <Card
              key={title}
              interactive
              className="animate-in-up p-5 sm:p-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-soft-fg">
                <Icon className="size-5" />
              </span>
              <div dir="auto">
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Scroll-snap rail rather than a second marquee: one auto-scrolling band per
 * page is plenty, and these are worth reading rather than watching go past.
 */
export function UseCases() {
  const { dict } = useI18n();
  const cases = [
    { icon: Droplets, title: dict.landing.case1Title, trade: dict.landing.case1Trade, body: dict.landing.case1Body },
    { icon: Zap, title: dict.landing.case2Title, trade: dict.landing.case2Trade, body: dict.landing.case2Body },
    { icon: Wind, title: dict.landing.case3Title, trade: dict.landing.case3Trade, body: dict.landing.case3Body },
    { icon: KeyRound, title: dict.landing.case4Title, trade: dict.landing.case4Trade, body: dict.landing.case4Body },
    { icon: Flame, title: dict.landing.case5Title, trade: dict.landing.case5Trade, body: dict.landing.case5Body },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <Eyebrow>{dict.landing.casesEyebrow}</Eyebrow>
        <SectionTitle>{dict.landing.casesTitle}</SectionTitle>
        <p dir="auto" className="mt-3 text-sm text-muted">
          {dict.landing.casesNote}
        </p>
      </div>

      <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {cases.map(({ icon: Icon, title, trade, body }) => (
          <li key={title} className="w-[17rem] shrink-0 snap-start sm:w-[19rem]">
            <Card className="flex h-full flex-col p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-urgent-soft text-urgent-soft-fg">
                <Icon className="size-5" />
              </span>
              <div dir="auto" className="mt-4 flex flex-1 flex-col">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-0.5 text-xs font-medium text-brand-ink">{trade}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ClosingCta() {
  const { dict } = useI18n();
  return (
    <section className="border-y border-brand/15 bg-brand-soft">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 dir="auto" className="font-display text-3xl font-semibold sm:text-4xl">
          {dict.landing.closingTitle}
        </h2>
        <p dir="auto" className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-soft-fg">
          {dict.landing.closingBody}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup?role=customer">
            <Button size="lg" className="w-full sm:w-auto">
              {dict.landing.ctaCustomer}
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
  );
}
