import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CustomerDashboard } from '@/components/dashboard/CustomerDashboard';
import { ProviderDashboard } from '@/components/dashboard/ProviderDashboard';

export default async function DashboardPage() {
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

  if (profile.role === 'provider') {
    const [{ data: providerProfile }, { count: serviceCount }] = await Promise.all([
      supabase.from('provider_profiles').select('*').eq('user_id', user.id).single(),
      supabase
        .from('provider_services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user.id),
    ]);

    // A tradesman with no trades selected can never be matched to anything.
    if (!providerProfile || !serviceCount) redirect('/provider/setup');

    // nearby_open_jobs measures from the location already stored on the profile,
    // so the first page of the feed can be rendered on the server.
    const [{ data: nearby }, { data: active }] = await Promise.all([
      supabase.rpc('nearby_open_jobs', { p_limit: 50 }),
      supabase
        .from('jobs')
        .select('*')
        .eq('assigned_provider_id', user.id)
        .in('status', ['assigned', 'en_route', 'in_progress'])
        .order('assigned_at', { ascending: false })
        .limit(1),
    ]);

    return (
      <ProviderDashboard
        profile={profile}
        providerProfile={providerProfile}
        initialJobs={nearby ?? []}
        initialActiveJob={active?.[0] ?? null}
      />
    );
  }

  const { data: jobs } = await supabase.rpc('customer_jobs', { p_limit: 50 });

  return <CustomerDashboard jobs={jobs ?? []} />;
}
