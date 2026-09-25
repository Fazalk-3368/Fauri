'use client';

import Link from 'next/link';
import { Briefcase, MapPin, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '@/lib/i18n/provider';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { JOB_STATUS_TONE, isActive } from '@/lib/jobs';
import { cn, formatPkr } from '@/lib/utils';
import type { CustomerJob } from '@/lib/types/database';

function JobCard({ job }: { job: CustomerJob }) {
  const { dict, locale, fill } = useI18n();
  const offerCount = Number(job.offer_count);
  const categoryName = locale === 'ur' ? job.category_ur : job.category_en;

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card
        className={cn(
          'p-4 transition-shadow hover:shadow-lg',
          job.is_urgent && isActive(job.status) && 'border-urgent/40',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={JOB_STATUS_TONE[job.status]}>{dict.job.status[job.status]}</Badge>
              {job.is_urgent && isActive(job.status) && (
                <Badge tone="urgent">{dict.job.urgent}</Badge>
              )}
              <span className="text-xs text-muted">{categoryName}</span>
            </div>

            <h3 className="mt-2 truncate font-semibold">{job.title}</h3>

            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="size-3.5 shrink-0" />
              {job.address_text}
            </p>
          </div>

          <div className="shrink-0 text-end">
            <p className="font-semibold">
              {formatPkr(job.final_amount_pkr ?? job.budget_pkr, locale)}
            </p>
            {job.status === 'open' && (
              <p className="mt-1 text-xs text-muted">
                {offerCount > 0
                  ? fill(dict.job.offersCount, { n: offerCount })
                  : dict.job.waitingForOffers}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 border-t border-border pt-2.5 text-xs text-muted">
          {fill(dict.job.postedAt, {
            time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
          })}
        </p>
      </Card>
    </Link>
  );
}

export function CustomerDashboard({ jobs }: { jobs: CustomerJob[] }) {
  const { dict } = useI18n();

  const active = jobs.filter((j) => isActive(j.status));
  const past = jobs.filter((j) => !isActive(j.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{dict.job.myJobs}</h1>
        <Link href="/jobs/new">
          <Button>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{dict.nav.postJob}</span>
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={dict.job.noJobs}
          action={
            <Link href="/jobs/new">
              <Button>{dict.job.postFirst}</Button>
            </Link>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              {active.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                {dict.job.status.completed}
              </h2>
              {past.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
