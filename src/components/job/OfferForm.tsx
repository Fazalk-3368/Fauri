'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { Badge, Button, Card, ErrorNote, Field, Input, Textarea } from '@/components/ui';
import { errorMessage, formatPkr } from '@/lib/utils';
import type { JobDetailOffer } from '@/lib/types/database';

export function OfferForm({
  jobId,
  providerId,
  existing,
  suggestedPrice,
  onChanged,
}: {
  jobId: string;
  providerId: string;
  existing: JobDetailOffer | null;
  suggestedPrice: number | null;
  onChanged: () => void;
}) {
  const { dict, locale } = useI18n();
  const toast = useToast();

  const [price, setPrice] = useState(
    existing ? String(existing.price_pkr) : suggestedPrice ? String(suggestedPrice) : '',
  );
  const [eta, setEta] = useState(existing ? String(existing.eta_minutes) : '30');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const payload = {
      price_pkr: Number(price),
      eta_minutes: Number(eta),
      message: message.trim() || null,
    };

    const { error: writeError } = existing
      ? await supabase.from('job_offers').update(payload).eq('id', existing.id)
      : await supabase.from('job_offers').insert({
          ...payload,
          job_id: jobId,
          provider_id: providerId,
          status: 'pending',
        });

    if (writeError) {
      setError(errorMessage(writeError, dict.common.error));
      setLoading(false);
      return;
    }

    toast.success(dict.offer.sent);
    setLoading(false);
    onChanged();
  };

  const withdraw = async () => {
    if (!existing) return;
    setLoading(true);
    const { error: writeError } = await createClient()
      .from('job_offers')
      .update({ status: 'withdrawn' })
      .eq('id', existing.id);

    if (writeError) toast.error(errorMessage(writeError, dict.common.error));
    else onChanged();
    setLoading(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{existing ? dict.offer.yours : dict.offer.make}</h2>
        {existing && (
          <Badge tone={existing.status === 'pending' ? 'brand' : 'neutral'}>
            {dict.offer[existing.status]}
          </Badge>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={dict.offer.yourPrice}
            htmlFor="price"
            required
            hint={
              suggestedPrice
                ? `${dict.job.budget}: ${formatPkr(suggestedPrice, locale)}`
                : undefined
            }
          >
            <Input
              id="price"
              type="number"
              inputMode="numeric"
              min={1}
              step={50}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              dir="ltr"
            />
          </Field>

          <Field label={dict.offer.eta} htmlFor="eta" required>
            <Input
              id="eta"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              required
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              dir="ltr"
            />
          </Field>
        </div>

        <Field label={dict.offer.note} htmlFor="message">
          <Textarea
            id="message"
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={dict.offer.notePlaceholder}
            className="min-h-20"
          />
        </Field>

        <ErrorNote>{error}</ErrorNote>

        <div className="flex gap-2">
          <Button type="submit" loading={loading} fullWidth>
            {loading ? dict.offer.sending : existing ? dict.offer.update : dict.offer.send}
          </Button>
          {existing && existing.status === 'pending' && (
            <Button type="button" variant="secondary" onClick={withdraw} disabled={loading}>
              {dict.offer.withdraw}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
