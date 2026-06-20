import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const db = supabase as any;

/** Sparks sent TO me — anonymized ("someone from [venue]") until I respond. */
export const useReceivedSparks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['received-sparks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_received_sparks');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
};

/** People at a venue I can spark (visible — the who's-here side). */
export const useSparkable = (venueId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sparkable', venueId, user?.id],
    enabled: !!user && !!venueId,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_sparkable', { p_venue: venueId });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
};

export const useSparkActions = () => {
  const queryClient = useQueryClient();

  const respond = useMutation({
    mutationFn: async (sparkId: string) => {
      const { data, error } = await db.rpc('respond_spark', { p_spark: sparkId });
      if (error) throw error;
      return data as { mutual: boolean; conversation_id: string; other_id: string };
    },
    onSuccess: (res: any) => {
      track('iskra_respond', { mutual: !!res?.mutual });
      if (res?.mutual) track('iskra_mutual', { from: 'respond', conversation_id: res?.conversation_id });
      queryClient.invalidateQueries({ queryKey: ['received-sparks'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast('Iskra uzvraćena ✨', { description: 'Otvara se chat — reci ćao.' });
    },
    onError: (e: any) => toast('Ups', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });

  const send = useMutation({
    mutationFn: async ({ to, venue }: { to: string; venue: string }) => {
      const { data, error } = await db.rpc('send_spark', { p_to: to, p_venue: venue });
      if (error) throw error;
      return data as { mutual: boolean; conversation_id?: string };
    },
    onSuccess: (res: any, vars: any) => {
      track('iskra_sent', { venue: vars?.venue, to: vars?.to, mutual: !!res?.mutual });
      if (res?.mutual) track('iskra_mutual', { from: 'send', conversation_id: res?.conversation_id });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['sparkable'] });
      toast(res?.mutual ? 'Mutual! ✨' : 'Iskra poslata ✨', {
        description: res?.mutual ? 'Oboje ste poslali — otvara se chat.' : 'Anonimno — javimo ti ako uzvrati.',
      });
    },
    onError: (e: any) => toast('Ne može', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });

  return { respond, send };
};
