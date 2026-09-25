'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { Button, Card, ErrorNote, Field, Input, Textarea } from '@/components/ui';
import { cn, errorMessage } from '@/lib/utils';
import type { ProviderProfile, ServiceCategory } from '@/lib/types/database';

export function ProviderSetupForm({
  userId,
  categories,
  providerProfile,
  selectedCategoryIds,
}: {
  userId: string;
  categories: ServiceCategory[];
  providerProfile: ProviderProfile | null;
  selectedCategoryIds: string[];
}) {
  const { dict, locale } = useI18n();
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>(selectedCategoryIds);
  const [bio, setBio] = useState(providerProfile?.bio ?? '');
  const [experience, setExperience] = useState(String(providerProfile?.experience_years ?? 0));
  const [radius, setRadius] = useState(Number(providerProfile?.service_radius_km ?? 10));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selected.length === 0) {
      setError(dict.onboarding.pickAtLeastOne);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: profileError } = await supabase
      .from('provider_profiles')
      .update({
        bio: bio.trim() || null,
        experience_years: Number(experience) || 0,
        service_radius_km: radius,
      })
      .eq('user_id', userId);

    if (profileError) {
      setError(errorMessage(profileError, dict.common.error));
      setLoading(false);
      return;
    }

    // Diff against what was already stored, so an unchanged selection costs no
    // writes and an edit never drops rows it is about to re-add.
    const toRemove = selectedCategoryIds.filter((id) => !selected.includes(id));
    const toAdd = selected.filter((id) => !selectedCategoryIds.includes(id));

    if (toRemove.length > 0) {
      await supabase
        .from('provider_services')
        .delete()
        .eq('provider_id', userId)
        .in('category_id', toRemove);
    }
    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from('provider_services')
        .insert(toAdd.map((category_id) => ({ provider_id: userId, category_id })));
      if (addError) {
        setError(errorMessage(addError, dict.common.error));
        setLoading(false);
        return;
      }
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">{dict.onboarding.title}</h1>
      <p className="mt-1 text-sm text-muted">{dict.onboarding.sub}</p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <Card className="p-5">
          <p className="text-sm font-medium">{dict.onboarding.trades}</p>
          <p className="mt-0.5 text-xs text-muted">{dict.onboarding.tradesHint}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((c) => {
              const active = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border p-3 text-start text-sm font-medium transition-colors',
                    active
                      ? 'border-brand bg-brand-soft text-brand-soft-fg'
                      : 'border-border bg-surface hover:bg-surface-2',
                  )}
                >
                  <span className="truncate">{locale === 'ur' ? c.name_ur : c.name_en}</span>
                  {active && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-5 p-5">
          <Field label={dict.onboarding.bio} htmlFor="bio">
            <Textarea
              id="bio"
              maxLength={600}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={dict.onboarding.bioPlaceholder}
            />
          </Field>

          <Field label={dict.onboarding.experience} htmlFor="experience">
            <Input
              id="experience"
              type="number"
              min={0}
              max={70}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              dir="ltr"
            />
          </Field>

          <div>
            <label
              htmlFor="radius"
              className="flex items-baseline justify-between text-sm font-medium"
            >
              {dict.onboarding.radius}
              <span className="text-muted">
                {radius} {dict.common.km}
              </span>
            </label>
            <input
              id="radius"
              type="range"
              min={1}
              max={50}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-brand"
            />
            <p className="mt-1 text-xs text-muted">{dict.onboarding.radiusHint}</p>
          </div>
        </Card>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {dict.onboarding.finish}
        </Button>
      </form>
    </div>
  );
}
