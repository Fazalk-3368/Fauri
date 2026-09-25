'use client';

import { useState } from 'react';
import { BadgeCheck, Clock, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { Badge, Button, Card, Dialog, EmptyState } from '@/components/ui';
import { errorMessage, formatPkr } from '@/lib/utils';
import type { JobDetailOffer } from '@/lib/types/database';

export function OfferList({
  offers,
  canAccept,
  onAccepted,
}: {
  offers: JobDetailOffer[];
  canAccept: boolean;
  onAccepted: () => void;
}) {
  const { dict, locale, fill } = useI18n();
  const toast = useToast();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<JobDetailOffer | null>(null);

  const pending = offers.filter((o) => o.status === 'pending' || o.status === 'accepted');

  const accept = async (offer: JobDetailOffer) => {
    setConfirming(null);
    setAcceptingId(offer.id);
    const { error } = await createClient().rpc('accept_offer', { p_offer_id: offer.id });

    if (error) {
      toast.error(errorMessage(error, dict.common.error));
    } else {
      onAccepted();
    }
    setAcceptingId(null);
  };

  // Accepting is the decisive moment in the whole product, so it gets a real
  // dialog rather than a browser confirm sheet with a URL in the title.
  const confirmDialog = (
    <Dialog
      open={confirming !== null}
      onClose={() => setConfirming(null)}
      title={dict.job.accept}
      description={
        confirming
          ? fill(dict.job.acceptConfirm, {
              price: formatPkr(confirming.price_pkr, locale),
              name: confirming.provider_name,
            })
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            {dict.common.cancel}
          </Button>
          <Button onClick={() => confirming && accept(confirming)}>{dict.common.confirm}</Button>
        </>
      }
    />
  );

  if (pending.length === 0) {
    return <EmptyState icon={Clock} title={dict.job.noOffersYet} />;
  }

  return (
    <div className="space-y-3">
      {confirmDialog}
      {pending.map((offer) => (
        <Card key={offer.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{offer.provider_name}</p>
                {offer.verification_status === 'verified' && (
                  <BadgeCheck className="size-4 shrink-0 text-brand" aria-label="verified" />
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-current text-urgent" />
                  {offer.rating_count > 0
                    ? `${Number(offer.rating_avg).toFixed(1)} (${offer.rating_count})`
                    : dict.common.none}
                </span>
                <span>
                  {offer.jobs_completed} {dict.earnings.jobsDone}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {fill(dict.offer.arrivesIn, { n: offer.eta_minutes })}
                </span>
              </div>

              {offer.message && (
                <p className="mt-2 text-sm text-muted">{offer.message}</p>
              )}
            </div>

            <div className="shrink-0 text-end">
              <p className="text-lg font-bold">{formatPkr(offer.price_pkr, locale)}</p>
              {offer.status === 'accepted' ? (
                <Badge tone="brand" className="mt-2">
                  {dict.offer.accepted}
                </Badge>
              ) : canAccept ? (
                <Button
                  size="sm"
                  className="mt-2"
                  loading={acceptingId === offer.id}
                  onClick={() => setConfirming(offer)}
                >
                  {dict.job.accept}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
