import { supabase } from "@/integrations/supabase/client";

export const calculateLevel = (xp: number): number => {
  if (xp < 500) return 1;
  if (xp < 1000) return 2;
  if (xp < 2000) return 3;
  if (xp < 5000) return 4;
  if (xp < 10000) return 5;
  return Math.floor(xp / 2000) + 1;
};

export const xpForNextLevel = (level: number): number => {
  const thresholds = [0, 500, 1000, 2000, 5000, 10000];
  if (level < thresholds.length) return thresholds[level];
  return level * 2000;
};

export const xpProgress = (xp: number): { current: number; next: number; percent: number } => {
  const level = calculateLevel(xp);
  const thresholds = [0, 500, 1000, 2000, 5000, 10000];
  const currentBase = thresholds[level - 1] ?? (level - 1) * 2000;
  const nextThreshold = thresholds[level] ?? level * 2000;
  const percent = ((xp - currentBase) / (nextThreshold - currentBase)) * 100;
  return { current: xp - currentBase, next: nextThreshold - currentBase, percent: Math.min(100, percent) };
};

export const awardXP = async (userId: string, amount: number, reason: string) => {
  await supabase.from("xp_transactions").insert({ user_id: userId, amount, reason });

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp")
    .eq("user_id", userId)
    .single();

  const newXP = (profile?.xp || 0) + amount;
  const newLevel = calculateLevel(newXP);

  await supabase
    .from("profiles")
    .update({ xp: newXP, level: newLevel })
    .eq("user_id", userId);

  return { newXP, newLevel };
};
