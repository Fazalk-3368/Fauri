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
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

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

    // With email confirmation switched on there is no session yet, so we ask
    // for the code instead of sending people off to a link. A link has to come
    // back to an allowlisted redirect URL; a code does not, which removes the
    // whole class of "the email took me to the wrong site" failures.
    if (!data.session) {
      setAwaitingCode(true);
      setLoading(false);
      return;
    }

    router.push(role === 'provider' ? '/provider/setup' : '/dashboard');
    router.refresh();
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError(dict.auth.codeTooShort);
      return;
    }

    setVerifying(true);
    const { error: otpError } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'signup',
    });

    if (otpError) {
      setError(errorMessage(otpError, dict.common.error));
      setVerifying(false);
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
    });
    if (resendError) setError(errorMessage(resendError, dict.common.error));
    else setResent(true);
    setResending(false);
  };

  if (awaitingCode) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand-soft-fg">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <h2 className="font-display mt-4 text-xl font-semibold">{dict.auth.codeTitle}</h2>
          <p className="mt-2 text-sm text-muted">{dict.auth.codeSentTo}</p>
          <p className="mt-0.5 text-sm font-medium text-fg" dir="ltr">
            {email.trim()}
          </p>
        </div>

        <form onSubmit={verify} className="mt-6 space-y-4">
          <Field label={dict.auth.code} htmlFor="code" required>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              // Six digits read as a group, so give them room and centre them.
              className="text-center text-2xl font-semibold tracking-[0.5em] tabular-nums"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />
          </Field>

          <ErrorNote>{error}</ErrorNote>

          <Button type="submit" size="lg" fullWidth loading={verifying}>
            {dict.auth.verifyAction}
          </Button>

          <div className="flex flex-col gap-1.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={resend}
              loading={resending}
              disabled={resent}
            >
              {resent ? dict.auth.resentEmail : dict.auth.resendEmail}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAwaitingCode(false);
                setCode('');
                setResent(false);
                setError(null);
              }}
            >
              {dict.auth.wrongEmail}
            </Button>
          </div>
        </form>
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
