'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { Badge, Button, Card, ErrorNote, Field, Input, PhoneInput } from '@/components/ui';
import { errorMessage, normalisePkPhone } from '@/lib/utils';
import type { Profile, ProviderProfile } from '@/lib/types/database';

// The +92 is fixed furniture in the field, so state holds only what follows it.
const PK_LOCAL = /^[0-9]{10}$/;

export function ProfileForm({
  profile,
  providerProfile,
  email,
}: {
  profile: Profile;
  providerProfile: ProviderProfile | null;
  email: string;
}) {
  const { dict, locale, setLocale } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const [fullName, setFullName] = useState(profile.full_name);
  // Stored values carry the +92; the field shows only the local digits.
  const [phone, setPhone] = useState(normalisePkPhone(profile.phone ?? ''));
  const [city, setCity] = useState(profile.city ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const localPhone = normalisePkPhone(phone);
    if (localPhone && !PK_LOCAL.test(localPhone)) {
      setError(dict.auth.invalidPhone);
      return;
    }

    setLoading(true);
    const { error: writeError } = await createClient()
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: localPhone ? `+92${localPhone}` : null,
        city: city.trim() || null,
        locale,
      })
      .eq('id', profile.id);

    if (writeError) {
      setError(errorMessage(writeError, dict.common.error));
    } else {
      toast.success(dict.common.save);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-lg font-semibold">
          {profile.full_name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={profile.role === 'provider' ? 'brand' : 'neutral'}>
              {profile.role === 'provider' ? dict.auth.provider : dict.auth.customer}
            </Badge>
            {providerProfile && providerProfile.rating_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Star className="size-3.5 fill-current text-urgent" />
                {Number(providerProfile.rating_avg).toFixed(1)} ({providerProfile.rating_count})
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        <Card className="space-y-4 p-5">
          <Field label={dict.auth.email} htmlFor="email">
            <Input id="email" value={email} disabled dir="ltr" />
          </Field>

          <Field label={dict.auth.fullName} htmlFor="fullName" required>
            <Input
              id="fullName"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label={dict.auth.phone} htmlFor="phone" hint={dict.auth.phoneHint}>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={(e) => setPhone(normalisePkPhone(e.target.value))}
            />
          </Field>

          <Field label="City" htmlFor="city">
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">{dict.nav.profile}</p>
              <p className="text-xs text-muted">{locale === 'ur' ? 'اردو' : 'English'}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLocale(locale === 'en' ? 'ur' : 'en')}
            >
              {dict.common.language}
            </Button>
          </div>
        </Card>

        <ErrorNote>{error}</ErrorNote>

        <div className="flex gap-2">
          <Button type="submit" loading={loading}>
            {loading ? dict.common.saving : dict.common.save}
          </Button>
          {profile.role === 'provider' && (
            <Link href="/provider/setup">
              <Button type="button" variant="secondary">
                {dict.onboarding.title}
              </Button>
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
