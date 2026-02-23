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

  // Auto-assign quests if none exist for this week
  const { data: assigned } = useQuery({
    queryKey: ['assign-quests', user?.id, weekStart, quests.length],
    queryFn: async () => {
      if (!user || quests.length === 0 || userProgress.length > 0) return false;
      
      // Pick 5 random quests
      const shuffled = [...quests].sort(() => Math.random() - 0.5).slice(0, 5);
      
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
    enabled: !!user && quests.length > 0 && userProgress.length === 0,
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
