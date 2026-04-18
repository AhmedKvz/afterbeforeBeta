import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGiftXP = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { recipientId: string; amount: number; message?: string }) => {
      const { data, error } = await supabase.rpc('gift_xp', {
        p_recipient_id: params.recipientId,
        p_amount: params.amount,
        p_message: params.message ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['xp-limits'] });
      qc.invalidateQueries({ queryKey: ['wallet-activity'] });
      toast.success('XP poslat 🎁');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
