'use client';

import Link from 'next/link';
import { AlertTriangle, Briefcase, MapPin, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '@/lib/i18n/provider';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { JOB_STATUS_TONE, isActive } from '@/lib/jobs';
import { cn, formatPkr } from '@/lib/utils';
import type { CustomerJob } from '@/lib/types/database';

function JobCard({ job, index }: { job: CustomerJob; index: number }) {
  const { dict, locale, fill } = useI18n();
  const offerCount = Number(job.offer_count);
  const categoryName = locale === 'ur' ? job.category_ur : job.category_en;
  const urgent = job.is_urgent && isActive(job.status);

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card
        interactive
        className={cn(
          'animate-in-up p-4 sm:p-5',
          // Logical border so it mirrors under RTL, and a badge icon beside it
          // so urgency is never carried by colour alone.
          urgent && 'border-s-4 border-s-urgent',
        )}
        style={{ animationDelay: `${index * 45}ms` }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={JOB_STATUS_TONE[job.status]}>{dict.job.status[job.status]}</Badge>
          {urgent && (
            <Badge tone="urgent">
              <AlertTriangle className="size-3" aria-hidden />
              {dict.job.urgent}
            </Badge>
          )}
          <span className="text-xs text-muted">{categoryName}</span>
        </div>

        <h3 className="mt-2.5 truncate text-xl font-semibold">{job.title}</h3>

        <p className="mt-1.5 flex items-center gap-1.5 truncate text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {job.address_text}
        </p>

        {/* Price is the anchor, so it owns the footer rather than competing
            with the title from the top corner. */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-t border-border pt-3.5">
          <p className="text-money font-bold tabular-nums">
            {formatPkr(job.final_amount_pkr ?? job.budget_pkr, locale)}
          </p>

          {job.status === 'open' &&
            (offerCount > 0 ? (
              <Badge tone="brand">{fill(dict.job.offersCount, { n: offerCount })}</Badge>
            ) : (
              <span className="text-xs text-muted">{dict.job.waitingForOffers}</span>
            ))}

          <span className="ms-auto text-xs text-muted">
            {fill(dict.job.postedAt, {
              time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
            })}
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function CustomerDashboard({ jobs }: { jobs: CustomerJob[] }) {
  const { dict } = useI18n();

  const active = jobs.filter((j) => isActive(j.status));
  const past = jobs.filter((j) => !isActive(j.status));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{dict.job.myJobs}</h1>
        {/* Hidden below sm because the tab bar carries this. It used to render
            icon-only there, which left it with no accessible name on a phone. */}
        <Link href="/jobs/new" className="hidden sm:block">
          <Button size="lg">
            <Plus className="size-4" aria-hidden />
            {dict.nav.postJob}
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={dict.job.noJobs}
          action={
            <Link href="/jobs/new">
              <Button size="lg">{dict.job.postFirst}</Button>
            </Link>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              {active.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {dict.job.status.completed}
              </h2>
              {past.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
