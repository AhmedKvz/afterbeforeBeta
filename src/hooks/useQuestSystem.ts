import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentWeekStart } from '@/services/questProgress';
import { toast } from 'sonner';

// untyped helper for tables/RPCs not in generated types
const db = supabase as any;

/* ─────────────── Rewards store ─────────────── */
export const useRewards = () => {
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data, error } = await db.from('rewards').select('*').eq('is_active', true).order('sort');
      if (error) throw error;
      return data || [];
    },
  });

  const redeem = useMutation({
    mutationFn: async (rewardId: string) => {
      const { data, error } = await db.rpc('redeem_reward', { p_reward_id: rewardId });
      if (error) throw error;
      return data as { redeemed: boolean; balance: number; title: string };
    },
    onSuccess: async (res) => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['reward-redemptions'] });
      toast('Redeemed 🎁', { description: `${res.title} — ${res.balance.toLocaleString()} XP left.` });
    },
    onError: (e: any) => toast('Could not redeem', { description: e?.message ?? 'Try again.' }),
  });

  return { rewards, isLoading, redeem: redeem.mutate, isRedeeming: redeem.isPending };
};

/* ─────────────── Daily streak ─────────────── */
export const useStreak = () => {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = getCurrentWeekStart();

  const { data: streak } = useQuery({
    queryKey: ['user-streak', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.from('user_streaks').select('*').eq('user_id', user!.id).maybeSingle();
      return data || { current_streak: 0, longest_streak: 0, last_claim_date: null };
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['streak-claims', user?.id, weekStart],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from('streak_claims')
        .select('claim_date, xp')
        .eq('user_id', user!.id)
        .gte('claim_date', weekStart);
      return data || [];
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const claimedToday = (claims as any[]).some((c) => c.claim_date === today);

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc('claim_daily_streak');
      if (error) throw error;
      return data as { current_streak: number; xp: number; claimed?: boolean; already_claimed?: boolean };
    },
    onSuccess: async (res) => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['user-streak'] });
      queryClient.invalidateQueries({ queryKey: ['streak-claims'] });
      if (res.already_claimed) toast('Already claimed today ✓');
      else toast(`+${res.xp} XP · ${res.current_streak}-day streak 🔥`);
    },
    onError: (e: any) => toast('Could not claim', { description: e?.message ?? 'Try again.' }),
  });

  return {
    streak: streak || { current_streak: 0, longest_streak: 0, last_claim_date: null },
    claimedToday,
    claimedDates: new Set((claims as any[]).map((c) => c.claim_date)),
    claim: claim.mutate,
    isClaiming: claim.isPending,
  };
};

/* ─────────────── Sponsored quests ─────────────── */
export const useSponsoredQuests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sponsored = [] } = useQuery({
    queryKey: ['sponsored-quests', user?.id],
    queryFn: async () => {
      const { data: quests, error } = await db
        .from('sponsored_quests')
        .select('*')
        .eq('is_active', true)
        .order('sort');
      if (error) throw error;
      let progress: any[] = [];
      if (user) {
        const { data: p } = await db.from('sponsored_quest_progress').select('*').eq('user_id', user.id);
        progress = p || [];
      }
      return (quests || []).map((q: any) => ({
        ...q,
        accepted: progress.some((p) => p.sponsored_quest_id === q.id),
        progress: progress.find((p) => p.sponsored_quest_id === q.id)?.progress || 0,
      }));
    },
  });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc('accept_sponsored_quest', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsored-quests'] });
      toast('Quest accepted ⭐', { description: 'Complete it in-venue to claim the perk.' });
    },
    onError: (e: any) => toast('Could not accept', { description: e?.message ?? 'Try again.' }),
  });

  return { sponsored, accept: accept.mutate, isAccepting: accept.isPending };
};

/* ─────────────── Custom / crew quests ─────────────── */
export const useCustomQuests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customQuests = [], isLoading } = useQuery({
    queryKey: ['custom-quests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from('custom_quests')
        .select('*, custom_quest_members(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((q: any) => {
        const members = q.custom_quest_members || [];
        const mine = members.find((m: any) => m.user_id === user?.id);
        const totalProgress = members.reduce((s: number, m: any) => s + (m.progress || 0), 0);
        return {
          ...q,
          members,
          memberCount: members.length,
          isCreator: q.creator_id === user?.id,
          myStatus: mine?.status || null,
          progress: totalProgress,
        };
      });
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      icon: string; title: string; description?: string; kind: string;
      target: number; xp: number; timeframe: string; isCrew: boolean; visibility?: string;
    }) => {
      const { data, error } = await db.rpc('create_user_quest', {
        p_icon: input.icon, p_title: input.title, p_description: input.description ?? '',
        p_kind: input.kind, p_target: input.target, p_xp: input.xp,
        p_timeframe: input.timeframe, p_is_crew: input.isCrew,
        p_visibility: input.visibility ?? (input.isCrew ? 'crew' : 'private'),
      });
      if (error) throw error;
      return data as { visibility: string; moderation_status: string };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['custom-quests'] });
      queryClient.invalidateQueries({ queryKey: ['creator-status'] });
      const pending = res?.moderation_status === 'pending';
      toast(pending ? 'Quest submitted 🕓' : 'Quest created 🚀', {
        description: pending ? 'In review — live once it passes the safety check.' : 'Find it under "Yours".',
      });
    },
    onError: (e: any) => toast('Could not create quest', { description: e?.message ?? 'Try again.' }),
  });

  const setMembership = useMutation({
    mutationFn: async ({ questId, status }: { questId: string; status: 'joined' | 'declined' }) => {
      if (!user) throw new Error('Not logged in');
      const { error } = await db
        .from('custom_quest_members')
        .update({ status })
        .eq('quest_id', questId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-quests'] }),
  });

  return {
    customQuests,
    isLoading,
    create: create.mutate,
    isCreating: create.isPending,
    join: (questId: string) => setMembership.mutate({ questId, status: 'joined' }),
    decline: (questId: string) => setMembership.mutate({ questId, status: 'declined' }),
  };
};

/* ─────────────── Creator Trust Level ─────────────── */
import type { CreatorStatus } from '@/lib/creatorLevels';

export const useCreatorStatus = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['creator-status', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CreatorStatus> => {
      const { data, error } = await db.rpc('get_creator_status');
      if (error) throw error;
      return data as CreatorStatus;
    },
  });

  return {
    status: data ?? { tier: 0, level: 1, created: 0, requirements: [] },
    isLoading,
  };
};
