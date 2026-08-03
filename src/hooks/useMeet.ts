import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

export type MeetMode = 'dates' | 'crew';

export interface MeetCard {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  city: string | null;
  music_preferences: string[];
  top_venues: string[];
  nights: number;
  shared_venues: number;
  together: number;                                   // noći na ISTOM mestu ISTE noći
  together_last: { venue: string; night: string } | null;
  genre_overlap: number;
}

/** Deck: opted-in ljudi u tom modu, bez već swipe-ovanih i bez postojećih niti. */
export const useMeetDeck = (mode: MeetMode, enabled: boolean) =>
  useQuery<MeetCard[]>({
    queryKey: ['meet-deck', mode],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_meet_deck', { p_mode: mode });
      if (error) throw error;
      return data || [];
    },
  });

export const useMeetSwipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { to: string; mode: MeetMode; like: boolean }) => {
      const { data, error } = await db.rpc('meet_swipe', { p_to: p.to, p_mode: p.mode, p_like: p.like });
      if (error) throw error;
      return data as { matched: boolean; conversation_id?: string; partner?: { user_id: string; name: string; avatar: string | null } };
    },
    onSuccess: (res) => {
      if (res?.matched) qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

/** Opt-in prekidači — default OFF; gašenje te odmah vadi iz tuđih deckova. */
export const useMeetOptIn = () => {
  const { user, profile, refreshProfile } = useAuth() as any;
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async (p: { mode: MeetMode; on: boolean }) => {
      const col = p.mode === 'dates' ? 'open_dates' : 'open_crew';
      const { error } = await db.from('profiles').update({ [col]: p.on }).eq('user_id', user.id);
      if (error) throw error;
      return p;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['meet-deck'] });
    },
  });
  return {
    dates: !!(profile as any)?.open_dates,
    crew: !!(profile as any)?.open_crew,
    set: mut.mutate,
    isPending: mut.isPending,
  };
};

/* ══ PAR ZA PAR (founder 2026-08-03) ══
   Ti + tvoj čovek = par. Deck pokazuje DRUGE parove; uzajamna iskra pravi
   grupu od 4 kroz postojeći crew (grupni chat), ne četiri odvojene niti. */

export interface PairPerson { user_id: string; name: string; avatar: string | null; genres: string[] }
export interface PairCard { id: string; person_a: PairPerson; person_b: PairPerson; together: number; together_venue: string | null }
export interface MyPair {
  has_pair: boolean; id?: string; status?: 'pending' | 'active'; i_invited?: boolean;
  crew_id?: string | null; partner?: { user_id: string; name: string; avatar: string | null };
}

export const useMyPair = () => {
  const { user } = useAuth();
  return useQuery<MyPair>({
    queryKey: ['my-pair', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('my_pair');
      if (error) throw error;
      return data || { has_pair: false };
    },
  });
};

export const usePairCandidates = (enabled: boolean) =>
  useQuery<{ user_id: string; display_name: string; avatar_url: string | null }[]>({
    queryKey: ['pair-candidates'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('pair_candidates');
      if (error) throw error;
      return data || [];
    },
  });

export const usePairDeck = (enabled: boolean) =>
  useQuery<PairCard[]>({
    queryKey: ['pair-deck'],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_pair_deck');
      if (error) throw error;
      return data || [];
    },
  });

export const usePairActions = () => {
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ['my-pair'] }); qc.invalidateQueries({ queryKey: ['pair-deck'] }); qc.invalidateQueries({ queryKey: ['pair-candidates'] }); };

  const invite = useMutation({
    mutationFn: async (to: string) => { const { data, error } = await db.rpc('pair_invite', { p_to: to }); if (error) throw error; return data; },
    onSuccess: inv,
  });
  const respond = useMutation({
    mutationFn: async (p: { id: string; accept: boolean }) => { const { data, error } = await db.rpc('pair_respond', { p_pair: p.id, p_accept: p.accept }); if (error) throw error; return data; },
    onSuccess: inv,
  });
  const leave = useMutation({
    mutationFn: async () => { const { data, error } = await db.rpc('pair_leave'); if (error) throw error; return data; },
    onSuccess: inv,
  });
  const swipe = useMutation({
    mutationFn: async (p: { to: string; like: boolean }) => {
      const { data, error } = await db.rpc('pair_swipe', { p_to_pair: p.to, p_like: p.like });
      if (error) throw error;
      return data as { matched: boolean; crew_id?: string };
    },
    onSuccess: (r) => { if (r?.matched) inv(); },
  });
  return { invite, respond, leave, swipe };
};
