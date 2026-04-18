import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  media_url: string | null;
  caption: string | null;
  vote_count: number;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export const useChallengeEntries = (challengeId: string | undefined) => {
  return useQuery({
    queryKey: ['challenge-entries', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data: entries, error } = await supabase
        .from('challenge_entries')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('vote_count', { ascending: false });
      if (error) throw error;

      const userIds = (entries || []).map((e) => e.user_id);
      if (userIds.length === 0) return [] as ChallengeEntry[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );

      return (entries || []).map((e) => ({
        ...e,
        profile: profileMap.get(e.user_id) || null,
      })) as ChallengeEntry[];
    },
    enabled: !!challengeId,
  });
};

export const useUserChallengeVote = (challengeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['challenge-vote', challengeId, user?.id],
    queryFn: async () => {
      if (!challengeId || !user?.id) return null;
      const { data } = await supabase
        .from('challenge_votes')
        .select('entry_id')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.entry_id || null;
    },
    enabled: !!challengeId && !!user?.id,
  });
};
