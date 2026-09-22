import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EarningsView } from './EarningsView';

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'provider') redirect('/dashboard');

  const { data: entries } = await supabase
    .from('commission_ledger')
    .select('*, job:jobs(id, title, completed_at)')
    .eq('provider_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return <EarningsView entries={entries ?? []} />;
}
