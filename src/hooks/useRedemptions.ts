import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const db = supabase as any;

export type Redemption = {
  id: string; code: string; status: 'claimed' | 'unlocked' | 'redeemed' | 'expired';
  night: string | null; created_at: string;
  title: string; icon: string | null; reward_type: string;
  venue_name: string | null; venue_emoji: string | null;
};

/** The signed-in user's own passes/codes (RewardsHub "Moje propusnice"). */
export const useMyRedemptions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-redemptions', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Redemption[]> => {
      const { data, error } = await db.rpc('get_my_redemptions');
      if (error) throw error;
      return (data as Redemption[]) || [];
    },
  });
};

/** "Idem" — najava. Signals intent (who's-going + reserves), earns NOTHING (Z6). */
export const useSignalIntent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ venue }: { venue: string }) => {
      const { data, error } = await db.rpc('signal_intent', { p_venue: venue });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      track('intent_signaled', { venue: vars.venue });
      queryClient.invalidateQueries({ queryKey: ['venue-intent'] });
      toast('Najavljeno ✓', { description: 'Vidiš se na lokaciji — poeni stižu kad se čekiraš.' });
    },
    onError: (e: any) => toast('Ne može', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });
};

/** Venue door: tonight's guest-list for a venue (owner/club account only). */
export const useVenueGuestlist = (venueId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['venue-guestlist', venueId, user?.id],
    enabled: !!user && !!venueId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_venue_guestlist', { p_venue: venueId });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
};

/** Venue door: confirm a guest's code at the entrance. Only works after the guest has pinged. */
export const useVerifyRedemption = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await db.rpc('verify_redemption', { p_code: code.trim() });
      if (error) throw error;
      return data as { ok: boolean; title: string; guest: string };
    },
    onSuccess: (res) => {
      track('reward_verified', { title: res?.title });
      queryClient.invalidateQueries({ queryKey: ['venue-guestlist'] });
      toast(`✓ ${res?.guest}`, { description: `${res?.title} — propušten.` });
    },
    onError: (e: any) => toast('Ne važi', { description: e?.message ?? 'Proveri kod.' }),
  });
};
