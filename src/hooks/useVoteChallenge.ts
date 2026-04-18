import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useVoteChallenge = (challengeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase.rpc('vote_on_challenge_entry', {
        p_entry_id: entryId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Glas zabeležen 🗳️');
      qc.invalidateQueries({ queryKey: ['challenge-entries', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge-vote', challengeId] });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Glasanje nije uspelo');
    },
  });
};
