import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { hueFromString } from '@/lib/gradients';

const db = supabase as any;

// Known Belgrade neighborhoods → stylized map coordinates (0–100 %).
const HOOD_COORDS: Record<string, { x: number; y: number }> = {
  savamala: { x: 33, y: 62 },
  vracar: { x: 72, y: 60 },
  'vračar': { x: 72, y: 60 },
  dorcol: { x: 62, y: 30 },
  'dorćol': { x: 62, y: 30 },
  'stari grad': { x: 50, y: 44 },
  'knez mihailova': { x: 50, y: 44 },
  'new belgrade': { x: 18, y: 32 },
  'novi beograd': { x: 18, y: 32 },
  'savski venac': { x: 42, y: 52 },
  zemun: { x: 10, y: 18 },
  'sava river': { x: 26, y: 50 },
};

export const BELGRADE_HOODS = [
  { name: 'NEW BELGRADE', x: 18, y: 22 },
  { name: 'SAVAMALA', x: 33, y: 72 },
  { name: 'DORĆOL', x: 64, y: 24 },
  { name: 'KNEZ MIHAILOVA', x: 50, y: 38 },
  { name: 'VRAČAR', x: 72, y: 72 },
];

const TYPE_EMOJI: Record<string, string> = {
  club: '🎵', splav: '🚢', cafe: '☕', cafe_bar: '☕', bar: '🍸',
  restaurant: '🍽', gallery: '🎨', afterplace: '🍔',
};

// time-of-day surface for each venue type
const TYPE_MODE: Record<string, 'day' | 'night' | 'both'> = {
  club: 'night', splav: 'night', bar: 'both', afterplace: 'night',
  cafe: 'day', cafe_bar: 'day', restaurant: 'day', gallery: 'day',
};

function coordFor(neighborhood: string | null, key: string) {
  const n = (neighborhood || '').trim().toLowerCase();
  if (HOOD_COORDS[n]) return HOOD_COORDS[n];
  // stable pseudo-position from the venue name
  const h = hueFromString(key);
  return { x: 20 + (h % 60), y: 28 + ((h * 7) % 44) };
}

function walkFor(key: string) {
  const h = hueFromString(key + 'walk');
  return 4 + (h % 24); // 4–27 min
}

export interface HeatVenue {
  id: string;
  name: string;
  type: string;
  neighborhood: string;
  emoji: string;
  hue: number;
  mode: 'day' | 'night' | 'both';
  x: number;
  y: number;
  heat: number;
  here: number;
  walk: number;
  vibe: string;
  topEventId: string | null;
  lat: number | null;
  lng: number | null;
  radius: number;
}

/**
 * Real venues (club_venue profiles) merged with live heat (get_venue_heat RPC),
 * placed onto the stylized Belgrade map via neighborhood coordinates.
 */
export const useHeatVenues = () => {
  return useQuery<HeatVenue[]>({
    queryKey: ['heat-venues'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [{ data: venues }, { data: heat }, { data: evCoords }] = await Promise.all([
        db.from('profiles')
          .select('venue_name, venue_type, neighborhood')
          .eq('account_type', 'club_venue')
          .not('venue_name', 'is', null),
        db.rpc('get_venue_heat', { days_back: 7 }),
        db.from('events')
          .select('venue_name, latitude, longitude, geofence_radius')
          .not('latitude', 'is', null),
      ]);

      const heatMap = new Map<string, any>();
      (heat || []).forEach((h: any) => heatMap.set(h.venue_name, h));

      // first known coordinate per venue (from its events)
      const coordMap = new Map<string, { lat: number; lng: number; radius: number }>();
      (evCoords || []).forEach((e: any) => {
        if (!coordMap.has(e.venue_name) && e.latitude != null) {
          coordMap.set(e.venue_name, { lat: Number(e.latitude), lng: Number(e.longitude), radius: e.geofence_radius || 100 });
        }
      });

      return (venues || []).map((v: any) => {
        const h = heatMap.get(v.venue_name);
        const c = coordMap.get(v.venue_name);
        const type = v.venue_type || 'club';
        const { x, y } = coordFor(v.neighborhood, v.venue_name);
        const totalHeat = h?.total_heat ?? 0;
        // clamp heat to 0–100 for the visual scale
        const heat = Math.min(100, Math.round((totalHeat / Math.max(1, 1)) > 100 ? 100 : totalHeat));
        return {
          id: v.venue_name,
          name: v.venue_name,
          type,
          neighborhood: v.neighborhood || 'Belgrade',
          emoji: TYPE_EMOJI[type] || '📍',
          hue: hueFromString(v.venue_name),
          mode: TYPE_MODE[type] || 'both',
          x, y,
          heat: Math.max(heat, 8),
          here: h?.signal_count ?? 0,
          walk: walkFor(v.venue_name),
          vibe: h?.top_event_title || `${type} · Belgrade`,
          topEventId: h?.top_event_id || null,
          lat: c?.lat ?? null,
          lng: c?.lng ?? null,
          radius: c?.radius ?? 100,
        } as HeatVenue;
      });
    },
  });
};

/** Who's recently checked in at a venue (real, via event_checkins → events → profiles). */
export const useVenuePresence = (venueName: string | null) => {
  return useQuery({
    queryKey: ['venue-presence', venueName],
    enabled: !!venueName,
    queryFn: async () => {
      // events at this venue
      const { data: events } = await db.from('events').select('id').eq('venue_name', venueName);
      const ids = (events || []).map((e: any) => e.id);
      if (!ids.length) return [];
      const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data: checkins } = await db
        .from('event_checkins')
        .select('user_id, checked_in_at')
        .in('event_id', ids)
        .gte('checked_in_at', sixHoursAgo)
        .order('checked_in_at', { ascending: false })
        .limit(8);
      const userIds = [...new Set((checkins || []).map((c: any) => c.user_id))];
      if (!userIds.length) return [];
      const { data: profiles } = await db
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const pmap = new Map<string, any>();
      (profiles || []).forEach((p: any) => pmap.set(p.user_id, p));
      return (checkins || []).slice(0, 5).map((c: any) => ({
        user_id: c.user_id,
        name: pmap.get(c.user_id)?.display_name || 'Raver',
        avatar: pmap.get(c.user_id)?.avatar_url || null,
        status: 'checked in',
      }));
    },
  });
};
