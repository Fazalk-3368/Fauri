'use client';

import { Info } from 'lucide-react';

/**
 * Shown at the top of every legal page. These pages were drafted from what the
 * software actually does, which makes them accurate but not a substitute for a
 * lawyer. Saying so plainly is better than letting them read as settled.
 */
export function LegalNotice() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-info/30 bg-info-soft p-4 text-info-soft-fg"
      dir="ltr"
    >
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="text-sm">
        <strong className="text-info-soft-fg">Draft.</strong> Fauri is a final year project and has
        not been through a public pilot. This page describes how the software behaves today and has
        not been reviewed by a lawyer. It should be before anyone relies on it.
      </p>
    </div>
  );
}
