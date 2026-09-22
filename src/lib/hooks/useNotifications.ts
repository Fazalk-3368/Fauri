'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/types/database';

/**
 * Live notification feed for the signed-in user.
 * The Postgres triggers write the rows; realtime pushes them to the tab.
 */
export function useNotifications(userId: string, onIncoming?: (n: AppNotification) => void) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const onIncomingRef = useRef(onIncoming);

  useEffect(() => {
    onIncomingRef.current = onIncoming;
  }, [onIncoming]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (!active) return;
        setItems(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as AppNotification;
          setItems((prev) => (prev.some((n) => n.id === next.id) ? prev : [next, ...prev]));
          onIncomingRef.current?.(next);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = useCallback(async () => {
    const supabase = createClient();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    // no arg -> marks every unread notification for the caller
    await supabase.rpc('mark_notifications_read');
  }, []);

  const unreadCount = items.filter((n) => !n.read_at).length;

  return { items, loading, unreadCount, markAllRead };
}
