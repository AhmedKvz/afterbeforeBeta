import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalletData {
  xpBalance: number;
  level: number;
  scBalanceCents: number;
  kycTier: 'none' | 'verified';
  lifetimeLoadedCents: number;
  lifetimeSpentCents: number;
}

export const useWallet = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WalletData> => {
      const [profileRes, scRes] = await Promise.all([
        supabase.from('profiles').select('xp, level').eq('user_id', user!.id).maybeSingle(),
        supabase.from('scene_credits_accounts').select('*').eq('user_id', user!.id).maybeSingle(),
      ]);

      return {
        xpBalance: profileRes.data?.xp ?? 0,
        level: profileRes.data?.level ?? 1,
        scBalanceCents: scRes.data?.balance_cents ?? 0,
        kycTier: (scRes.data?.kyc_tier as 'none' | 'verified') ?? 'none',
        lifetimeLoadedCents: scRes.data?.lifetime_loaded_cents ?? 0,
        lifetimeSpentCents: scRes.data?.lifetime_spent_cents ?? 0,
      };
    },
    refetchOnWindowFocus: true,
  });
};
