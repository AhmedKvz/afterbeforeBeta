import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

/**
 * PASOŠ NOĆI (PREDLOG-JA-PASOS §6–8): noć = svi check-inovi 18:00→14:00
 * sutra, auto-grupisani. Kartica se piše sama iz postojećih check-inova —
 * nula truda, nula promptova u toku noći. Pečati su čista funkcija istorije
 * (deterministički iz podataka — pošten broj, ništa se ne izmišlja).
 */

// ZAKON: persisted react-query keš je JSON-only — datumi su ISO stringovi,
// NIKAD Date instance (Date u query data ruši app posle reload-a).
export interface NightVisit { name: string; type: string; neighborhood: string | null; at: string }
export interface Stamp { id: string; name: string; desc: string; emoji: string; earnedAt: string; where: string }
export interface Night { key: string; visits: NightVisit[]; stamps: Stamp[] }

// noć kojoj check-in pripada: pomeraj -14h (23:00 PET i 03:00 SUB = ista noć)
const nightKey = (d: Date) => {
  const s = new Date(d.getTime() - 14 * 3600_000);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
};

const S = (id: string, name: string, desc: string, emoji: string) => ({ id, name, desc, emoji });
// v1 katalog — samo pečati izračunljivi iz postojećih podataka (bez izmišljanja).
// Vodič / Hladni front / Rano na vratima / Obe obale čekaju svoje izvore podataka.
export const STAMP_DEFS = [
  S('prvo-mastilo', 'Prvo mastilo', 'Prvi check-in — knjiga je otvorena', '🖋'),
  S('zora', 'Zora', 'Check-in u zoru — noć koja nije htela da stane', '🌅'),
  S('triptih', 'Triptih', 'Tri mesta u jednoj noći', '🎞'),
  S('dubl', 'Dubl', 'Petak i subota, isti vikend', '♟'),
  S('domaci-teren', 'Domaći teren', 'Četvrti put na istom mestu', '🏠'),
  S('kartograf', 'Kartograf', 'Pet različitih mesta', '🗺'),
  S('recno-krstenje', 'Rečno krštenje', 'Prvi put na reci', '🌊'),
  S('nepoznata-lokacija', 'Nepoznata lokacija', 'Bio na pop-up žurci — moralo se biti tu', '📡'),
  S('zanrovski-prelaz', 'Žanrovski prelaz', 'Tri različite vrste mesta', '🧭'),
  S('nedeljna-sluzba', 'Nedeljna služba', 'Nedelja u toku dana — institucija', '🕯'),
];
const DEF = Object.fromEntries(STAMP_DEFS.map((d) => [d.id, d]));

const mk = (id: string, at: Date, where: string): Stamp => ({ ...DEF[id], earnedAt: at.toISOString(), where });

