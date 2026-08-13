import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { incrementQuestProgress } from '@/services/questProgress';
import { getCurrentPosition, calculateDistance } from '@/services/geolocation';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';

const db = supabase as any;

/**
 * AUTO CHECK-IN: „Idem" je obećanje — ako se stvarno nađeš na toj lokaciji,
 * dolazak se potvrdi sam i poeni legnu bez ručnog check-ina.
 *
 * Granice (privatnost + poštenje):
 * - Radi SAMO kad postoji večerašnji neispunjen „Idem" — bez njega ne diramo GPS.
 * - Lokacija se čita samo ako je dozvola već data ('granted') — nikad ne
 *   iskačemo prompt iz pozadine; prvi prompt ostaje na ručnom check-inu.
 * - Uvek pravi geofence (klijent + server), i u open-checkin beta buildu —
 *   auto sme da upali samo STVARNI dolazak, inače bi „Idem" delio poene odmah.
 * - Jedna provera na otvaranje/focus + tihi interval dok je app vidljiv.
 *   Nema pozadinskog praćenja — ovo je potvrda dolaska, ne tracking.
 */
const CHECK_EVERY_MS = 4 * 60_000;

// noć TAČNO po serverskom pravilu: nightlife_date = (Beograd vreme) − 6h.
// ultra-review bug_004: formatiranje mora u Europe/Belgrade zoni — lokalna
// zona uređaja (putnik, pogrešan locale) promašuje noć i auto nikad ne okine.
export const tonight = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' })
    .format(new Date(Date.now() - 6 * 3600_000));

export const useAutoCheckIn = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const busy = useRef(false);
  // venue-i koje smo već pokrili u ovoj sesiji (uspeh ILI duplikat) — ne kucaj server ponovo
  const settled = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const sweep = async () => {
      if (busy.current || document.visibilityState !== 'visible') return;
      busy.current = true;
      try {
        // 1 · Postoji li večerašnji neispunjen „Idem"? (bez njega — ni GPS, ni RPC)
        const { data: intents } = await db
          .from('venue_intent')
          .select('id, venue_id, venues(name, latitude, longitude, geofence_radius_m)')
          .eq('user_id', user.id)
          .eq('night', tonight())
          .eq('fulfilled', false);
        const pending = (intents || []).filter(
          (i: any) => i.venues?.latitude != null && i.venues?.longitude != null && !settled.current.has(i.venue_id)
        );
        if (!alive || pending.length === 0) return;

        // 2 · GPS samo uz POUZDANO 'granted' — bez iznenadnih promptova.
        // ultra-review bug_011: bez Permissions API-ja (IG/FB webview, stari
        // Safari) ne možemo da znamo → NE pitamo; prvi prompt ostaje na ručnom.
        const perm = await navigator.permissions
          ?.query({ name: 'geolocation' as PermissionName })
          .catch(() => null);
        if (perm?.state !== 'granted') return;
        let pos: GeolocationPosition;
        try { pos = await getCurrentPosition(); } catch { return; }
        if (!alive) return;

        // 3 · Najbliži intent unutar STVARNOG geofence-a (nikad open-checkin prečica)
        const hit = pending
          .map((i: any) => ({
            i,
            d: calculateDistance(pos.coords.latitude, pos.coords.longitude, Number(i.venues.latitude), Number(i.venues.longitude)),
          }))
          .filter(({ i, d }: any) => d <= (i.venues.geofence_radius_m || 100))
          .sort((a: any, b: any) => a.d - b.d)[0];
        if (!hit) return;

        // 4 · Isti server put kao ručni check-in (XP/AFC/questovi legnu server-side)
        const { i } = hit;
        const { data, error } = await db.rpc('process_secure_checkin', {
          p_venue: i.venue_id, p_lat: pos.coords.latitude, p_lon: pos.coords.longitude,
        });
        const msg = String(error?.message || '');
        const duplicate = msg.includes('12 hours') || msg.includes('duplicate');
        if (error && !duplicate) return; // TOO_FAR/LEVEL_REQUIRED/ostalo — ćutimo, ručni put javlja greške
        settled.current.add(i.venue_id);
        await db.from('venue_intent').update({ fulfilled: true }).eq('id', i.id);
        if (duplicate) return; // već prijavljen ručno — samo zatvori intent, bez slavlja

        incrementQuestProgress(user.id, 'check_in').catch(() => {});
        incrementQuestProgress(user.id, 'explore').catch(() => {});
        track('check_in', { venue: i.venues.name, venue_id: i.venue_id, secure: true, auto: true, awarded_xp: data?.awarded_xp });
        qc.invalidateQueries({ queryKey: ['my-night'] });
        qc.invalidateQueries({ queryKey: ['venue-presence'] });
        qc.invalidateQueries({ queryKey: ['my-intent'] });
        toast.success(
          data?.awarded_xp
            ? `Stigao si u ${i.venues.name} ✓ auto check-in · +${data.awarded_xp} REP · +${data.awarded_afc} AFC`
            : `Stigao si u ${i.venues.name} ✓ auto check-in`,
          { duration: 6000 }
        );
      } finally {
        busy.current = false;
      }
    };

    sweep();
    const onVis = () => { if (document.visibilityState === 'visible') sweep(); };
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(sweep, CHECK_EVERY_MS);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
};
