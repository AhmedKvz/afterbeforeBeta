import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const db = supabase as any;

export type MyReferral = { code: string; invited: number; converted: number; afc_per_convert: number };

export const useMyReferral = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-referral', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyReferral> => {
      const { data, error } = await db.rpc('get_my_referral');
      if (error) throw error;
      return data as MyReferral;
    },
  });
};

export const useApplyReferral = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await db.rpc('apply_referral', { p_code: code.trim().toUpperCase() });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, code) => {
      track('referral_applied', { code });
      qc.invalidateQueries({ queryKey: ['my-referral'] });
      toast('Kod prihvaćen ✓', { description: 'Kad se čekiraš na žurci, i ti i drugar ste nagrađeni.' });
    },
    onError: (e: any) => toast('Ne može', { description: e?.message ?? 'Proveri kod.' }),
  });
};
