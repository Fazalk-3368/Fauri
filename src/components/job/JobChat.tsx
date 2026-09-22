'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types/database';

export function JobChat({
  jobId,
  viewerId,
  disabled,
}: {
  jobId: string;
  viewerId: string;
  disabled: boolean;
}) {
  const { dict } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from('messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at')
      .limit(200)
      .then(({ data }) => {
        if (active) setMessages(data ?? []);
      });

    const channel = supabase
      .channel(`messages:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
        (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft('');
    const { error } = await createClient()
      .from('messages')
      .insert({ job_id: jobId, sender_id: viewerId, body });

    // Put the text back so a failed send is not silently lost.
    if (error) setDraft(body);
    setSending(false);
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">{dict.chat.title}</h2>
      </div>

      <div ref={scrollRef} className="max-h-80 min-h-32 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{dict.chat.empty}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === viewerId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2',
                    mine
                      ? 'bg-brand text-brand-fg rounded-ee-sm'
                      : 'bg-surface-2 text-fg rounded-es-sm',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  <p className={cn('mt-0.5 text-[10px]', mine ? 'opacity-70' : 'text-muted')}>
                    {format(new Date(m.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {disabled ? (
        <p className="border-t border-border px-4 py-3 text-center text-xs text-muted">
          {dict.chat.closed}
        </p>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={dict.chat.placeholder}
            maxLength={1000}
            aria-label={dict.chat.placeholder}
          />
          <Button type="submit" disabled={!draft.trim() || sending} aria-label={dict.chat.send}>
            <Send className="size-4 rtl:-scale-x-100" />
          </Button>
        </form>
      )}
    </Card>
  );
}
