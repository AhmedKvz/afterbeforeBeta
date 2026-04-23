import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export const useXPActivity = (limit = 10) => {
  const { user } = useAuth();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['xp-activity', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as XPTransaction[];
    },
    enabled: !!user,
  });

  // Calculate total XP this week
  const { data: weeklyXP } = useQuery({
    queryKey: ['xp-weekly', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString());

      if (error) throw error;
      return data?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    },
    enabled: !!user,
  });

  // Format reason for display
  const formatReason = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      'Check-in': '📍 Event check-in',
      'Event review': '⭐ Event review',
      'Match': '💜 New match',
      'First match': '🎉 First match!',
      'Super like': '⚡ Super like',
      'Weekly streak': '🔥 Weekly streak',
      'Referral': '👥 Friend referral',
      'Onboarding': '✅ Completed onboarding',
    };

    for (const [key, value] of Object.entries(reasonMap)) {
      if (reason.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return reason;
  };

  return {
    transactions: transactions?.map(t => ({
      ...t,
      formattedReason: formatReason(t.reason),
    })) ?? [],
    weeklyXP: weeklyXP ?? 0,
    isLoading,
  };
};
