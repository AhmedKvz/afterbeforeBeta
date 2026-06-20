import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  venue_id: string | null;   // directory uuid (for secure check-in + sparks); null if unmapped
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
      // `venues` is now the canonical source of truth (Phase 1 of venue unification).
      const [{ data: dirVenues }, { data: heat }, { data: evCoords }] = await Promise.all([
        db.from('venues').select('*'),
        db.rpc('get_venue_heat', { days_back: 7 }),
        db.from('events').select('venue_name, geofence_radius').not('latitude', 'is', null),
      ]);

      const heatMap = new Map<string, any>();
      (heat || []).forEach((h: any) => heatMap.set(h.venue_name, h));

      // geofence radius per venue (from events; venues coords come from the directory)
      const radiusMap = new Map<string, number>();
      (evCoords || []).forEach((e: any) => { if (!radiusMap.has(e.venue_name)) radiusMap.set(e.venue_name, e.geofence_radius || 100); });

      return (dirVenues || []).map((v: any) => {
        const h = heatMap.get(v.name);
        const type = v.type || 'club';
        const { x, y } = coordFor(v.neighborhood, v.name);
        const totalHeat = h?.total_heat ?? 0;
        const heat = Math.min(100, Math.round(totalHeat > 100 ? 100 : totalHeat));
        return {
          id: v.name,                          // presence keys by name (kept for compat)
          venue_id: v.id,                      // canonical directory uuid (check-in / sparks)
          name: v.name,
          type,
          neighborhood: v.neighborhood || 'Belgrade',
          emoji: v.emoji || TYPE_EMOJI[type] || '📍',
          hue: v.hue ?? hueFromString(v.name),
          mode: TYPE_MODE[type] || 'both',
          x, y,
          heat: Math.max(heat, 8),
          here: h?.signal_count ?? 0,
          walk: walkFor(v.name),
          vibe: h?.top_event_title || `${type} · Belgrade`,
          topEventId: h?.top_event_id || null,
          lat: v.latitude != null ? Number(v.latitude) : null,
          lng: v.longitude != null ? Number(v.longitude) : null,
          radius: radiusMap.get(v.name) ?? 100,
        } as HeatVenue;
      });
    },
  });
};

/**
 * Reciprocal opt-in presence for a venue (RPC get_venue_presence).
 * Always returns headcount; returns people[] only if the caller is visible there.
 */
export const useVenuePresence = (venueName: string | null) => {
  return useQuery({
    queryKey: ['venue-presence', venueName],
    enabled: !!venueName,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_venue_presence', { p_venue: venueName });
      if (error) throw error;
      return (data as { headcount: number; me_visible: boolean; people: any[] }) || { headcount: 0, me_visible: false, people: [] };
    },
  });
};

/** Set / refresh / toggle my opt-in visibility at a venue. */
export const useSetVenuePresence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ venue, visible }: { venue: string; visible: boolean }) => {
      const { error } = await db.rpc('set_venue_presence', { p_venue: venue, p_visible: visible });
      if (error) throw error;
      return { venue, visible };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['venue-presence'] }),
  });
};
