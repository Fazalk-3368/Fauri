'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HardHat, UserRound, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { Button, Card, ErrorNote, Field, Input } from '@/components/ui';
import { cn, errorMessage } from '@/lib/utils';
import type { UserRole } from '@/lib/types/database';

const PK_PHONE = /^\+92[0-9]{10}$/;

function SignupForm() {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const [role, setRole] = useState<Extract<UserRole, 'customer' | 'provider'>>(
    params.get('role') === 'provider' ? 'provider' : 'customer',
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    {
      value: 'customer' as const,
      icon: UserRound,
      label: dict.auth.customer,
      hint: dict.auth.customerHint,
    },
    {
      value: 'provider' as const,
      icon: HardHat,
      label: dict.auth.provider,
      hint: dict.auth.providerHint,
    },
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(dict.auth.passwordTooShort);
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !PK_PHONE.test(trimmedPhone)) {
      setError(dict.auth.invalidPhone);
      return;
    }

    setLoading(true);

    // These land in raw_user_meta_data, which the handle_new_user trigger
    // reads to build the profile row (and provider_profiles for tradesmen).
    const { data, error: authError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          phone: trimmedPhone || null,
          locale,
        },
      },
    });

    if (authError) {
      setError(errorMessage(authError, dict.common.error));
      setLoading(false);
      return;
    }

    // With email confirmation switched on there is no session yet.
    if (!data.session) {
      setNotice(dict.auth.checkEmail);
      setLoading(false);
      return;
    }

    router.push(role === 'provider' ? '/provider/setup' : '/dashboard');
    router.refresh();
  };

  if (notice) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-fg">{notice}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="secondary">{dict.auth.loginAction}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{dict.auth.iAmA}</legend>
        <div className="grid grid-cols-2 gap-3">
          {roleOptions.map(({ value, icon: Icon, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={cn(
                'rounded-xl border p-3.5 text-start transition-colors',
                role === value
                  ? 'border-brand bg-brand-soft'
                  : 'border-border bg-surface hover:bg-surface-2',
              )}
            >
              <Icon className={cn('size-5', role === value ? 'text-brand-soft-fg' : 'text-muted')} />
              <p className="mt-2 text-sm font-semibold">{label}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label={dict.auth.fullName} htmlFor="fullName" required>
        <Input
          id="fullName"
          required
          minLength={2}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </Field>

      <Field label={dict.auth.email} htmlFor="email" required>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          dir="ltr"
        />
      </Field>

      <Field label={dict.auth.phone} htmlFor="phone" hint={dict.auth.phoneHint}>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+923001234567"
          autoComplete="tel"
          dir="ltr"
        />
      </Field>

      <Field label={dict.auth.password} htmlFor="password" required>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          dir="ltr"
        />
      </Field>

      <ErrorNote>{error}</ErrorNote>

      <Button type="submit" size="lg" fullWidth loading={loading}>
        {dict.auth.signupAction}
      </Button>

      <p className="text-center text-sm text-muted">
        {dict.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {dict.auth.loginAction}
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  const { dict } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg">
          <Wrench className="size-4" />
        </span>
        {dict.common.appName}
      </Link>

      <h1 className="text-2xl font-bold">{dict.auth.signupTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{dict.auth.signupSub}</p>

      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
