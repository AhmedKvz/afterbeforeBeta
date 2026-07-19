import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { incrementQuestProgress } from '@/services/questProgress';
import { getCurrentPosition, calculateDistance, formatDistance } from '@/services/geolocation';
import { track } from '@/lib/analytics';
import { shouldShowFeedback } from '@/lib/feedbackCadence';
import { toast } from 'sonner';
import type { OSVenue } from '../OSVenueSheet';

const db = supabase as any;
const DEV_SKIP_GEOFENCE = import.meta.env.VITE_OPEN_CHECKIN === 'true';

/**
 * GPS check-in — the money path (XP + AFC + quests + feedback), extracted from
 * OSVenueSheet (ultra-review D1). This is the Capacitor hotspot: when native
 * lands, only getCurrentPosition() here swaps to the Capacitor Geolocation
 * plugin — the sheet UI stays untouched.
 */
export const useCheckIn = (venue: OSVenue, onFeedback: (venueId: string) => void) => {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [award, setAward] = useState<number | null>(null);

  const checkIn = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      // iskren-broj: bez venue uuid-a nema pravog awarda — ne foliraj uspeh
      if (!venue.venueId) { toast('Check-in radi sa Heat mape — nađi ovo mesto na pinu.'); return; }
      let pos: GeolocationPosition | null = null;
      try { pos = await getCurrentPosition(); } catch { if (!DEV_SKIP_GEOFENCE) { toast.error('Uključi lokaciju za check-in.'); return; } }
      // #57: klijentski prag = TAČNO server prag (venues.geofence_radius_m)
      const geoRadius = venue.radius || 100;
      if (!DEV_SKIP_GEOFENCE && pos && venue.lat != null && venue.lng != null) {
        const d = calculateDistance(pos.coords.latitude, pos.coords.longitude, venue.lat, venue.lng);
        if (d > geoRadius) { toast.error(`${formatDistance(d)} od ${venue.name} — priđi na ${geoRadius}m za check-in.`); return; }
      }
      const lat = pos?.coords.latitude ?? venue.lat ?? 0;
      const lon = pos?.coords.longitude ?? venue.lng ?? 0;
      const { data, error } = await db.rpc('process_secure_checkin', { p_venue: venue.venueId, p_lat: lat, p_lon: lon });
      if (error) {
        const msg = String(error.message || '');
        // #57: server vraća parsabilno 'TOO_FAR <dist> <radius>' kad je geofence upaljen
        const far = msg.match(/TOO_FAR (\d+) (\d+)/);
        if (far) { toast.error(`${formatDistance(Number(far[1]))} od ${venue.name} — priđi na ${far[2]}m za check-in.`); return; }
        toast.error(msg.includes('12 hours') || msg.includes('duplicate') ? 'Već si se prijavio ovde večeras.' : 'Check-in nije prošao — pokušaj ponovo.');
        return;
      }
      if (user) { incrementQuestProgress(user.id, 'check_in').catch(() => {}); incrementQuestProgress(user.id, 'explore').catch(() => {}); }
      track('check_in', { venue: venue.name, venue_id: venue.venueId, secure: true, awarded_xp: data?.awarded_xp });
      setDone(true);
      if (data?.awarded_xp) setAward(Number(data.awarded_xp));
      toast.success(data ? `Prijavljen ✓ · +${data.awarded_xp} REP · +${data.awarded_afc} AFC` : 'Prijavljen ✓');
      if (venue.venueId && shouldShowFeedback()) setTimeout(() => onFeedback(venue.venueId!), 1400);
    } finally {
      setBusy(false);
    }
  };

  return { checkIn, done, busy, award };
};