/** Pure: iz sirovih check-inova → noći + zarađeni pečati + ghost + taste line. */
export const buildPassport = (rows: { at: Date; name: string; type: string; neighborhood: string | null }[]) => {
  type Raw = { at: Date; name: string; type: string; neighborhood: string | null };
  const sorted = [...rows].sort((a, b) => a.at.getTime() - b.at.getTime());
  const byNight = new Map<string, Raw[]>();
  sorted.forEach((r) => {
    const k = nightKey(r.at);
    if (!byNight.has(k)) byNight.set(k, []);
    byNight.get(k)!.push(r);
  });
  const nights = [...byNight.entries()].map(([key, raw]) => ({
    key, raw,
    night: { key, visits: raw.map((r) => ({ name: r.name, type: r.type, neighborhood: r.neighborhood, at: r.at.toISOString() })), stamps: [] as Stamp[] } as Night,
  }));

  const earned = new Map<string, Stamp>();
  const press = (night: Night, stamp: Stamp) => {
    if (earned.has(stamp.id)) return;
    earned.set(stamp.id, stamp);
    night.stamps.push(stamp);
  };


  const venueCount = new Map<string, number>();
  const distinctVenues = new Set<string>();
  const distinctTypes = new Set<string>();
  const weekNights = new Map<string, Set<number>>(); // ISO-week → set of day indexes

  nights.forEach(({ key, raw, night: n }) => {
    const names = new Set(raw.map((v) => v.name));
    if (!earned.has('prvo-mastilo')) press(n, mk('prvo-mastilo', raw[0].at, raw[0].name));
    if (names.size >= 3) press(n, mk('triptih', raw[2].at, [...names].slice(0, 3).join(' → ')));
    raw.forEach((v) => {
      const h = v.at.getHours();
      if (h >= 4 && h < 9) press(n, mk('zora', v.at, v.name));
      if ((v.type === 'splav' || v.type === 'river') && !earned.has('recno-krstenje')) press(n, mk('recno-krstenje', v.at, v.name));
      if (v.type === 'popup' && !earned.has('nepoznata-lokacija')) press(n, mk('nepoznata-lokacija', v.at, v.name));
      if (v.at.getDay() === 0 && h >= 11 && h < 20) press(n, mk('nedeljna-sluzba', v.at, v.name));
      venueCount.set(v.name, (venueCount.get(v.name) || 0) + 1);
      if (venueCount.get(v.name) === 4 && !earned.has('domaci-teren')) press(n, mk('domaci-teren', v.at, v.name));
      distinctVenues.add(v.name);
      if (distinctVenues.size === 5 && !earned.has('kartograf')) press(n, mk('kartograf', v.at, v.name));
      distinctTypes.add(v.type);
      if (distinctTypes.size === 3 && !earned.has('zanrovski-prelaz')) press(n, mk('zanrovski-prelaz', v.at, v.name));
    });
    // Dubl: noć-datum (key) petak(5) + subota(6) u istoj ISO nedelji
    const nd = new Date(key + 'T12:00:00');
    const day = nd.getDay();
    const monday = new Date(nd); monday.setDate(nd.getDate() - ((day + 6) % 7));
    const wk = monday.toISOString().slice(0, 10);
    if (!weekNights.has(wk)) weekNights.set(wk, new Set());
    weekNights.get(wk)!.add(day);
    if (day === 5 || day === 6) {
      const s = weekNights.get(wk)!;
      if (s.has(5) && s.has(6) && !earned.has('dubl')) press(n, mk('dubl', raw[0].at, 'vikend'));
    }
  });
  const nightList: Night[] = nights.map((x) => x.night);

  // Ghost (§8): max JEDAN, tek kad ponašanje kaže da si blizu, bez progresa.
  let ghost: { name: string; desc: string; emoji: string } | null = null;
  if (nightList.length >= 3 && !earned.has('zora')) ghost = { name: 'Zora', desc: 'Dočekaj izlazak sunca', emoji: '🌅' };
  else if (!earned.has('triptih') && nightList.some((n) => new Set(n.visits.map((v) => v.name)).size === 2)) ghost = { name: 'Triptih', desc: 'Tri mesta u jednoj noći', emoji: '🎞' };

  // Taste line (§9): proza, nikad brojke; tek od 3. noći.
  let taste: string | null = null;
  if (nightList.length >= 3) {
    const hoods = new Map<string, number>();
    rows.forEach((r) => r.neighborhood && hoods.set(r.neighborhood, (hoods.get(r.neighborhood) || 0) + 1));
    const topHood = [...hoods.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const parts = [] as string[];
    if (topHood) parts.push(`Uglavnom ${topHood}.`);
    if (earned.has('zora')) parts.push('Ostaje do zore.');
    taste = parts.join(' ') || null;
  }

  return { nights: nightList.reverse(), stamps: [...earned.values()], ghost, taste };
};

export const usePassport = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['passport', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.from('venue_checkins')
        .select('created_at, venues(name, type, neighborhood)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows = (data || [])
        .filter((r: any) => r.venues)
        .map((r: any) => ({ at: new Date(r.created_at), name: r.venues.name, type: r.venues.type || 'club', neighborhood: r.venues.neighborhood || null }));
      return buildPassport(rows);
    },
  });
};
