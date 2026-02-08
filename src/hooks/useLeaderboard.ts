import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  rank: number;
}

export const getCurrentWeekInfo = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return { week: weekNumber, year: now.getFullYear() };
};

export const useLeaderboard = (period: 'weekly' | 'monthly' | 'yearly' = 'weekly', limit = 10) => {
  const { user } = useAuth();
  const { week, year } = getCurrentWeekInfo();

  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard', period, week, year, limit],
    queryFn: async () => {
      if (period === 'weekly') {
        const { data, error } = await supabase
          .rpc('get_weekly_leaderboard', {
            week_num: week,
            year_num: year,
            limit_count: limit,
          });

        if (error) throw error;
        return (data || []) as LeaderboardEntry[];
      }
      
      // For monthly/yearly, we aggregate differently
      const { data, error } = await supabase
        .from('weekly_leaderboard')
        .select(`
          user_id,
          total_xp,
          profiles!inner(display_name, avatar_url)
        `)
        .eq('year', year)
        .order('total_xp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Aggregate by user for monthly view
      const aggregated = (data || []).reduce((acc, entry) => {
        const existing = acc.find(e => e.user_id === entry.user_id);
        if (existing) {
          existing.total_xp += entry.total_xp;
        } else {
          acc.push({
            user_id: entry.user_id,
            display_name: (entry.profiles as any)?.display_name || 'Anonymous',
            avatar_url: (entry.profiles as any)?.avatar_url || null,
            total_xp: entry.total_xp,
            rank: 0,
          });
        }
        return acc;
      }, [] as LeaderboardEntry[]);

      // Sort and assign ranks
      aggregated.sort((a, b) => b.total_xp - a.total_xp);
      aggregated.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return aggregated.slice(0, limit);
    },
    staleTime: 30000,
  });

  // Get current user's rank
  const { data: userRank } = useQuery({
    queryKey: ['user-rank', user?.id, week, year],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('weekly_leaderboard')
        .select('total_xp')
        .eq('user_id', user.id)
        .eq('week_number', week)
        .eq('year', year)
        .single();

      if (error || !data) return null;

      // Count users with more XP
      const { count } = await supabase
        .from('weekly_leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('week_number', week)
        .eq('year', year)
        .gt('total_xp', data.total_xp);

      return {
        rank: (count || 0) + 1,
        total_xp: data.total_xp,
      };
    },
    enabled: !!user?.id,
  });

  return {
    leaderboard: leaderboard || [],
    userRank,
    isLoading,
    refetch,
  };
};
