'use client';

import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Badge, Button, Card } from '@/components/ui';
import { formatPkr } from '@/lib/utils';

/**
 * The product, running, with no backend behind it.
 *
 * Deliberately built from the real Card / Badge / Button primitives rather
 * than divs shaped like a screenshot: it is a genuine miniature of the offer
 * flow, so it cannot drift from what the app actually looks like. Change the
 * tokens and this changes with them.
 *
 * Choreography is CSS animation-delay rather than a motion library. That keeps
 * the landing page's headline visual working before any JavaScript hydrates,
 * which matters more here than it would elsewhere: the audience is on cheap
 * Android hardware over mobile data.
 */

type MockOffer = { name: string; rating: number; jobs: number; eta: number; price: number };

// Plausible names and prices for Lahore. Nothing here is a real person.
const OFFERS: MockOffer[] = [
  { name: 'Imran Sadiq', rating: 4.8, jobs: 212, eta: 15, price: 2400 },
  { name: 'Bilal Ahmed', rating: 4.6, jobs: 96, eta: 25, price: 2100 },
  { name: 'Nadeem Butt', rating: 4.9, jobs: 340, eta: 40, price: 3200 },
];

export function HeroPreview() {
  const { dict, locale, fill } = useI18n();

  return (
    <div
      // Decorative: the copy beside it already says everything this shows.
      aria-hidden
      className="pointer-events-none select-none"
    >
      <div className="relative mx-auto w-full max-w-sm">
        <div
          className="absolute -inset-6 -z-10 rounded-3xl bg-brand-soft/60 blur-2xl"
          aria-hidden
        />

        <Card className="animate-in-up overflow-hidden p-5">
          <Badge tone="urgent">{dict.job.urgent}</Badge>

          {/* dir="auto": still English in both locales, so let the browser
              resolve direction from the content rather than the page. */}
          <h3 dir="auto" className="mt-2.5 text-lg font-semibold leading-snug">
            {dict.landing.previewJobTitle}
          </h3>

          <p dir="auto" className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" />
            {dict.landing.previewJobArea}
          </p>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {OFFERS.map((offer, i) => (
              <div
                key={offer.name}
                className="animate-in-up flex items-center gap-3 rounded-xl bg-surface-2 p-2.5"
                // Offers arrive one after another, which is the single idea
                // the whole product rests on.
                style={{ animationDelay: `${420 + i * 220}ms` }}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-fg">
                  {offer.name.slice(0, 1)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium">
                    {offer.name}
                    {i === 2 && <BadgeCheck className="size-3.5 shrink-0 text-brand" />}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="size-3 fill-star text-star" />
                      {offer.rating}
                    </span>
                    <span>{fill(dict.offer.arrivesIn, { n: offer.eta })}</span>
                  </p>
                </div>

                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {formatPkr(offer.price, locale)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="animate-in-up mt-4"
            style={{ animationDelay: `${420 + OFFERS.length * 220 + 160}ms` }}
          >
            <Button fullWidth size="sm">
              {dict.job.accept}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
