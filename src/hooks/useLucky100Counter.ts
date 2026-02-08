import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface Lucky100Stats {
  globalCount: number;
  lastWinnerCount: number;
  nextLuckyNumber: number;
  checkInsToNext: number;
}

interface Lucky100Winner {
  id: string;
  user_id: string;
  check_in_number: number;
  event_id: string | null;
  won_at: string;
  prize_claimed: boolean;
  display_name?: string;
  avatar_url?: string | null;
}

export const useLucky100Counter = () => {
  const queryClient = useQueryClient();
  const luckyInterval = 5;

  // Fetch counter stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['lucky100-counter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lucky100_counter')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      const globalCount = data?.global_count ?? 0;
      const lastWinnerCount = data?.last_winner_count ?? 0;
      const nextLuckyNumber = Math.ceil((globalCount + 1) / luckyInterval) * luckyInterval;
      const checkInsToNext = nextLuckyNumber - globalCount;

      return {
        globalCount,
        lastWinnerCount,
        nextLuckyNumber,
        checkInsToNext,
      } as Lucky100Stats;
    },
    refetchInterval: 10000, // Poll every 10 seconds as backup
  });

  // Fetch recent winners
  const { data: recentWinners, isLoading: winnersLoading } = useQuery({
    queryKey: ['lucky100-winners'],
    queryFn: async () => {
      const { data: winners, error } = await supabase
        .from('lucky100_winners')
        .select('*')
        .order('won_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get profile info for winners
      const userIds = winners?.map(w => w.user_id) ?? [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      return winners?.map(winner => ({
        ...winner,
        display_name: profiles?.find(p => p.user_id === winner.user_id)?.display_name ?? 'Anonymous',
        avatar_url: profiles?.find(p => p.user_id === winner.user_id)?.avatar_url,
      })) as Lucky100Winner[];
    },
    refetchInterval: 30000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('lucky100-counter-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lucky100_counter',
        },
        () => {
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: ['lucky100-counter'] });
          queryClient.invalidateQueries({ queryKey: ['lucky100-winners'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    stats: stats ?? { globalCount: 0, lastWinnerCount: 0, nextLuckyNumber: 5, checkInsToNext: 5 },
    recentWinners: recentWinners ?? [],
    isLoading: statsLoading || winnersLoading,
    luckyInterval,
  };
};
