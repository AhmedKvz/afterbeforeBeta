import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityItem {
  id: string;
  kind: 'xp' | 'sc';
  type: string;
  amount: number; // signed; for SC = cents, for XP = xp
  description: string;
  createdAt: string;
}

export const useWalletActivity = (limit = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet-activity', user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<ActivityItem[]> => {
      const [xpRes, scRes] = await Promise.all([
        supabase
          .from('xp_transactions')
          .select('id, amount, reason, created_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('scene_credits_transactions')
          .select('id, type, amount_cents, description, created_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      const xpItems: ActivityItem[] = (xpRes.data ?? []).map((r) => ({
        id: `xp-${r.id}`,
        kind: 'xp' as const,
        type: r.reason,
        amount: r.amount,
        description: r.reason,
        createdAt: r.created_at ?? new Date().toISOString(),
      }));

      const scItems: ActivityItem[] = (scRes.data ?? []).map((r) => ({
        id: `sc-${r.id}`,
        kind: 'sc' as const,
        type: r.type,
        amount: r.amount_cents,
        description: r.description ?? r.type,
        createdAt: r.created_at ?? new Date().toISOString(),
      }));

      return [...xpItems, ...scItems]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  });
};
