import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Lucky100Winner {
  id: string;
  user_id: string;
  check_in_number: number;
  event_id: string | null;
  won_at: string;
  prize_claimed: boolean;
  prize_event_choice: string | null;
  guestlist_name: string | null;
  claimed_at: string | null;
}

export const useLucky100Winners = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user has an unclaimed prize
  const { data: unclaimedPrize, isLoading: prizeLoading } = useQuery({
    queryKey: ['lucky100-unclaimed-prize', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('lucky100_winners')
        .select('*')
        .eq('user_id', user.id)
        .eq('prize_claimed', false)
        .order('won_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Lucky100Winner | null;
    },
    enabled: !!user,
  });

  // Claim prize mutation
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
        .from('lucky100_winners')
        .update({
          prize_claimed: true,
          prize_event_choice: eventChoice,
          guestlist_name: guestlistName,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', winnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f97316'],
      });

      queryClient.invalidateQueries({ queryKey: ['lucky100-unclaimed-prize'] });
      queryClient.invalidateQueries({ queryKey: ['lucky100-winners'] });
      
      toast.success('🎉 Prize claimed successfully!', {
        description: 'Show this at the venue entrance',
      });
    },
    onError: (error) => {
      toast.error('Failed to claim prize', {
        description: error.message,
      });
    },
  });

  // Get user's win history
  const { data: winHistory } = useQuery({
    queryKey: ['lucky100-win-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('lucky100_winners')
        .select('*')
        .eq('user_id', user.id)
        .order('won_at', { ascending: false });

      if (error) throw error;
      return data as Lucky100Winner[];
    },
    enabled: !!user,
  });

  return {
    unclaimedPrize,
    hasUnclaimedPrize: !!unclaimedPrize,
    winHistory: winHistory ?? [],
    totalWins: winHistory?.length ?? 0,
    claimPrize: claimPrizeMutation.mutate,
    isClaiming: claimPrizeMutation.isPending,
    isLoading: prizeLoading,
  };
};
