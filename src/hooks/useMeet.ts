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
