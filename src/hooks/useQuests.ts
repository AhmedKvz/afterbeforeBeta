import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP } from '@/services/gamification';
import { getCurrentWeekStart } from '@/services/questProgress';

export const useQuests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = getCurrentWeekStart();

  const { data: quests = [], isLoading: questsLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: userProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['user-quests', user?.id, weekStart],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_quests')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Rows pointing to a still-active quest — rows left over from a retired
  // content set don't count, otherwise a content swap leaves users questless
  // until next Monday.
  const activeProgress = userProgress.filter((up: any) => quests.some((q) => q.id === up.quest_id));

  // Top-up to 5 active quests for the week. Assigns only quests the user
  // doesn't already have a row for (no duplicates), so a content swap
  // mid-week refills the set even if some old-set ids survived.
  const WEEKLY_TARGET = 5;
  const { data: assigned } = useQuery({
    queryKey: ['assign-quests', user?.id, weekStart, quests.length, activeProgress.length],
    queryFn: async () => {
      if (!user || quests.length === 0 || activeProgress.length >= WEEKLY_TARGET) return false;

      const unassigned = quests.filter((q) => !userProgress.some((up: any) => up.quest_id === q.id));
      const shuffled = [...unassigned].sort(() => Math.random() - 0.5).slice(0, WEEKLY_TARGET - activeProgress.length);
      if (shuffled.length === 0) return false;

      const inserts = shuffled.map((q) => ({
        user_id: user.id,
        quest_id: q.id,
        week_start: weekStart,
        progress: 0,
        is_completed: false,
        xp_claimed: false,
      }));

      await supabase.from('user_quests').insert(inserts);
      queryClient.invalidateQueries({ queryKey: ['user-quests'] });
      return true;
    },
    enabled: !!user && !progressLoading && quests.length > 0 && activeProgress.length < WEEKLY_TARGET,
  });

  const claimReward = useMutation({
    mutationFn: async ({ questId, xpReward }: { questId: string; xpReward: number }) => {
      if (!user) throw new Error('Not logged in');
      
      await awardXP(user.id, xpReward, 'Quest completed');
      
      await supabase
        .from('user_quests')
        .update({ xp_claimed: true })
        .eq('user_id', user.id)
        .eq('quest_id', questId)
        .eq('week_start', weekStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-quests'] });
    },
  });

  // Merge quest definitions with user progress
  const questsWithProgress = quests
    .filter((q) => userProgress.some((up: any) => up.quest_id === q.id))
    .map((q) => {
      const progress = userProgress.find((up: any) => up.quest_id === q.id);
      return {
        ...q,
        progress: progress?.progress || 0,
        is_completed: progress?.is_completed || false,
        xp_claimed: progress?.xp_claimed || false,
        completed_at: progress?.completed_at,
      };
    });

  return {
    quests: questsWithProgress,
    isLoading: questsLoading || progressLoading,
    claimReward: claimReward.mutate,
    completedCount: questsWithProgress.filter((q) => q.is_completed).length,
    totalCount: questsWithProgress.length,
  };
};
