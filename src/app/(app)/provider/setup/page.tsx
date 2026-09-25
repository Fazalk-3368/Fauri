import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProviderSetupForm } from './ProviderSetupForm';

export default async function ProviderSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // A customer here would get a foreign-key error on save rather than a useful
  // screen: provider_services references provider_profiles, which they have no
  // row in. Every other route under (app) guards its role the same way.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'provider') redirect('/dashboard');

  const [{ data: categories }, { data: providerProfile }, { data: myServices }] =
    await Promise.all([
      supabase.from('service_categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('provider_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('provider_services').select('category_id').eq('provider_id', user.id),
    ]);

  return (
    <ProviderSetupForm
      userId={user.id}
      categories={categories ?? []}
      providerProfile={providerProfile}
      selectedCategoryIds={(myServices ?? []).map((s) => s.category_id)}
    />
  );
}
