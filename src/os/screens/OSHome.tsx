import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVenueDirectory, useHeatVenues } from '@/hooks/useHeatVenues';
import { useQuests } from '@/hooks/useQuests';
import { track } from '@/lib/analytics';
import { OSExplore } from './OSExplore';
import { OSQuests } from './OSQuests';
import { OSMeet } from '../OSMeet';
import { OSScena } from '../OSScena';
import { OSArtistSheet } from '../OSArtistSheet';
import type { Artist } from '@/hooks/useArtists';
import { OSEventRow } from '../OSEventRow';
import { AB, OS, G, hexA, MONO, stripe, genreCol, CONIC } from '../osTheme';
import { lifecycleKey } from '@/lib/nightState';
import type { OSVenue } from '../OSVenueSheet';

interface Ev {
  id: string; title: string; date: string; start_time: string; venue_name: string;
  image_url: string; music_genres: string[]; venue_type: string; event_type: string;
}

const dayLabel = (d: string) => { try { return ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'][new Date(d).getDay()]; } catch { return ''; } };

const Mono = ({ children, style, ...s }: any) => <div style={{ fontFamily: MONO, ...s, ...(style || {}) }}>{children}</div>;
// Kanon "label" — eyebrow vezivno tkivo (mono 11, +0.12em, ink-3).
const SectionLabel = ({ children, right }: { children: string; right?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 }}>{children}</span>
    {right && <span style={{ fontFamily: MONO, fontSize: 11, color: AB.ink3 }}>{right}</span>}
  </div>
);
const reveal = (i: number) => ({ animation: `ab-reveal .22s cubic-bezier(.16,1,.3,1) ${i * 40}ms both` });

/** Feed IMA dno (IA v2 §11.1 — anti-scroll je ustavno pravilo). */
const KrajBlok = ({ onSwitch, to }: { onSwitch: () => void; to: 'lista' | 'karta' }) => (
  <div style={{ padding: '34px 18px 8px', textAlign: 'center' }}>
    <Mono fontSize={11} fontWeight={600} letterSpacing=".16em" color={AB.ink3}>— KRAJ —</Mono>
    <div style={{ fontSize: 13.5, color: AB.ink2, marginTop: 8 }}>Ostalo se dešava napolju.</div>
    <button onClick={onSwitch} className="os-press" style={{ marginTop: 14, minHeight: 44, padding: '11px 22px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${AB.line2}`, background: 'transparent', color: AB.ink2, fontSize: 13.5, fontWeight: 600 }}>
      {to === 'karta' ? 'Otvori kartu' : 'Nazad na listu'}
    </button>
  </div>
);

const LIVE_RED = '#ff3b46';

export const OSHome = ({ onOpenVenue, goProfile }: { onOpenVenue: (v: OSVenue) => void; goProfile: () => void }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [dateF, setDateF] = useState<'SVE' | 'VEČERAS' | 'VIKEND'>('SVE');
  const [genreF, setGenreF] = useState<string | null>(null);
  // IA v2 §11.1 + Pasoš odluka: jedan ekran, tri prikaza — Lista | Karta | Misije.
  // Misije žive PORED akcije (GRAD), ne u identitetu (PREDLOG-JA-PASOS §5).
  const [view, setView] = useState<'lista' | 'karta' | 'misije' | 'ljudi' | 'scena'>('lista');
  const [artist, setArtist] = useState<Artist | null>(null);
  // Analitika prikaza: jednom po prelasku, da se vidi koji deo GRAD-a ljudi zaista otvore.
  useEffect(() => {
    if (view === 'misije') track('mission_viewed', { source: 'grad' });
    if (view === 'ljudi') track('crew_viewed', { source: 'grad' });
    if (view === 'scena') track('scene_viewed', { source: 'grad' });
  }, [view]);
  useEffect(() => {
    const go = (e: any) => { const v = e?.detail; if (v === 'lista' || v === 'karta' || v === 'misije' || v === 'ljudi' || v === 'scena') setView(v); };
    window.addEventListener('ab-grad-view', go);
    return () => window.removeEventListener('ab-grad-view', go);
  }, []);
  const { data: heatVenues = [] } = useHeatVenues();
  const { quests = [] } = useQuests() as any;
  // Živi broj grada — pošten i kad je nula (hero, jedini acid momenat).
  const cityLive = heatVenues.reduce((s: number, v: any) => s + (v.here ?? 0), 0);
  const hotNow = [...heatVenues].sort((a: any, b: any) => ((b.here ?? 0) - (a.here ?? 0)) || ((b.heat ?? 0) - (a.heat ?? 0))).slice(0, 3);
  const weekQuest = quests.find((q: any) => !q.xp_claimed) || null;
  const now = new Date();
  const DOW = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'][now.getDay()];
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const { data: events = [] } = useQuery<Ev[]>({
    queryKey: ['os-events'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('id, title, date, start_time, venue_name, image_url, music_genres, venue_type, event_type').order('date', { ascending: true });
      return (data as any) || [];
    },
  });
  const { data: signals = {} } = useQuery<Record<string, number>>({
    queryKey: ['os-signals', events.length],
    enabled: events.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('event_signals').select('event_id').in('event_id', events.map((e) => e.id));
      const c: Record<string, number> = {};
      (data || []).forEach((s: any) => { c[s.event_id] = (c[s.event_id] || 0) + 1; });
      return c;
    },
  });

  // Event kartica → PUN sheet: venue se razrešava iz imenika po imenu, pa
  // check-in/prisustvo/iskra rade i sa Home-a (ne samo sa Heat pina).
  const { data: dir } = useVenueDirectory();
  const openEvent = (e: Ev) => {
    const v = (dir?.venues || []).find((x: any) => (x.name || '').toLowerCase() === (e.venue_name || '').toLowerCase());
    onOpenVenue({
      name: e.venue_name || e.title, genre: (e.music_genres?.[0] || e.venue_type || 'VENUE').toUpperCase(),
      col: genreCol(e.music_genres?.[0] || e.venue_type), venueId: v?.id ?? null, presenceId: v?.name ?? null, eventId: e.id,
      lat: v?.latitude != null ? Number(v.latitude) : null, lng: v?.longitude != null ? Number(v.longitude) : null,
      radius: v ? (dir?.radius?.[v.name] ?? 100) : undefined,
      neighborhood: (v?.neighborhood || e.venue_type || '').toUpperCase(),
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tonightCount = events.filter((e) => e.date === todayStr && e.venue_type !== 'afterplace').length;

  // Lifecycle state from time + going-count (night-aware: survives midnight roll).
  const stateOf = (e: Ev): { label: string; color: string } | null => {
    if ((e.date || '') < todayStr) return null; // prošli eventi ne "najavljuju" ništa
    const going = signals[e.id] || 0;
    const k = lifecycleKey(e, going, new Date());
    if (k === 'live') return { label: 'LIVE SADA', color: LIVE_RED };
    if (k === 'gathering') return { label: `SKUPLJA SE · ${going} IDE`, color: G.house };
    if (going > 0) return { label: `${going} IDE`, color: G.techno };
    return { label: 'NAJAVLJEN', color: OS.ink6 };
  };

  // Truth pass: trending/hero pokazuju samo nadolazeće — prošli eventi ne mogu
  // biti "večeras" (kritika: 3 kontradiktorna broja na jednom ekranu).
  const upcoming = events.filter((e) => e.date >= todayStr && e.venue_type !== 'afterplace');
  const trending = [...upcoming].sort((a, b) => (signals[b.id] || 0) - (signals[a.id] || 0)).slice(0, 3);
  const best = trending[0];
  const liveNow = trending.filter((t) => lifecycleKey(t, signals[t.id] || 0, new Date()) === 'live').length;

  // "Za tebe" curated slice — tonight first, ranked by going-count + stated
  // preferences from onboarding (genres + fav venues). Stated → learned later.
  const prefGenres = ((profile as any)?.music_preferences || []).map((g: string) => g.toLowerCase());
  const favVenues = new Set((((profile as any)?.fav_venues || []) as string[]).map((v) => v.toLowerCase()));
  const forYou = useMemo(() => {
    const base = events.filter((e) => e.venue_type !== 'afterplace');
    const tonight = base.filter((e) => e.date === todayStr);
    const pool = tonight.length ? tonight : base;
    const score = (e: Ev) => {
      let sc = (signals[e.id] || 0) * 2;
      if (e.venue_name && favVenues.has(e.venue_name.toLowerCase())) sc += 3;
      sc += (e.music_genres || []).filter((g) => prefGenres.some((p: string) => g.toLowerCase().includes(p) || p.includes(g.toLowerCase()))).length;
      return sc;
    };
    return [...pool].sort((a, b) => score(b) - score(a)).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, signals, todayStr, profile]);

  // "Sve" full catalog — date + genre filters.
  const genres = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => (e.music_genres || []).forEach((g) => g && s.add(g)));
    return Array.from(s).slice(0, 8);
  }, [events]);
  const catalog = useMemo(() => events.filter((e) => {
    if (e.venue_type === 'afterplace') return false;
    if (dateF === 'VEČERAS' && e.date !== todayStr) return false;
    if (dateF === 'VIKEND') { const d = new Date(e.date).getDay(); if (!(d === 5 || d === 6 || d === 0)) return false; }
    if (genreF && !(e.music_genres || []).includes(genreF)) return false;
    return true;
  }), [events, dateF, genreF, todayStr]);

  const gChip = (on: boolean) => ({ flex: 'none' as const, cursor: 'pointer', padding: '7px 12px', borderRadius: 999, fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', whiteSpace: 'nowrap' as const, border: `1px solid ${on ? 'transparent' : AB.line}`, background: on ? AB.raised : 'transparent', color: on ? AB.ink : AB.ink3 });

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', background: AB.void, paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: 150 }}>
      {/* header — kompaktan (redesign §6): wordmark + živi kontekst */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,5,6,.86)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${AB.line}`, padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '.14em', color: AB.ink, lineHeight: 1 }}>AFTERBEFORE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <Mono fontSize={10} letterSpacing=".1em" color={AB.ink3}>BEOGRAD · {DOW} {String(now.getDate()).padStart(2, '0')}.{String(now.getMonth() + 1).padStart(2, '0')}.</Mono>
              {cityLive > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: AB.acid }} />
                  <Mono fontSize={10} letterSpacing=".1em" color={AB.acid}>LIVE</Mono>
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/notifications')} aria-label="Notifikacije" className="os-press" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${AB.line}`, cursor: 'pointer', background: AB.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AB.ink3 }}><Bell className="w-4 h-4" /></button>
            <button onClick={goProfile} aria-label="Profil" className="os-press" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${AB.line2}`, cursor: 'pointer', padding: 0, overflow: 'hidden', background: (profile as any)?.avatar_url ? `center/cover url(${(profile as any).avatar_url})` : AB.raised2 }}>
              {!(profile as any)?.avatar_url && <span style={{ fontFamily: MONO, fontSize: 12, color: AB.ink2 }}>{(profile?.display_name || '?').charAt(0).toUpperCase()}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* HERO — gradski signal (redesign §7): bez neon blooma, bez velike nule */}
      <div style={{ padding: '24px 18px 0', textAlign: 'center' }}>
        {cityLive > 0 ? (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 'clamp(72px,22vw,92px)', lineHeight: 0.95, letterSpacing: '-.05em', color: AB.ink }}>{cityLive}</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: AB.acid, marginTop: 14, animation: 'os-pulse 3s ease-in-out infinite' }} />
            </div>
            <Mono fontSize={11} fontWeight={600} letterSpacing=".16em" color={AB.ink3} style={{ marginTop: 10 }}>NAPOLJU U BEOGRADU</Mono>
          </>
        ) : (tonightCount > 0 || upcoming.length > 0) ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 'clamp(72px,22vw,92px)', lineHeight: 0.95, letterSpacing: '-.05em', color: AB.ink }}>{tonightCount > 0 ? tonightCount : upcoming.length}</div>
            <Mono fontSize={11} fontWeight={600} letterSpacing=".16em" color={AB.ink3} style={{ marginTop: 10 }}>{tonightCount > 0 ? 'DOGAĐAJA VEČERAS' : 'NAJAVLJENIH DOGAĐAJA'}</Mono>
            <div style={{ fontSize: 14, color: AB.ink2, marginTop: 6 }}>Grad se sprema.</div>
          </>
        ) : (
          /* §7: nikad džinovska nula — kad nema ni najava, samo poštena rečenica */
          <div style={{ padding: '14px 0 4px' }}>
            <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: '-.03em', color: AB.ink }}>Grad se sprema.</div>
            <div style={{ fontSize: 14, color: AB.ink3, marginTop: 6 }}>Nove najave stižu — pogledaj arhivu scene ispod.</div>
          </div>
        )}
        {cityLive > 0 && tonightCount > 0 && (
          <div style={{ fontSize: 14, color: AB.ink2, marginTop: 8 }}>{tonightCount} {tonightCount === 1 ? 'događaj' : 'događaja'} večeras →</div>
        )}
      </div>

      {/* Underline navigacija (redesign §8) — bez pilula, bez žanr boja */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${AB.line}`, margin: '20px 0 0', padding: '0 6px' }}>
        {([['lista', 'LISTA'], ['karta', 'KARTA'], ['misije', 'MISIJE'], ['ljudi', 'LJUDI'], ['scena', 'SCENA']] as const).map(([k, l]) => {
          const on = view === k;
          return (
            <button key={k} onClick={() => setView(k)} className="os-press" aria-current={on ? 'page' : undefined}
              style={{ flex: 1, minHeight: 44, background: 'transparent', border: 0, cursor: 'pointer', position: 'relative', fontSize: 13, fontWeight: on ? 800 : 600, letterSpacing: '.08em', color: on ? AB.acid : AB.ink3, transition: 'color .18s' }}>
              {l}
              <span style={{ position: 'absolute', left: '18%', right: '18%', bottom: -1, height: 2, background: on ? AB.acid : 'transparent', transition: 'background .18s' }} />
            </button>
          );
        })}
      </div>

      {/* SCENA — umetnici (DJ/tattoo/vizuelni): prati, timetable, radovi.
          Distribucija i sadržaj, NE booking (odluka 2026-08-08). */}
      {view === 'scena' && (
        <div key="scena" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both', paddingTop: 14 }}>
          <OSScena onOpenArtist={setArtist} />
          <KrajBlok onSwitch={() => setView('lista')} to="lista" />
        </div>
      )}

      {/* LJUDI — upoznavanje odvojeno od check-ina (radi cele nedelje) */}
      {view === 'ljudi' && (
        <div key="ljudi" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both', paddingTop: 14 }}>
          <OSMeet />
          <KrajBlok onSwitch={() => setView('lista')} to="lista" />
        </div>
      )}

      {/* MISIJE — pun quest hub pored akcije (PREDLOG-JA-PASOS §5, founder navbar odluka) */}
      {view === 'misije' && (
        <div key="misije" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
          <OSQuests embedded />
          <KrajBlok onSwitch={() => setView('lista')} to="lista" />
        </div>
      )}

      {/* KARTA — mapa + vruće sada (mapa je prikaz, ne zaseban ekran) */}
      {view === 'karta' && (
        <div key="karta" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
          <OSExplore embedded onOpenVenue={onOpenVenue} />
          {hotNow.length > 0 && (
            <div style={{ padding: '20px 18px 0' }}>
              <SectionLabel right="PO PRISUSTVU">VRUĆE SADA</SectionLabel>
              {hotNow.map((v: any, i: number) => (
                <button key={v.id} onClick={() => onOpenVenue({ name: v.name, genre: (v.genreLabel || v.type || 'VENUE').toUpperCase(), col: genreCol(v.genreLabel || v.type), venueId: v.venue_id ?? null, presenceId: v.id ?? null, lat: v.lat ?? null, lng: v.lng ?? null, radius: v.radius, heat: v.heat, here: v.here ?? 0, neighborhood: (v.neighborhood || '').toUpperCase(), hidden: v.hidden, minLevel: v.minLevel, discoveredBy: v.discoveredBy })} className="os-press" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 0', background: 'transparent', border: 0, borderTop: `1px solid ${AB.line}`, cursor: 'pointer', ...reveal(i) }}>
                  <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: AB.raised, border: `1px solid ${AB.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{v.emoji || '📍'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{v.name}</span>
                    <Mono fontSize={10} color={AB.ink3} style={{ marginTop: 3 }}>{(v.neighborhood || 'BEOGRAD').toUpperCase()}</Mono>
                  </span>
                  <Mono fontSize={13} fontWeight={600} color={(v.here ?? 0) > 0 ? AB.acid : AB.ink3}>{(v.here ?? 0) > 0 ? `${v.here} ovde` : 'mirno'}</Mono>
                </button>
              ))}
            </div>
          )}
          <KrajBlok onSwitch={() => setView('lista')} to="lista" />
        </div>
      )}

      {/* GRAD trim 2026-07-21: live linija i AI strip ubijeni — hero broj već
          govori stanje grada; jedan glas, ne tri (§11.1 „jedan broj"). */}
      {view === 'lista' && (<div key="lista" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
      {/* FEATURED EVENT (redesign §9) — editorial: venue najjači, title drugi */}
      {best && (
        <div style={{ padding: '18px 18px 0', ...reveal(0) }}>
          <button onClick={() => openEvent(best)} className="os-press" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, border: 0, background: AB.surface, borderRadius: 18, overflow: 'hidden' }}>
            {/* meta red iznad slike */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px' }}>
              <Mono fontSize={10.5} fontWeight={600} letterSpacing=".1em" color={AB.ink2}>{dayLabel(best.date)} · {best.start_time?.slice(0, 5) || '—'}</Mono>
              {(signals[best.id] || 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: AB.acid }} />
                  <Mono fontSize={10.5} fontWeight={600} letterSpacing=".08em" color={AB.acid}>{signals[best.id]} IDE</Mono>
                </span>
              )}
            </div>
            {/* slika — puna širina, taman gradijent, blagi uv ton */}
            <div style={{ position: 'relative', height: 190, background: best.image_url ? `linear-gradient(180deg, rgba(5,5,6,.08), rgba(5,5,6,.28)), center/cover url(${best.image_url})` : `linear-gradient(155deg, ${AB.uvSoft}, ${AB.raised} 70%)` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050506 2%, rgba(5,5,6,.4) 34%, transparent 62%)' }} />
              <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 26, lineHeight: 1, letterSpacing: '-.03em', color: AB.ink }}>{(best.venue_name || best.title).toUpperCase()}</div>
                {best.venue_name && <div style={{ fontSize: 16, fontWeight: 600, color: AB.ink2, marginTop: 5, letterSpacing: '-.01em' }}>{best.title}</div>}
              </div>
            </div>
            {/* tagovi — max 3, squared */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px 13px', flexWrap: 'wrap' }}>
              {[...(best.music_genres || []).slice(0, 2), best.date === todayStr ? 'VEČERAS' : null].filter(Boolean).slice(0, 3).map((t: any) => (
                <span key={t} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: t === 'VEČERAS' ? AB.acid : AB.ink2, background: t === 'VEČERAS' ? AB.acidSoft : AB.raised, border: `1px solid ${t === 'VEČERAS' ? 'transparent' : AB.line}`, borderRadius: 4, padding: '4px 8px' }}>{String(t).toUpperCase()}</span>
              ))}
            </div>
          </button>
        </div>
      )}

      {/* KOMPAKTNI REDOVI (§10) — sledeća 3 najrelevantnija, cela širina tap */}
      {trending.length > 1 && (
        <div style={{ padding: '10px 18px 0' }}>
          {trending.slice(1, 4).map((t, i) => (
            <button key={t.id} onClick={() => openEvent(t)} className="os-press"
              style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', minHeight: 66, padding: '12px 0', background: 'transparent', border: 0, borderTop: i > 0 ? `1px solid ${AB.line}` : 0, cursor: 'pointer', ...reveal(i + 1) }}>
              <Mono fontSize={12} fontWeight={600} color={AB.ink2} style={{ flex: 'none', width: 44 }}>{t.start_time?.slice(0, 5) || '—'}</Mono>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.venue_name || t.title}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: AB.ink3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.venue_name ? t.title : ''}{t.music_genres?.[0] ? `${t.venue_name ? ' · ' : ''}${t.music_genres[0].toUpperCase()}` : ''}</span>
              </span>
              {(signals[t.id] || 0) > 0 && <Mono fontSize={11} fontWeight={600} color={AB.acid} style={{ flex: 'none' }}>{signals[t.id]} IDE</Mono>}
            </button>
          ))}
        </div>
      )}

      {/* događaji — JEDNA lista: kurirana dok nema filtera, pun katalog čim se filtrira */}
      <div style={{ padding: '22px 18px 0' }}>
        <div className="os-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
          {(['SVE', 'VEČERAS', 'VIKEND'] as const).map((dF) => {
            const on = dateF === dF;
            return <button key={dF} onClick={() => setDateF(dF)} className="os-press" style={{ flex: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 999, fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em', border: `1px solid ${on ? 'transparent' : AB.line}`, background: on ? AB.acid : AB.surface, color: on ? AB.acidInk : AB.ink3 }}>{dF}</button>;
          })}
        </div>
        {genres.length > 0 && (
          <div className="os-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 12 }}>
            <button onClick={() => setGenreF(null)} style={gChip(!genreF)}>SVI</button>
            {genres.map((g) => <button key={g} onClick={() => setGenreF(g)} style={gChip(genreF === g)}>{g.toUpperCase()}</button>)}
          </div>
        )}
        {(() => {
          const filtered = dateF !== 'SVE' || !!genreF;
          const list = filtered ? catalog : forYou;
          const label = filtered ? 'SVE ŠTO SE POKLAPA' : (tonightCount > 0 ? 'ZA TEBE VEČERAS' : 'IZ ARHIVE SCENE · DOK SE GRAD NE UPALI');
          return (<>
            <SectionLabel right={`${list.length}`}>{label}</SectionLabel>
            <div>
              {list.map((e, i) => <div key={e.id} style={reveal(Math.min(i, 8))}><OSEventRow e={e} state={stateOf(e)} onClick={() => openEvent(e)} /></div>)}
              {list.length === 0 && <Mono fontSize={12} color={AB.ink3} style={{ textAlign: 'center', padding: '24px 0' }}>{filtered ? 'Nema događaja za ovaj filter.' : 'Još nema događaja.'}</Mono>}
            </div>
          </>);
        })()}
      </div>

      {/* Redesign 2026-08-03: Stories/Konvergencija/Šifra/Rute NE žive na
          default Listi (ostaju u kodu i u Hubu noći) — MVP fokus. */}
      {/* WEEKLY MISSION (§11) — jedna istaknuta, pravi podaci, klik → Misije */}
      {weekQuest && (
        <div style={{ padding: '24px 18px 0' }}>
          <button onClick={() => setView('misije')} className="os-press" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, borderRadius: 16, background: AB.raised, border: `1px solid ${AB.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Mono fontSize={10} fontWeight={600} letterSpacing=".14em" color={AB.ink3}>WEEKLY MISSION</Mono>
              <Mono fontSize={11} fontWeight={600} color={AB.acid}>+{weekQuest.xp_reward} XP</Mono>
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.015em', color: AB.ink, marginTop: 7 }}>{weekQuest.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Mono fontSize={11} fontWeight={600} color={AB.ink2} style={{ flex: 'none' }}>{weekQuest.progress} / {weekQuest.target_count}</Mono>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((weekQuest.progress / Math.max(weekQuest.target_count, 1)) * 100))}%`, background: AB.acid, transition: 'width .3s' }} />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* GRAD trim 2026-07-21: OTKRIJ MESTA duplira Kartu (44 mesta su prikaz),
          OCENILA živi na venue stranama. */}
      <KrajBlok onSwitch={() => setView('karta')} to="karta" />

      {artist && <OSArtistSheet artist={artist} onClose={() => setArtist(null)} />}
      </div>)}
    </div>
  );
};
