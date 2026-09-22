'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/lib/i18n/provider';
import { Badge, Card, EmptyState } from '@/components/ui';
import { formatPkr } from '@/lib/utils';
import type { CommissionLedgerRow } from '@/lib/types/database';

type Entry = CommissionLedgerRow & {
  job: { id: string; title: string; completed_at: string | null } | null;
};

export function EarningsView({ entries }: { entries: Entry[] }) {
  const { dict, locale } = useI18n();

  const gross = entries.reduce((sum, e) => sum + Number(e.job_amount_pkr), 0);
  const due = entries
    .filter((e) => e.status === 'due')
    .reduce((sum, e) => sum + Number(e.commission_pkr), 0);

  const stats = [
    { label: dict.earnings.totalEarned, value: formatPkr(gross, locale) },
    { label: dict.earnings.jobsDone, value: String(entries.length) },
    { label: dict.earnings.commissionDue, value: formatPkr(due, locale), warn: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.earnings.title}</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.warn ? 'text-urgent' : ''}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted">{dict.earnings.commissionHint}</p>

      {entries.length === 0 ? (
        <EmptyState icon={Wallet} title={dict.earnings.noEntries} />
      ) : (
        <Card className="divide-y divide-[var(--border)] overflow-hidden">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                {entry.job ? (
                  <Link href={`/jobs/${entry.job.id}`} className="truncate font-medium hover:underline">
                    {entry.job.title}
                  </Link>
                ) : (
                  <p className="truncate font-medium">{dict.earnings.job}</p>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  {format(new Date(entry.created_at), 'PP')}
                </p>
              </div>

              <div className="shrink-0 text-end">
                <p className="font-semibold">{formatPkr(entry.job_amount_pkr, locale)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {dict.earnings.commission}: {formatPkr(entry.commission_pkr, locale)}
                </p>
              </div>

              <Badge tone={entry.status === 'due' ? 'urgent' : 'neutral'}>
                {entry.status === 'due' ? dict.earnings.commissionDue : dict.earnings.settled}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
