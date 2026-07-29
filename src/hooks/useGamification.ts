import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

/* ── M2 KONVERGENCIJA — drop na mestu, nagradu nosi ko dođe ── */
export interface Convergence {
  id: string; title: string; reward_label: string; afc_bonus: number; capacity: number;
  starts_at: string; ends_at: string; status: string; venue_id: string; venue_name: string;
  funded_by: string | null; // ECONOMY §13: ko finansira nagradu (NULL = kuća)
  claimed: number; my_claimed: boolean; is_live: boolean;
}

export const useConvergences = () =>
  useQuery<Convergence[]>({
    queryKey: ['convergences'],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_convergences');
      if (error) throw error;
      return data || [];
    },
  });

export const useClaimConvergence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.rpc('claim_convergence', { p_drop: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convergences'] });
      qc.invalidateQueries({ queryKey: ['afc-ledger'] });
    },
  });
};

/* ── M1 IRL STREAK — niz nedelja zajedničkih noći (computed) ── */
export interface IrlStreak {
  partner_id: string; partner_name: string; partner_avatar: string | null;
  streak_weeks: number; last_night: string; last_venue: string | null; together_tonight: boolean;
}

export const useIrlStreaks = () => {
  const { user } = useAuth();
  return useQuery<IrlStreak[]>({
    queryKey: ['irl-streaks', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_irl_streaks');
      if (error) throw error;
      return data || [];
    },
  });
};

/* ── M3 GRADSKA ŠIFRA — fragmenti po mestima, crew pooling ── */
export interface CipherStatus {
  active: boolean; cipher_id?: string; total?: number;
  collected?: { word: string; venue_name: string }[]; collected_count?: number;
  completed?: boolean; reward_afc?: number;
}

export const useCipher = () => {
  const { user } = useAuth();
  return useQuery<CipherStatus>({
    queryKey: ['city-cipher', user?.id],
    enabled: !!user,
    refetchInterval: 120_000,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('cipher_status');
      if (error) throw error;
      return data || { active: false };
    },
  });
};

export const useCipherSubmit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phrase: string) => {
      const { data, error } = await db.rpc('cipher_submit', { p_phrase: phrase });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['city-cipher'] });
      qc.invalidateQueries({ queryKey: ['afc-ledger'] });
    },
  });
};

/* ── founder ── */
export const useCreateConvergence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { venue: string; title: string; reward: string; capacity: number; starts: string; ends: string; afc: number; fundedBy?: string }) => {
      const { data, error } = await db.rpc('create_convergence', {
        p_venue: p.venue, p_title: p.title, p_reward: p.reward, p_capacity: p.capacity,
        p_starts: p.starts, p_ends: p.ends, p_afc: p.afc, p_funded_by: p.fundedBy || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convergences'] }),
  });
};

export const useCreateCipher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { night: string; phrase: string; fragments: { venue_id: string; word: string }[]; reward: number }) => {
      const { data, error } = await db.rpc('create_cipher', {
        p_night: p.night, p_phrase: p.phrase, p_fragments: p.fragments, p_reward: p.reward, p_live: true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['city-cipher'] }),
  });
};
