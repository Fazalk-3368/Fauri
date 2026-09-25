'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { Button, ErrorNote, Field, Input, PasswordInput } from '@/components/ui';
import { errorMessage, safeNext } from '@/lib/utils';

function LoginForm() {
  const { dict } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(errorMessage(authError, dict.common.error));
      setLoading(false);
      return;
    }

    router.push(safeNext(params.get('next')));
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={dict.auth.email} htmlFor="email" required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
        />
      </Field>

      <Field label={dict.auth.password} htmlFor="password" required>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showLabel={dict.auth.showPassword}
          hideLabel={dict.auth.hidePassword}
        />
      </Field>

      <ErrorNote>{error}</ErrorNote>

      <Button type="submit" size="lg" fullWidth loading={loading}>
        {dict.auth.loginAction}
      </Button>

      <p className="text-center text-sm text-muted">
        {dict.auth.noAccount}{' '}
        <Link href="/signup" className="font-medium text-brand-ink hover:underline">
          {dict.auth.signupAction}
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const { dict } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-fg">
          <Wrench className="size-4" />
        </span>
        {dict.common.appName}
      </Link>

      <h1 className="text-2xl font-bold">{dict.auth.loginTitle}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{dict.auth.loginSub}</p>

      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
