'use client'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

export function RealtimeRedirect({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const lastState = useRef<{ hasTelegramId: boolean; isReady: boolean }>({
    hasTelegramId: false,
    isReady: false
  });

  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .schema('mindops')
        .from('profiles')
        .select('telegram_id, phone_number, onboarding_state')
        .eq('id', userId)
        .single();
      
      if (data) {
        const isReady = data.onboarding_state === 'READY' || !!data.phone_number;
        const hasTelegramId = !!data.telegram_id;

        if (isReady && !lastState.current.isReady) {
          lastState.current.isReady = true;
          router.push('/dashboard');
        } else if (hasTelegramId && !isReady && !lastState.current.hasTelegramId) {
          lastState.current.hasTelegramId = true;
          router.refresh();
        }
      }
    };

    // Polling fallback every 2.5 seconds (bulletproof)
    const interval = setInterval(checkStatus, 2500);

    // Initial check
    checkStatus();

    // Supabase Realtime as primary
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'mindops',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new.onboarding_state === 'READY' || payload.new.phone_number) {
            if (!lastState.current.isReady) {
              lastState.current.isReady = true;
              router.push('/dashboard');
            }
          } else if (payload.new.telegram_id) {
            if (!lastState.current.hasTelegramId) {
              lastState.current.hasTelegramId = true;
              router.refresh();
            }
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    }
  }, [userId, supabase, router])

  return null
}