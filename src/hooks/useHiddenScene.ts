import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

/* ── SKRIVENA SCENA (QUEST-DOKTRINA §6) — predlog mesta → founder kuracija ── */

export interface VenueSuggestion {
  id: string; name: string; area: string | null; why?: string | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string; suggested_by?: string;
}

export const useMySuggestions = () => {
  const { user } = useAuth();
  return useQuery<VenueSuggestion[]>({
    queryKey: ['my-venue-suggestions', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('my_venue_suggestions');
      if (error) throw error;
      return data || [];
    },
  });
};

export const useSuggestVenue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { name: string; area?: string; why?: string }) => {
      const { data, error } = await db.rpc('suggest_venue', { p_name: p.name, p_area: p.area || null, p_why: p.why || null });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-venue-suggestions'] }),
  });
};

/* ── founder (War Room) ── */
export const useAdminSuggestions = () =>
  useQuery<VenueSuggestion[]>({
    queryKey: ['admin-venue-suggestions'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('admin_list_suggestions');
      if (error) throw error;
      return data || [];
    },
  });

/* ── POP-UP eventi (efemeralni venue, §6) — founder ── */
export const useActivePopups = () =>
  useQuery({
    queryKey: ['admin-active-popups'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db.from('venues')
        .select('id, name, neighborhood, emoji, active_until, is_hidden, min_level')
        .eq('type', 'popup').gt('active_until', new Date().toISOString())
        .order('active_until', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

export const useCreatePopup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      name: string; neighborhood?: string; emoji?: string;
      lat: number; lng: number; until: string;
      radius?: number; hidden?: boolean; minLevel?: number; repMult?: number;
    }) => {
      const { data, error } = await db.rpc('admin_create_popup', {
        p_name: p.name, p_neighborhood: p.neighborhood || null, p_emoji: p.emoji || '⚡',
        p_lat: p.lat, p_lng: p.lng, p_until: p.until,
        p_radius: p.radius ?? 150, p_hidden: p.hidden ?? false,
        p_min_level: p.minLevel ?? 0, p_rep_mult: p.repMult ?? 1.5,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-active-popups'] });
      qc.invalidateQueries({ queryKey: ['venue-directory'] });
    },
  });
};

export const useEndPopup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.rpc('admin_end_popup', { p_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-active-popups'] });
      qc.invalidateQueries({ queryKey: ['venue-directory'] });
    },
  });
};

export const useDecideSuggestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string; approve: boolean;
      type?: string; neighborhood?: string; emoji?: string;
      lat?: number | null; lng?: number | null;
      minLevel?: number; repMult?: number; radius?: number;
    }) => {
      const { data, error } = await db.rpc('admin_decide_suggestion', {
        p_id: p.id, p_approve: p.approve,
        p_type: p.type || 'gallery', p_neighborhood: p.neighborhood || null, p_emoji: p.emoji || '✨',
        p_lat: p.lat ?? null, p_lng: p.lng ?? null,
        p_min_level: p.minLevel ?? 2, p_rep_mult: p.repMult ?? 2, p_radius: p.radius ?? 150,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-venue-suggestions'] });
      qc.invalidateQueries({ queryKey: ['venue-directory'] });
    },
  });
};
