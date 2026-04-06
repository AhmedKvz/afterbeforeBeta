import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CURRENT_YEAR = new Date().getFullYear();

export const useChampionshipVotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: voteCounts, isLoading } = useQuery({
    queryKey: ['championship-votes', CURRENT_YEAR],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('championship_votes')
        .select('destination')
        .eq('year', CURRENT_YEAR);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((v) => {
        counts[v.destination] = (counts[v.destination] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: userVote } = useQuery({
    queryKey: ['championship-user-vote', user?.id, CURRENT_YEAR],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('championship_votes')
        .select('destination')
        .eq('user_id', user.id)
        .eq('year', CURRENT_YEAR)
        .maybeSingle();
      return data?.destination || null;
    },
    enabled: !!user?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (destination: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('championship_votes')
        .upsert(
          { user_id: user.id, destination, year: CURRENT_YEAR },
          { onConflict: 'user_id,year' }
        );

      if (error) throw error;
    },
    onSuccess: (_, destination) => {
      queryClient.invalidateQueries({ queryKey: ['championship-votes'] });
      queryClient.invalidateQueries({ queryKey: ['championship-user-vote'] });
      toast.success(`Vote cast for ${destination}`);
    },
    onError: () => {
      toast.error('Failed to cast vote');
    },
  });

  const totalVotes = Object.values(voteCounts || {}).reduce((a, b) => a + b, 0);

  return {
    voteCounts: voteCounts || {},
    userVote,
    totalVotes,
    isLoading,
    vote: voteMutation.mutate,
    isVoting: voteMutation.isPending,
  };
};
