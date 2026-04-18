import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSendSC = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recipientId: string;
      amountCents: number;
      venueId?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('send_scene_credits', {
        p_recipient_id: params.recipientId,
        p_amount_cents: params.amountCents,
        p_venue_id: params.venueId ?? null,
        p_description: params.description ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-activity'] });
      toast.success('Piće poslato 🍻');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
