import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WeeklyWinner {
  id: string;
  user_id: string;
  week_start: string;
  rank: number;
  total_xp: number;
  prize_claimed: boolean;
  prize_event_choice: string | null;
  guestlist_name: string | null;
  won_at: string;
  display_name?: string;
  avatar_url?: string | null;
}

export const useWeeklyWinners = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get recent weekly winners
  const { data: recentWinners, isLoading } = useQuery({
    queryKey: ['weekly-winners'],
    queryFn: async () => {
      const { data: winners, error } = await supabase
        .from('weekly_winners')
        .select('*')
        .order('won_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      // Get profile info
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
      })) as WeeklyWinner[];
    },
  });

  // Check if current user has unclaimed weekly prize
  const { data: unclaimedPrize } = useQuery({
    queryKey: ['weekly-unclaimed-prize', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('weekly_winners')
        .select('*')
        .eq('user_id', user.id)
        .eq('prize_claimed', false)
        .order('won_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as WeeklyWinner | null;
    },
    enabled: !!user,
  });

  // Admin: Announce weekly winners
  const announceWinnersMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('announce_weekly_winners');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-winners'] });
      toast.success(`🏆 Announced ${data?.length ?? 0} weekly winners!`);
    },
    onError: (error) => {
      toast.error('Failed to announce winners', {
        description: error.message,
      });
    },
  });

  // Claim weekly prize
  const claimPrizeMutation = useMutation({
    mutationFn: async ({
      winnerId,
      eventChoice,
      guestlistName,
    }: {
      winnerId: string;
      eventChoice: string;
      guestlistName: string;
    }) => {
      const { error } = await supabase
        .from('weekly_winners')
        .update({
          prize_claimed: true,
          prize_event_choice: eventChoice,
          guestlist_name: guestlistName,
        })
        .eq('id', winnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-unclaimed-prize'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-winners'] });
      toast.success('🎉 Weekly prize claimed!');
    },
    onError: (error) => {
      toast.error('Failed to claim prize', {
        description: error.message,
      });
    },
  });

  return {
    recentWinners: recentWinners ?? [],
    unclaimedPrize,
    hasUnclaimedPrize: !!unclaimedPrize,
    announceWinners: announceWinnersMutation.mutate,
    isAnnouncing: announceWinnersMutation.isPending,
    claimPrize: claimPrizeMutation.mutate,
    isClaiming: claimPrizeMutation.isPending,
    isLoading,
  };
};
