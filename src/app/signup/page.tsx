'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HardHat, MailCheck, UserRound, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PasswordInput,
  PhoneInput,
} from '@/components/ui';
import { cn, errorMessage, normalisePkPhone } from '@/lib/utils';
import type { UserRole } from '@/lib/types/database';

// The +92 is fixed furniture in the field, so state holds only what follows it.
const PK_LOCAL = /^[0-9]{10}$/;

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
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

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
    const localPhone = normalisePkPhone(phone);
    if (localPhone && !PK_LOCAL.test(localPhone)) {
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
        // Without this Supabase sends people to whatever Site URL is configured,
        // which is localhost on a fresh project and makes every confirmation
        // link dead for anyone who is not the developer.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
          role,
          phone: localPhone ? `+92${localPhone}` : null,
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

  const resend = async () => {
    setResending(true);
    setError(null);
    const { error: resendError } = await createClient().auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (resendError) setError(errorMessage(resendError, dict.common.error));
    else setResent(true);
    setResending(false);
  };

  if (notice) {
    return (
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand-soft-fg">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h2 className="font-display mt-4 text-xl font-semibold">{dict.auth.checkEmailTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{notice}</p>
        <p className="mt-1 text-sm font-medium text-fg" dir="ltr">
          {email.trim()}
        </p>

        <ErrorNote>{error}</ErrorNote>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login">
            <Button fullWidth>{dict.auth.loginAction}</Button>
          </Link>
          <Button variant="ghost" onClick={resend} loading={resending} disabled={resent}>
            {resent ? dict.auth.resentEmail : dict.auth.resendEmail}
          </Button>
        </div>
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
        <PhoneInput
          id="phone"
          value={phone}
          onChange={(e) => setPhone(normalisePkPhone(e.target.value))}
        />
      </Field>

      <Field label={dict.auth.password} htmlFor="password" required>
        <PasswordInput
          id="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          showLabel={dict.auth.showPassword}
          hideLabel={dict.auth.hidePassword}
        />
      </Field>

      <ErrorNote>{error}</ErrorNote>

      <Button type="submit" size="lg" fullWidth loading={loading}>
        {dict.auth.signupAction}
      </Button>

      <p className="text-center text-sm text-muted">
        {dict.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-brand-ink hover:underline">
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
