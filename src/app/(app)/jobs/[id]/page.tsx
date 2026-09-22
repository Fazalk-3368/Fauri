import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobDetailView } from '@/components/job/JobDetailView';

export default async function JobPage({ params }: PageProps<'/jobs/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // job_detail enforces can_view_job() and throws if the caller has no business
  // seeing this job, so a failure here is a genuine 404 for this user.
  const { data, error } = await supabase.rpc('job_detail', { p_job_id: id });
  if (error || !data) notFound();

  return <JobDetailView initial={data} viewerId={user.id} />;
}
