import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/AppHeader';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // The handle_new_user trigger creates this row; if it is missing the account
  // is in a broken state and a fresh sign-in is the safest recovery.
  if (!profile) redirect('/login?error=no-profile');

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader profile={profile} />
      {/* pb-24 below sm clears the fixed tab bar; without it the last card on
          every page sits underneath it. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
