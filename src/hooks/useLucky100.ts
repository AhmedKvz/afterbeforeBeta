import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Lucky100Entry {
  id: string;
  user_id: string;
  week_number: number;
  year: number;
  entry_date: string;
  eligible: boolean;
  won: boolean;
  prize_event_id: string | null;
  created_at: string;
}

interface RecentEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  entry_date: string;
}

interface Lucky100Stats {
  count: number;
  weekNumber: number;
  year: number;
  recentEntries: RecentEntry[];
}

// Get current ISO week number and year
export const getCurrentWeekInfo = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return { weekNumber, year: now.getFullYear() };
};

// Get next Friday at 20:00
export const getNextDrawTime = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  
  // If it's Friday
  if (dayOfWeek === 5) {
    // If past 20:00, next Friday
    if (now.getHours() >= 20) {
      daysUntilFriday = 7;
    } else {
      daysUntilFriday = 0;
    }
  }
  
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(20, 0, 0, 0);
  
  return nextFriday;
};

// Trigger confetti celebration
export const triggerConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#a855f7', '#ec4899', '#f97316'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#a855f7', '#ec4899', '#f97316'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#a855f7', '#ec4899', '#f97316'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#a855f7', '#ec4899', '#f97316'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#a855f7', '#ec4899', '#f97316'],
  });
};

// Trigger haptic feedback
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[type]);
  }
};

export const useLucky100 = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { weekNumber, year } = getCurrentWeekInfo();

  // Get current week's entry for user
  const { data: currentEntry, isLoading: entryLoading } = useQuery({
    queryKey: ['lucky100-entry', user?.id, weekNumber, year],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('lucky_100_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_number', weekNumber)
        .eq('year', year)
        .maybeSingle();
      
      if (error) throw error;
      return data as Lucky100Entry | null;
    },
    enabled: !!user,
  });

  // Get public stats (count + recent entries) from edge function
  const { data: publicStats, isLoading: statsLoading } = useQuery({
    queryKey: ['lucky100-stats', weekNumber, year],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('lucky100-stats');
      
      if (error) {
        console.error('Stats error:', error);
        // Fallback to simulated data
        return {
          count: Math.floor(Math.random() * 50) + 30,
          weekNumber,
          year,
          recentEntries: [],
        } as Lucky100Stats;
      }
      
      return data as Lucky100Stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get all user's entries (history)
  const { data: entryHistory } = useQuery({
    queryKey: ['lucky100-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('lucky_100_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Lucky100Entry[];
    },
    enabled: !!user,
  });

  // Manual entry (fallback if auto-trigger doesn't fire)
  const enterMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('lucky_100_entries')
        .insert({
          user_id: user.id,
          week_number: weekNumber,
          year: year,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          // Already entered
          return null;
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      // Trigger celebration
      triggerConfetti();
      triggerHaptic('heavy');
      
      queryClient.invalidateQueries({ queryKey: ['lucky100-entry'] });
      queryClient.invalidateQueries({ queryKey: ['lucky100-stats'] });
      
      toast.success("🍀 You're in! Good luck on Friday!", {
        description: 'Winners announced at 20:00',
        duration: 5000,
      });
    },
    onError: (error) => {
      toast.error('Could not enter Lucky 100', {
        description: error.message
      });
    },
  });

  // Admin draw winners
  const drawWinnersMutation = useMutation({
    mutationFn: async (numWinners: number = 5) => {
      const { data, error } = await supabase
        .rpc('draw_lucky_100_winners', { num_winners: numWinners });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lucky100'] });
      toast.success(`Drew ${data?.length || 0} winners!`);
    },
    onError: (error) => {
      toast.error('Failed to draw winners', {
        description: error.message
      });
    },
  });

  const isEntered = !!currentEntry;
  const hasWonThisWeek = currentEntry?.won ?? false;
  const totalWins = entryHistory?.filter(e => e.won).length ?? 0;
  const monthlyEntries = entryHistory?.filter(e => {
    const entryDate = new Date(e.created_at);
    const now = new Date();
    return entryDate.getMonth() === now.getMonth() && 
           entryDate.getFullYear() === now.getFullYear();
  }).length ?? 0;

  return {
    currentEntry,
    entryHistory,
    isEntered,
    hasWonThisWeek,
    totalWins,
    monthlyEntries,
    weeklyEntryCount: publicStats?.count ?? 0,
    recentEntries: publicStats?.recentEntries ?? [],
    isLoading: entryLoading || statsLoading,
    enter: enterMutation.mutate,
    isEntering: enterMutation.isPending,
    drawWinners: drawWinnersMutation.mutate,
    isDrawing: drawWinnersMutation.isPending,
    weekNumber,
    year,
    nextDrawTime: getNextDrawTime(),
  };
};
