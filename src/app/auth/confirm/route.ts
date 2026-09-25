import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/utils';

/**
 * Confirms an email link that carries a `token_hash`.
 *
 * This exists alongside /auth/callback because the two link shapes fail in
 * different places. The callback exchanges a PKCE `code`, which needs the
 * verifier stored by the browser that started the signup: open that link on a
 * phone after signing up on a laptop and it cannot work. A token_hash is
 * self-contained, so this route confirms the account wherever the mail is
 * opened, which is how people actually read email.
 *
 * The proxy already listed /auth/confirm as public; only the route was missing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
