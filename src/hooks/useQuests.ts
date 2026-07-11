import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

  // Top-up to 5 active quests for the week — server-side, idempotent and
  // race-safe (assign_weekly_quests RPC; was a client insert inside useQuery).
  const WEEKLY_TARGET = 5;
  const { data: assigned } = useQuery({
    queryKey: ['assign-quests', user?.id, weekStart, quests.length, activeProgress.length],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('assign_weekly_quests');
      if (error) return false;
      if (data?.added > 0) queryClient.invalidateQueries({ queryKey: ['user-quests'] });
      return true;
    },
    enabled: !!user && !progressLoading && quests.length > 0 && activeProgress.length < WEEKLY_TARGET,
  });

  const claimReward = useMutation({
    // Server-validated: credits XP (reputation) + AFC (currency) + afc_ledger
    // atomically. Client can't mint — the RPC checks the quest is completed.
    mutationFn: async ({ questId }: { questId: string; xpReward?: number }) => {
      if (!user) throw new Error('Not logged in');
      const { data, error } = await (supabase as any).rpc('claim_quest', { p_quest_id: questId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-quests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['afc-ledger'] });
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
