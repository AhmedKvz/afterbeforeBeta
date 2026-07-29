import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

export interface MyNight {
  venueId: string;
  venueName: string;
  venueType: string;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  radius: number;
  since: string;          // ISO check-in vreme
  sinceLabel: string;     // HH:MM
}

/**
 * "Moja noć" — poslednji check-in u zadnjih 12h (isti prozor kao presence gate
 * i both_at_venue). Ovo pali orb (TU SAM → gori) i otvara HUB VEČERI.
 * IA v2 §11.2.
 */
export const useMyNight = () => {
  const { user } = useAuth();
  return useQuery<MyNight | null>({
    queryKey: ['my-night', user?.id],
    enabled: !!user,
    refetchInterval: 120_000,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await db
        .from('venue_checkins')
        .select('created_at, venue_id, venues(name, type, neighborhood, latitude, longitude, geofence_radius_m)')
        .eq('user_id', user!.id)
        .gt('created_at', new Date(Date.now() - 12 * 3600_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data?.venue_id || !data?.venues) return null;
      const v: any = data.venues;
      const d = new Date(data.created_at);
      return {
        venueId: data.venue_id,
        venueName: v.name,
        venueType: v.type || 'club',
        neighborhood: v.neighborhood ?? null,
        lat: v.latitude != null ? Number(v.latitude) : null,
        lng: v.longitude != null ? Number(v.longitude) : null,
        radius: v.geofence_radius_m || 100,
        since: data.created_at,
        sinceLabel: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      };
    },
  });
};
