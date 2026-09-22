import type { JobStatus } from '@/lib/types/database';

export const JOB_STATUS_TONE: Record<
  JobStatus,
  'neutral' | 'brand' | 'urgent' | 'danger' | 'info'
> = {
  open: 'info',
  assigned: 'brand',
  en_route: 'brand',
  in_progress: 'brand',
  completed: 'neutral',
  cancelled: 'danger',
  expired: 'neutral',
};

/** Statuses where the job is still live and worth showing at the top. */
export const ACTIVE_STATUSES: JobStatus[] = ['open', 'assigned', 'en_route', 'in_progress'];

export function isActive(status: JobStatus) {
  return ACTIVE_STATUSES.includes(status);
}
