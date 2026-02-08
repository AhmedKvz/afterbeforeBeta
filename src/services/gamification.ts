import { supabase } from '@/integrations/supabase/client';

// XP Awards - Core gamification signals
export const XP_AWARDS = {
  // Discovery signals
  wishlist: 25,
  removeWishlist: -10,
  
  // Attendance signals  
  checkIn: 50,
  firstCheckIn: 100,
  
  // Social signals
  firstMatch: 100,
  match: 50,
  superLike: 25,
  
  // Engagement signals
  dailyStreak: 200,
  weeklyActive: 150,
  referFriend: 500,
  
  // Onboarding
  completeOnboarding: 100,
  completeProfile: 50,
} as const;

// Quest definitions for gamification
export const QUESTS = [
  {
    id: 'first_save',
    name: 'Curator',
    description: 'Save your first event',
    xpReward: 50,
    condition: 'wishlist_count >= 1',
  },
  {
    id: 'party_starter',
    name: 'Party Starter',
    description: 'Save 5 events',
    xpReward: 100,
    condition: 'wishlist_count >= 5',
  },
  {
    id: 'scene_scout',
    name: 'Scene Scout',
    description: 'Check in to 3 different venues',
    xpReward: 150,
    condition: 'checkin_count >= 3',
  },
  {
    id: 'night_crawler',
    name: 'Night Crawler',
    description: 'Check in to 10 events',
    xpReward: 300,
    condition: 'checkin_count >= 10',
  },
  {
    id: 'weekly_warrior',
    name: 'Weekly Warrior',
    description: 'Be active 3 days in a week',
    xpReward: 200,
    condition: 'weekly_active_days >= 3',
  },
] as const;

// Level thresholds
export const LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 500 },
  { level: 3, xpRequired: 1000 },
  { level: 4, xpRequired: 2000 },
  { level: 5, xpRequired: 5000 },
  { level: 6, xpRequired: 10000 },
  { level: 7, xpRequired: 20000 },
  { level: 8, xpRequired: 35000 },
  { level: 9, xpRequired: 50000 },
  { level: 10, xpRequired: 75000 },
] as const;

// Achievements
export const ACHIEVEMENTS = [
  {
    id: 'party_animal',
    name: 'Party Animal',
    description: 'Attended 10+ events',
    icon: '🎉',
    checkCondition: (stats: UserStats) => stats.eventsAttended >= 10,
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: '50+ matches',
    icon: '💜',
    checkCondition: (stats: UserStats) => stats.totalMatches >= 50,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Active after 3AM',
    icon: '🦉',
    checkCondition: (_stats: UserStats) => {
      const hour = new Date().getHours();
      return hour >= 3 && hour < 6;
    },
  },
  {
    id: 'first_match',
    name: 'First Connection',
    description: 'Got your first match',
    icon: '💫',
    checkCondition: (stats: UserStats) => stats.totalMatches >= 1,
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Attended 5+ events',
    icon: '🎵',
    checkCondition: (stats: UserStats) => stats.eventsAttended >= 5,
  },
  {
    id: 'newcomer',
    name: 'Newcomer',
    description: 'Checked in to first event',
    icon: '🌟',
    checkCondition: (stats: UserStats) => stats.eventsAttended >= 1,
  },
] as const;

export interface UserStats {
  eventsAttended: number;
  totalMatches: number;
  xp: number;
  level: number;
}

/**
 * Calculate level based on XP
 */
export const calculateLevel = (xp: number): number => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i].level;
    }
  }
  return 1;
};

/**
 * Get XP progress to next level
 */
export const getXPProgress = (xp: number): { current: number; required: number; percentage: number } => {
  const currentLevel = calculateLevel(xp);
  const currentLevelData = LEVELS.find(l => l.level === currentLevel);
  const nextLevelData = LEVELS.find(l => l.level === currentLevel + 1);
  
  if (!nextLevelData || !currentLevelData) {
    return { current: xp, required: xp, percentage: 100 };
  }
  
  const xpInCurrentLevel = xp - currentLevelData.xpRequired;
  const xpRequiredForNextLevel = nextLevelData.xpRequired - currentLevelData.xpRequired;
  const percentage = Math.min(100, (xpInCurrentLevel / xpRequiredForNextLevel) * 100);
  
  return {
    current: xpInCurrentLevel,
    required: xpRequiredForNextLevel,
    percentage,
  };
};

/**
 * Award XP to a user
 */
export const awardXP = async (
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newXP: number; newLevel: number }> => {
  try {
    // Add XP transaction
    await supabase.from('xp_transactions').insert({
      user_id: userId,
      amount,
      reason,
    });

    // Get current XP
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('user_id', userId)
      .single();

    const currentXP = profile?.xp || 0;
    const newXP = currentXP + amount;
    const newLevel = calculateLevel(newXP);

    // Update profile XP and level
    await supabase
      .from('profiles')
      .update({ xp: newXP, level: newLevel })
      .eq('user_id', userId);

    // Check and unlock achievements
    await checkAchievements(userId);

    return { success: true, newXP, newLevel };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return { success: false, newXP: 0, newLevel: 1 };
  }
};

/**
 * Check and unlock achievements for a user
 */
export const checkAchievements = async (userId: string): Promise<string[]> => {
  const unlockedAchievements: string[] = [];
  
  try {
    // Get user stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('events_attended, total_matches, xp, level')
      .eq('user_id', userId)
      .single();

    if (!profile) return unlockedAchievements;

    const stats: UserStats = {
      eventsAttended: profile.events_attended || 0,
      totalMatches: profile.total_matches || 0,
      xp: profile.xp || 0,
      level: profile.level || 1,
    };

    // Get already unlocked achievements
    const { data: existingAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const existingIds = existingAchievements?.map(a => a.achievement_id) || [];

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      if (!existingIds.includes(achievement.id) && achievement.checkCondition(stats)) {
        await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
        });
        unlockedAchievements.push(achievement.id);
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return unlockedAchievements;
  }
};

/**
 * Get user's unlocked achievements
 */
export const getUserAchievements = async (userId: string) => {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);

  return data?.map(ua => ({
    ...ACHIEVEMENTS.find(a => a.id === ua.achievement_id),
    unlockedAt: ua.unlocked_at,
  })).filter(Boolean) || [];
};
