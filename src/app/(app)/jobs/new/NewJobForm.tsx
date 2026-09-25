'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from '@/components/ui';
import { LocationPicker } from '@/components/map/LocationPicker';
import { cn, errorMessage } from '@/lib/utils';
import type { LatLng } from '@/lib/map';
import type { ServiceCategory } from '@/lib/types/database';

export function NewJobForm({ categories }: { categories: ServiceCategory[] }) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [radius, setRadius] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!position) {
      setError(dict.job.locationHint);
      return;
    }

    setLoading(true);
    const { data, error: rpcError } = await createClient().rpc('create_job', {
      p_category_id: categoryId,
      p_title: title.trim(),
      p_description: description.trim(),
      p_lat: position.lat,
      p_lng: position.lng,
      p_address_text: address.trim(),
      p_budget_pkr: budget ? Number(budget) : null,
      p_is_urgent: isUrgent,
      p_notify_radius_km: radius,
    });

    if (rpcError || !data) {
      setError(errorMessage(rpcError, dict.common.error));
      setLoading(false);
      return;
    }

    toast.success(dict.job.posted);
    router.push(`/jobs/${data.id}`);
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">{dict.job.newTitle}</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Card className="space-y-5 p-5">
          <Field label={dict.job.trade} htmlFor="category" required>
            <Select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === 'ur' ? c.name_ur : c.name_en}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={dict.job.title} htmlFor="title" required>
            <Input
              id="title"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={dict.job.titlePlaceholder}
            />
          </Field>

          <Field label={dict.job.description} htmlFor="description" required>
            <Textarea
              id="description"
              required
              minLength={10}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dict.job.descriptionPlaceholder}
            />
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <p className="text-sm font-medium">{dict.job.location}</p>
          <LocationPicker value={position} onChange={setPosition} />

          <Field label={dict.job.address} htmlFor="address" required>
            <Input
              id="address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={dict.job.addressPlaceholder}
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-5">
          <Field label={dict.job.budget} htmlFor="budget" hint={dict.job.budgetHint}>
            <Input
              id="budget"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="2000"
              dir="ltr"
            />
          </Field>

          <div>
            <label
              htmlFor="radius"
              className="flex items-baseline justify-between text-sm font-medium"
            >
              {dict.job.radius}
              <span className="text-muted">
                {radius} {dict.common.km}
              </span>
            </label>
            <input
              id="radius"
              type="range"
              min={1}
              max={30}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-brand"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsUrgent((v) => !v)}
            aria-pressed={isUrgent}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border p-3.5 text-start transition-colors',
              isUrgent
                ? 'border-urgent bg-urgent-soft'
                : 'border-border bg-surface hover:bg-surface-2',
            )}
          >
            <AlertTriangle
              className={cn('mt-0.5 size-5 shrink-0', isUrgent ? 'text-urgent-soft-fg' : 'text-muted')}
            />
            <span>
              <span className="block text-sm font-semibold">{dict.job.urgent}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">
                {dict.job.urgentHint}
              </span>
            </span>
          </button>
        </Card>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? dict.job.posting : dict.job.post}
        </Button>
      </form>
    </div>
  );
}
