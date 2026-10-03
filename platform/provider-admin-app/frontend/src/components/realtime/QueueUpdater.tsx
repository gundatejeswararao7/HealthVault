'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

interface QueueUpdaterProps {
  hospitalId: string;
}

export function QueueUpdater({ hospitalId }: QueueUpdaterProps) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!hospitalId) return;

    const channel = supabase
      .channel(`hospital-queue-${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospitalId}`,
        },
        () => {
          // Re-fetch server components on realtime mutation
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospitalId, router]);

  return null;
}
