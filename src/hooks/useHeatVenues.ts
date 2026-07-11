import { useMemo } from 'react';
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

// Design system: genre drives color. Each music scene has its own hue.
export const GENRE_HUE: Record<string, number> = {
  techno: 222,    // Electric Blue
  house: 38,      // Amber
  'tech house': 55,
  'deep house': 42,
  'hip hop': 280, // Purple
  trap: 280,
  rap: 280,
  'drum and bass': 185, // Cyan
  'dnb': 185,
  bass: 185,
  ambient: 330,   // Pink
  jazz: 330,
  afrobeat: 90,   // Green-yellow
  reggae: 120,
  electronic: 210,
  edm: 200,
  pop: 310,
  rock: 20,
  underground: 270,
};

export const GENRE_LABEL: Record<number, string> = {
  222: 'TECHNO',
  38: 'HOUSE',
  55: 'TECH HOUSE',
  42: 'DEEP HOUSE',
  280: 'HIP HOP',
  185: 'DNB',
  330: 'AFTER',
  210: 'ELECTRONIC',
  120: 'REGGAE',
  270: 'UNDERGROUND',
};

function genreHue(genres: string[] | null | undefined, type: string): number {
  if (genres && genres.length > 0) {
    for (const g of genres) {
      const key = g.toLowerCase().trim();
      if (GENRE_HUE[key] !== undefined) return GENRE_HUE[key];
      for (const [pattern, hue] of Object.entries(GENRE_HUE)) {
        if (key.includes(pattern)) return hue;
      }
    }
  }
  if (type === 'afterplace') return 330;
  if (type === 'splav') return 120;
  if (type === 'bar') return 38;
  return 270; // underground purple as default for clubs
}

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
  genreLabel: string;        // human-readable genre for display (TECHNO, HOUSE, etc.)
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
  // Static directory: venues + geofence radii change ~never — fetch once per
  // session (was re-downloaded every 60s incl. an all-events scan; ultra-review C3).
  const dir = useQuery({
    queryKey: ['venue-directory'],
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    queryFn: async () => {
      const [{ data: dirVenues }, { data: evCoords }] = await Promise.all([
        db.from('venues').select('id, name, type, neighborhood, emoji, hue, latitude, longitude'),
        db.from('events').select('venue_name, geofence_radius').not('latitude', 'is', null),
      ]);
      // Plain object, NOT a Map — query data is JSON-persisted (Wave E) and a
      // Map rehydrates as {} → .get() crashes the whole Heat screen.
      const radius: Record<string, number> = {};
      (evCoords || []).forEach((e: any) => { if (radius[e.venue_name] == null) radius[e.venue_name] = e.geofence_radius || 100; });
      return { venues: dirVenues || [], radius };
    },
  });

  // Live layer: only the heat RPC repeats (120s is plenty for a heat map).
  const heatQ = useQuery({
    queryKey: ['venue-heat'],
    refetchInterval: 120_000,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await db.rpc('get_venue_heat', { days_back: 7 });
      return data || [];
    },
  });

  const data = useMemo<HeatVenue[]>(() => {
    if (!dir.data) return [];
    const heatMap = new Map<string, any>();
    (heatQ.data || []).forEach((h: any) => heatMap.set(h.venue_name, h));
    const radius = dir.data.radius || {};

    return (dir.data.venues || []).map((v: any) => {
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
          hue: v.hue ?? genreHue(v.music_genres, type),
          genreLabel: GENRE_LABEL[v.hue ?? genreHue(v.music_genres, type)] || (type.toUpperCase()),
          mode: TYPE_MODE[type] || 'both',
          x, y,
          heat: Math.max(heat, 8),
          here: h?.signal_count ?? 0,
          walk: walkFor(v.name),
          vibe: h?.top_event_title || `${type} · Belgrade`,
          topEventId: h?.top_event_id || null,
          lat: v.latitude != null ? Number(v.latitude) : null,
          lng: v.longitude != null ? Number(v.longitude) : null,
          radius: radius[v.name] ?? 100,
        } as HeatVenue;
      });
  }, [dir.data, heatQ.data]);

  return { data, isLoading: dir.isLoading, refetch: heatQ.refetch };
};

/**
 * Reciprocal opt-in presence for a venue (RPC get_venue_presence).
 * Always returns headcount; returns people[] only if the caller is visible there.
 */
export const useVenuePresence = (venueName: string | null) => {
  return useQuery({
    queryKey: ['venue-presence', venueName],
    enabled: !!venueName,
    refetchInterval: 60_000,
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
