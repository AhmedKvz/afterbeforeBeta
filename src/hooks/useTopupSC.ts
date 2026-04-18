import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTopupSC = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (amountCents: number) => {
      const { data, error } = await supabase.rpc('topup_scene_credits', {
        p_amount_cents: amountCents,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-activity'] });
      toast.success('Top-up uspešan');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
