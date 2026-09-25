'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  Star,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useJobDetail } from '@/lib/hooks/useJobDetail';
import { useToast } from '@/components/ui/toast';
import { Badge, Button, Card, ErrorNote, Field, Input } from '@/components/ui';
import { MapCanvas, type MapMarker } from '@/components/map/MapCanvas';
import { OfferList } from './OfferList';
import { OfferForm } from './OfferForm';
import { JobChat } from './JobChat';
import { ReviewForm } from './ReviewForm';
import { JOB_STATUS_TONE, isActive } from '@/lib/jobs';
import { errorMessage, formatPkr } from '@/lib/utils';
import type { JobDetail, JobStatus } from '@/lib/types/database';

export function JobDetailView({
  initial,
  viewerId,
}: {
  initial: JobDetail;
  viewerId: string;
}) {
  const { dict, locale, fill } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const { detail, refresh } = useJobDetail(initial.job.id, initial);
  const { job, category, customer, provider, offers, events, my_review: myReview } = detail;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [finalAmount, setFinalAmount] = useState(String(job.final_amount_pkr ?? ''));

  const isCustomer = viewerId === job.customer_id;
  const isAssignedProvider = viewerId === job.assigned_provider_id;
  const myOffer = offers.find((o) => o.provider_id === viewerId) ?? null;
  const categoryName = locale === 'ur' ? category.name_ur : category.name_en;

  const counterpart = isCustomer ? provider : { id: customer.id, full_name: customer.full_name };
  const counterpartPhone = isCustomer ? provider?.phone : customer.phone;

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [
      {
        id: 'job',
        position: { lat: detail.lat, lng: detail.lng },
        kind: job.is_urgent && isActive(job.status) ? 'urgent' : 'job',
      },
    ];
    // Show the tradesman's live pin only while they are actually travelling.
    if (
      provider?.lat != null &&
      provider.lng != null &&
      (job.status === 'assigned' || job.status === 'en_route')
    ) {
      list.push({
        id: 'provider',
        position: { lat: provider.lat, lng: provider.lng },
        kind: 'provider',
        label: provider.full_name,
      });
    }
    return list;
  }, [detail.lat, detail.lng, job.is_urgent, job.status, provider]);

  // PostgREST builders are thenables, not Promises, so accept PromiseLike.
  const run = async (fn: () => PromiseLike<{ error: unknown }>) => {
    setBusy(true);
    setError(null);
    const { error: opError } = await fn();
    if (opError) {
      setError(errorMessage(opError, dict.common.error));
    } else {
      await refresh();
      router.refresh();
    }
    setBusy(false);
  };

  const setStatus = (status: JobStatus) =>
    run(() => createClient().rpc('update_job_status', { p_job_id: job.id, p_status: status }));

  const cancel = async () => {
    const reason = window.prompt(dict.job.cancelReason);
    if (reason === null) return;
    await run(() => createClient().rpc('cancel_job', { p_job_id: job.id, p_reason: reason }));
  };

  // What the winning bid was. complete_job() lets the provider settle at or
  // above it, but only the customer may close below.
  const agreed = job.final_amount_pkr == null ? null : Number(job.final_amount_pkr);

  const complete = async () => {
    const amount = Number(finalAmount);
    if (!amount || amount <= 0) {
      setError(dict.job.completeHint);
      return;
    }
    if (isAssignedProvider && agreed != null && amount < agreed) {
      setError(fill(dict.job.belowAgreed, { price: formatPkr(agreed, locale) }));
      return;
    }
    await run(() =>
      createClient().rpc('complete_job', { p_job_id: job.id, p_final_amount: amount }),
    );
    setCompleting(false);
    toast.success(dict.job.status.completed);
  };

  // Mirrors can_view_job_chat(): once the customer has picked someone, the
  // conversation closes to the providers who bid and lost.
  const canChat =
    isActive(job.status) &&
    (isCustomer ||
      isAssignedProvider ||
      (!job.assigned_provider_id && myOffer?.status === 'pending'));
  const canReview =
    job.status === 'completed' && !myReview && counterpart != null && (isCustomer || isAssignedProvider);

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={JOB_STATUS_TONE[job.status]}>{dict.job.status[job.status]}</Badge>
          {job.is_urgent && isActive(job.status) && <Badge tone="urgent">{dict.job.urgent}</Badge>}
          <span className="text-sm text-muted">{categoryName}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold">{job.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {fill(dict.job.postedAt, {
            time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <MapCanvas
              className="h-56 rounded-none"
              center={{ lat: detail.lat, lng: detail.lng }}
              markers={markers}
              fitMarkers={markers.length > 1}
              zoom={15}
            />
            <div className="space-y-3 p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.description}</p>

              <p className="flex items-start gap-2 text-sm text-muted">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {job.address_text}
              </p>

              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted">
                    {job.status === 'completed' ? dict.job.finalAmount : dict.job.budget}
                  </p>
                  <p className="text-lg font-bold">
                    {formatPkr(job.final_amount_pkr ?? job.budget_pkr, locale)}
                  </p>
                </div>
                {job.scheduled_for && (
                  <div>
                    <p className="text-xs text-muted">{dict.job.timeline}</p>
                    <p className="text-sm font-medium">
                      {format(new Date(job.scheduled_for), 'PPp')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* The other party. A customer sees their tradesman (with rating);
              the tradesman sees their customer. Never yourself. */}
          {counterpart && (isCustomer || isAssignedProvider) && (
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  {isCustomer ? dict.job.assignedTo : dict.auth.customer}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate font-semibold">{counterpart.full_name}</p>
                  {isCustomer && provider?.verification_status === 'verified' && (
                    <BadgeCheck className="size-4 shrink-0 text-brand" />
                  )}
                </div>
                {isCustomer && provider && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Star className="size-3.5 fill-current text-urgent" />
                    {provider.rating_count > 0
                      ? `${Number(provider.rating_avg).toFixed(1)} (${provider.rating_count})`
                      : dict.common.none}
                  </p>
                )}
              </div>
              {counterpartPhone && (
                <a href={`tel:${counterpartPhone}`}>
                  <Button variant="secondary" size="sm">
                    <Phone className="size-4" />
                    <span dir="ltr">{counterpartPhone}</span>
                  </Button>
                </a>
              )}
            </Card>
          )}

          {canChat && (
            <JobChat jobId={job.id} viewerId={viewerId} disabled={!isActive(job.status)} />
          )}

          {/* timeline */}
          {events.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold">{dict.job.timeline}</h2>
              <ol className="mt-4 space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {event.to_status
                          ? dict.job.status[event.to_status]
                          : event.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted">
                        {event.actor_name ? `${event.actor_name} · ` : ''}
                        {format(new Date(event.created_at), 'PPp')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* action rail */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ErrorNote>{error}</ErrorNote>

          {/* provider bidding on an open job */}
          {!isCustomer && job.status === 'open' && (
            <OfferForm
              jobId={job.id}
              providerId={viewerId}
              existing={myOffer}
              suggestedPrice={job.budget_pkr}
              onChanged={() => {
                void refresh();
                router.refresh();
              }}
            />
          )}

          {/* provider working the job */}
          {isAssignedProvider && isActive(job.status) && (
            <Card className="space-y-3 p-5">
              {job.status === 'assigned' && (
                <Button fullWidth loading={busy} onClick={() => setStatus('en_route')}>
                  <Truck className="size-4" />
                  {dict.provider.onMyWay}
                </Button>
              )}
              {job.status === 'en_route' && (
                <Button fullWidth loading={busy} onClick={() => setStatus('in_progress')}>
                  <Wrench className="size-4" />
                  {dict.provider.startWork}
                </Button>
              )}
              {!completing ? (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setCompleting(true)}
                  disabled={busy}
                >
                  <CheckCircle2 className="size-4" />
                  {dict.job.complete}
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <Field
                    label={dict.job.finalAmount}
                    htmlFor="final"
                    hint={
                      agreed != null
                        ? fill(dict.job.agreedHint, { price: formatPkr(agreed, locale) })
                        : dict.job.completeHint
                    }
                    required
                  >
                    <Input
                      id="final"
                      type="number"
                      min={agreed ?? 1}
                      step={1}
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(e.target.value)}
                      dir="ltr"
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button fullWidth loading={busy} onClick={complete}>
                      {busy ? dict.job.completing : dict.common.confirm}
                    </Button>
                    <Button variant="ghost" onClick={() => setCompleting(false)} disabled={busy}>
                      {dict.common.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* customer looking at offers */}
          {isCustomer && (
            <>
              {job.status === 'open' && (
                <section className="space-y-3">
                  <h2 className="font-semibold">{dict.job.offers}</h2>
                  <OfferList
                    offers={offers}
                    canAccept
                    onAccepted={() => {
                      void refresh();
                      router.refresh();
                      toast.success(dict.offer.accepted);
                    }}
                  />
                </section>
              )}

              {isActive(job.status) && (
                <Card className="space-y-3 p-5">
                  {job.status !== 'open' && (
                    <Button
                      variant="secondary"
                      fullWidth
                      loading={busy}
                      onClick={() => setCompleting(true)}
                      disabled={completing}
                    >
                      <CheckCircle2 className="size-4" />
                      {dict.job.complete}
                    </Button>
                  )}
                  {completing && isCustomer && (
                    <div className="space-y-3 rounded-xl border border-border p-3">
                      <Field label={dict.job.finalAmount} htmlFor="final-c" required>
                        <Input
                          id="final-c"
                          type="number"
                          min={1}
                          step={1}
                          value={finalAmount}
                          onChange={(e) => setFinalAmount(e.target.value)}
                          dir="ltr"
                        />
                      </Field>
                      <Button fullWidth loading={busy} onClick={complete}>
                        {dict.common.confirm}
                      </Button>
                    </div>
                  )}
                  <Button variant="ghost" fullWidth loading={busy} onClick={cancel}>
                    <XCircle className="size-4" />
                    {dict.job.cancelJob}
                  </Button>
                </Card>
              )}
            </>
          )}

          {/* provider's own bid status on a job that went elsewhere */}
          {!isCustomer && !isAssignedProvider && job.status !== 'open' && myOffer && (
            <Card className="p-5 text-sm text-muted">{dict.offer[myOffer.status]}</Card>
          )}

          {canReview && counterpart && (
            <ReviewForm
              jobId={job.id}
              reviewerId={viewerId}
              revieweeId={counterpart.id}
              revieweeName={counterpart.full_name}
              onSubmitted={() => {
                void refresh();
                router.refresh();
              }}
            />
          )}

          {myReview && (
            <Card className="p-5">
              <p className="text-sm text-muted">{dict.review.done}</p>
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: myReview.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-urgent text-urgent" />
                ))}
              </div>
            </Card>
          )}

          {job.status === 'cancelled' && job.cancel_reason && (
            <Card className="p-5">
              <p className="text-xs text-muted">{dict.job.cancelReason}</p>
              <p className="mt-1 text-sm">{job.cancel_reason}</p>
            </Card>
          )}

          {/* a provider still waiting on an answer */}
          {!isCustomer && job.status === 'open' && myOffer?.status === 'pending' && (
            <Card className="flex items-center gap-2 p-4 text-sm text-muted">
              <Navigation className="size-4" />
              {dict.offer.pending}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
