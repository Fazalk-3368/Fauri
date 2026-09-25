'use client';

import Link from 'next/link';
import { Banknote, Check, Wrench } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Badge, Button, Card } from '@/components/ui';
import { ClosingCta, PageHero, Prose } from '@/components/landing/Sections';

/**
 * English only, like the legal pages: this describes a commercial arrangement
 * and the wording matters more than the reach. It should be translated by a
 * person, not inferred.
 */
export default function PricingPage() {
  const { dict } = useI18n();

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Free to call. A small share when you earn."
        lede="Customers pay nothing to use Fauri. Tradesmen keep the cash and settle the platform share afterwards."
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex flex-col p-6 sm:p-8" dir="ltr">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-fg">
              <Banknote className="size-5" />
            </span>
            <h2 className="font-display mt-5 text-2xl font-semibold text-fg">Customers</h2>
            <p className="font-display mt-3 text-4xl font-semibold text-brand-ink">Free</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Posting a job, comparing offers and accepting one cost nothing. You pay the tradesman
              the agreed amount, in cash, when the work is finished.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                'No booking fee, ever',
                'No card and no payment gateway',
                'Post as many jobs as you need',
                'Compare every offer before choosing',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-2">
              <Link href="/signup?role=customer">
                <Button fullWidth size="lg">
                  {dict.landing.ctaCustomer}
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col border-brand/30 p-6 sm:p-8" dir="ltr">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-fg">
                <Wrench className="size-5" />
              </span>
              <Badge tone="brand">Cash stays with you</Badge>
            </div>
            <h2 className="font-display mt-5 text-2xl font-semibold text-fg">Tradesmen</h2>
            <p className="font-display mt-3 text-4xl font-semibold text-brand-ink">
              10<span className="text-2xl">% per completed job</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You take the full amount from the customer at the door. Fauri records its share
              against your account, and you settle it separately. Nothing is deducted up front.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                'Free to join and to bid',
                'Charged only on jobs you complete',
                'Nothing owed on a job you did not win',
                'Every amount owed itemised on your earnings page',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-2">
              <Link href="/signup?role=provider">
                <Button fullWidth size="lg">
                  {dict.landing.ctaProvider}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <Prose>
        <h2>How the share is worked out</h2>
        <p>
          When a job is marked complete, the final amount is recorded and the platform share is
          calculated from it. The rate is held per tradesman, so it can be adjusted individually,
          and it is <strong>10% by default</strong>.
        </p>
        <p>
          The amount is anchored to the offer the customer accepted. A tradesman can close a job at
          or above that figure if the work turned out larger; only the customer can close it below,
          which stops the share being quietly reduced after the fact. Both figures are recorded
          against the job.
        </p>
        <h2>What is not built yet</h2>
        <p>
          There is <strong>no settlement flow</strong> in the product today. Amounts owed are
          recorded and shown on the earnings page, but paying them is arranged outside the app.
          This page describes the intended model, not a live billing system.
        </p>
      </Prose>

      <ClosingCta />
    </>
  );
}
