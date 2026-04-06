import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const getCurrentWeek = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + 1);
};

const CURRENT_YEAR = new Date().getFullYear();

export const useClubVotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekNumber = getCurrentWeek();

  const { data: allVotes } = useQuery({
    queryKey: ['club-votes', weekNumber, CURRENT_YEAR],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_weekly_votes')
        .select('vote_type, vote_value, event_id')
        .eq('week_number', weekNumber)
        .eq('year', CURRENT_YEAR);

      if (error) throw error;

      const partyVotes: Record<string, { count: number; event_id: string | null }> = {};
      const djVotes: Record<string, number> = {};

      (data || []).forEach((v: any) => {
        if (v.vote_type === 'best_party') {
          if (!partyVotes[v.vote_value]) partyVotes[v.vote_value] = { count: 0, event_id: v.event_id };
          partyVotes[v.vote_value].count++;
        } else if (v.vote_type === 'best_dj') {
          djVotes[v.vote_value] = (djVotes[v.vote_value] || 0) + 1;
        }
      });

      return { partyVotes, djVotes };
    },
  });

  const { data: userVotes } = useQuery({
    queryKey: ['club-user-votes', user?.id, weekNumber, CURRENT_YEAR],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('club_weekly_votes')
        .select('vote_type, vote_value')
        .eq('user_id', user.id)
        .eq('week_number', weekNumber)
        .eq('year', CURRENT_YEAR);

      const result: Record<string, string> = {};
      (data || []).forEach((v: any) => {
        result[v.vote_type] = v.vote_value;
      });
      return result;
    },
    enabled: !!user?.id,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ voteType, voteValue, eventId }: { voteType: string; voteValue: string; eventId?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('club_weekly_votes')
        .upsert(
          {
            user_id: user.id,
            vote_type: voteType,
            vote_value: voteValue,
            event_id: eventId || null,
            week_number: weekNumber,
            year: CURRENT_YEAR,
          },
          { onConflict: 'user_id,vote_type,week_number,year' }
        );

      if (error) throw error;
    },
    onSuccess: (_, { voteType, voteValue }) => {
      queryClient.invalidateQueries({ queryKey: ['club-votes'] });
      queryClient.invalidateQueries({ queryKey: ['club-user-votes'] });
      const label = voteType === 'best_party' ? '🎉 Best Party' : '🎧 Best DJ';
      toast.success(`${label} vote cast for ${voteValue}`);
    },
    onError: () => {
      toast.error('Failed to cast vote');
    },
  });

  // Sort votes for display
  const topParties = Object.entries(allVotes?.partyVotes || {})
    .map(([name, data]) => ({ name, count: data.count, event_id: data.event_id }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topDJs = Object.entries(allVotes?.djVotes || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    topParties,
    topDJs,
    userVotes: userVotes || {},
    vote: voteMutation.mutate,
    isVoting: voteMutation.isPending,
  };
};
