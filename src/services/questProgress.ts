import { supabase } from '@/integrations/supabase/client';

/**
 * Get Monday of the current week as YYYY-MM-DD
 */
export const getCurrentWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

/**
 * Increment quest progress for a specific quest type.
 * Auto-completes the quest if target is reached and inserts a notification.
 */
export const incrementQuestProgress = async (
  userId: string,
  questType: string
): Promise<void> => {
  try {
    const weekStart = getCurrentWeekStart();

    // Find the user's active quest for this type this week
    const { data: userQuest } = await supabase
      .from('user_quests')
      .select('id, progress, quest_id, is_completed')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('is_completed', false)
      .single() as any;

    // We need to check if there's a matching quest_type
    // First get the quest definition
    const { data: quests } = await supabase
      .from('quests')
      .select('id, target_count, xp_reward, title')
      .eq('quest_type', questType)
      .eq('is_active', true);

    if (!quests || quests.length === 0) return;

    for (const quest of quests) {
      // Check user's progress for this specific quest
      const { data: progress } = await supabase
        .from('user_quests')
        .select('id, progress, is_completed')
        .eq('user_id', userId)
        .eq('quest_id', quest.id)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (!progress || progress.is_completed) continue;

      const newProgress = (progress.progress || 0) + 1;
      const isCompleted = newProgress >= quest.target_count;

      await supabase
        .from('user_quests')
        .update({
          progress: newProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', progress.id);

      if (isCompleted) {
        // Insert notification for quest completion
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'quest_complete',
          title: 'Quest Complete! 🎯',
          body: `You completed "${quest.title}" — claim your +${quest.xp_reward} XP!`,
          data: { questId: quest.id },
        });
      }
    }
  } catch (error) {
    console.error('Error incrementing quest progress:', error);
  }
};
