import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ChallengeStatus = 'live' | 'voting' | 'resolved';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  challenge_type: 'sponsored' | 'community';
  status: ChallengeStatus;
  prize_pool_cents: number;
  prize_description: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  sponsor_color: string | null;
  venue_id: string | null;
  submission_deadline: string;
  voting_deadline: string;
  resolved_at: string | null;
  winner_entry_id: string | null;
  created_at: string;
  entry_count?: number;
}

export const useChallenges = (status: ChallengeStatus) => {
  return useQuery({
    queryKey: ['challenges', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*, challenge_entries(count)')
        .eq('status', status)
        .order('voting_deadline', { ascending: status !== 'resolved' });

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        entry_count: c.challenge_entries?.[0]?.count || 0,
      })) as Challenge[];
    },
  });
};

export const useChallenge = (id: string | undefined) => {
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Challenge | null;
    },
    enabled: !!id,
  });
};
