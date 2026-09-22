import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
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
  if (!profile) redirect('/login');

  const { data: providerProfile } =
    profile.role === 'provider'
      ? await supabase.from('provider_profiles').select('*').eq('user_id', user.id).maybeSingle()
      : { data: null };

  return (
    <ProfileForm profile={profile} providerProfile={providerProfile} email={user.email ?? ''} />
  );
}
