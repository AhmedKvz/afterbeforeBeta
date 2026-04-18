import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DAILY_CAP = 500;
const MONTHLY_CAP = 2000;

export const useXPLimits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['xp-limits', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [dayRes, monthRes] = await Promise.all([
        supabase.from('xp_gifts').select('amount').eq('sender_id', user!.id).gte('created_at', dayAgo),
        supabase.from('xp_gifts').select('amount').eq('sender_id', user!.id).gte('created_at', monthAgo),
      ]);

      const dailyUsed = (dayRes.data ?? []).reduce((s, r) => s + r.amount, 0);
      const monthlyUsed = (monthRes.data ?? []).reduce((s, r) => s + r.amount, 0);

      return {
        dailyUsed,
        dailyRemaining: Math.max(0, DAILY_CAP - dailyUsed),
        dailyCap: DAILY_CAP,
        monthlyUsed,
        monthlyRemaining: Math.max(0, MONTHLY_CAP - monthlyUsed),
        monthlyCap: MONTHLY_CAP,
      };
    },
  });
};
