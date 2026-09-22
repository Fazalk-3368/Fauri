import { createClient } from '@/lib/supabase/server';
import { NewJobForm } from './NewJobForm';

export default async function NewJobPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return <NewJobForm categories={categories ?? []} />;
}
