import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface RoadmapStop { venue: string; time: string; note?: string }
export interface Roadmap {
  id: string; title: string; day: 'PET' | 'SUB' | 'NED'; why: string | null;
  stops: RoadmapStop[]; status: 'pending' | 'approved';
  author: string; mine: boolean; saves: number; my_saved: boolean; created_at: string;
}

/** Weekend Roadmap v0 (QUEST §6): Quests pravi → founder validira → Home
 *  distribuira. Nagrada (+100 AFC) ide POSLE odobrenja, server-side. */
export const useRoadmaps = () =>
  useQuery<Roadmap[]>({
    queryKey: ['roadmaps'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_roadmaps');
      if (error) throw error;
      return data || [];
    },
  });

export const useSubmitRoadmap = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { title: string; day: string; why: string; stops: RoadmapStop[] }) => {
      const { data, error } = await db.rpc('submit_roadmap', { p_title: p.title, p_day: p.day, p_why: p.why, p_stops: p.stops });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmaps'] }),
  });
};

export const useToggleRoadmapSave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.rpc('toggle_roadmap_save', { p_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmaps'] }),
  });
};

export const useModerateRoadmap = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: 'approved' | 'rejected' }) => {
      const { data, error } = await db.rpc('moderate_roadmap', { p_id: p.id, p_status: p.status });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmaps'] }),
  });
};
