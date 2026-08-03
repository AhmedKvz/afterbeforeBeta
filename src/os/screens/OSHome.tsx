import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVenueDirectory, useHeatVenues } from '@/hooks/useHeatVenues';
import { useQuests } from '@/hooks/useQuests';
import { RoadmapRail } from '../OSRoadmaps';
import { ConvergenceRail, CityCipherCard } from '../OSGamification';
import { OSExplore } from './OSExplore';
import { OSQuests } from './OSQuests';
import { OSStories } from '../OSStories';
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
  const [view, setView] = useState<'lista' | 'karta' | 'misije'>('lista');
  useEffect(() => {
    const go = (e: any) => { const v = e?.detail; if (v === 'lista' || v === 'karta' || v === 'misije') setView(v); };
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
      {/* header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'oklch(0.135 0.012 285 / 0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${AB.line}`, padding: '11px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Mono fontSize={10} letterSpacing=".24em" color={AB.ink3}>GRAD · {cityLive} NAPOLJU</Mono>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: AB.ink, lineHeight: 1, marginTop: 2 }}>AfterBefore</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/notifications')} aria-label="Notifikacije" style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${OS.line2}`, cursor: 'pointer', background: OS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: OS.ink3 }}><Bell className="w-4 h-4" /></button>
            <button onClick={goProfile} aria-label="Profil" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', background: CONIC, padding: 0 }} />
          </div>
        </div>
      </div>

      {/* HERO — živi broj grada (IA v2 §11.1: prvi utisak, pošten i kad je nula) */}
      <div style={{ padding: '26px 18px 0', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 'clamp(56px,17vw,72px)', lineHeight: 1, letterSpacing: '-.04em', color: cityLive > 0 ? AB.acid : AB.ink, textShadow: cityLive > 0 ? '0 0 40px oklch(0.88 0.19 158 / 0.35)' : 'none' }}>{cityLive}</div>
        <Mono fontSize={11} fontWeight={600} letterSpacing=".14em" color={AB.ink2} style={{ marginTop: 8 }}>{cityLive > 0 ? 'NAPOLJU U BEOGRADU' : 'GRAD SE SPREMA'}</Mono>
        <Mono fontSize={10.5} color={AB.ink3} style={{ marginTop: 4 }}>{DOW} · {clock}</Mono>
      </div>

      {/* Lista | Karta | Misije — jedan grad, tri prikaza */}
      <div style={{ display: 'flex', gap: 8, padding: '18px 18px 0', justifyContent: 'center' }}>
        {([['lista', 'Lista'], ['karta', 'Karta'], ['misije', 'Misije']] as const).map(([k, l]) => {
          const on = view === k;
          return <button key={k} onClick={() => setView(k)} className="os-press" style={{ minWidth: 96, padding: '10px 0', borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer', border: `1px solid ${on ? AB.uv : AB.line}`, background: on ? 'oklch(0.62 0.25 300 / 0.16)' : AB.surface, color: on ? AB.ink : AB.ink3 }}>{l}</button>;
        })}
      </div>

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
      {/* best party — cinematic lead (kanon §6.1: full-bleed, title na slici,
          jedini acid momenat na ekranu = VEČERAS badge) */}
      {best && (
        <div style={{ padding: '18px 18px 0', ...reveal(0) }}>
          <button onClick={() => openEvent(best)} className="os-press" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, border: 0, background: 'transparent', borderRadius: 22, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 208, borderRadius: 22, overflow: 'hidden', border: `1px solid ${AB.line2}`, background: best.image_url ? `center/cover url(${best.image_url})` : stripe(genreCol(best.music_genres?.[0] || best.venue_type)) }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.135 0.012 285) 6%, oklch(0.135 0.012 285 / 0.25) 45%, transparent 72%)' }} />
              {best.date === todayStr
                ? <span style={{ position: 'absolute', top: 12, left: 14, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.12em', background: AB.acid, color: AB.acidInk, borderRadius: 999, padding: '5px 11px' }}>VEČERAS{(signals[best.id] || 0) > 0 ? ` · ${signals[best.id]} IDE` : ''}</span>
                : <Mono style={{ position: 'absolute', top: 12, left: 14 }} fontSize={10} fontWeight={600} letterSpacing=".14em" color={AB.ink2}>★ IZDVOJENO OVE NEDELJE</Mono>}
              <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
                <Mono fontSize={10} fontWeight={600} letterSpacing=".12em" color={genreCol(best.music_genres?.[0] || best.venue_type)}>{((best.music_genres?.[0] || best.venue_type || 'NOĆ')).toUpperCase()}</Mono>
                <div style={{ fontWeight: 800, fontSize: 24, lineHeight: '28px', letterSpacing: '-.02em', color: AB.ink, marginTop: 4 }}>{best.title}</div>
                <Mono fontSize={11} color={AB.ink2} style={{ marginTop: 6 }}>{dayLabel(best.date)} · {best.start_time?.slice(0, 5)} · {best.venue_name}</Mono>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* trending */}
      {trending.length > 0 && (
        <div style={{ padding: '22px 0 0' }}>
          <div style={{ padding: '0 18px' }}><SectionLabel right={liveNow > 0 ? `${liveNow} LIVE` : 'PO NAJAVAMA'}>TRENDING VEČERAS</SectionLabel></div>
          <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px' }}>
            {trending.map((t, i) => {
              const col = genreCol(t.music_genres?.[0] || t.venue_type);
              return (
                <button key={t.id} onClick={() => openEvent(t)} className="os-press" style={{ minWidth: 230, maxWidth: 230, flex: 'none', borderRadius: 16, overflow: 'hidden', border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${col}`, background: AB.surface, textAlign: 'left', cursor: 'pointer', padding: 0, ...reveal(i) }}>
                  <div style={{ position: 'relative', height: 108, background: t.image_url ? `center/cover url(${t.image_url})` : stripe(col) }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.135 0.012 285 / 0.85), transparent 70%)' }} />
                    <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999, fontFamily: MONO, fontSize: 10, color: col, background: 'rgba(11,11,13,.66)', border: `1px solid ${hexA(col, 0.4)}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />{signals[t.id] || 0} IDE
                    </div>
                  </div>
                  <div style={{ padding: 12 }}><div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: AB.ink }}>{t.title}</div><Mono fontSize={10} color={AB.ink3} style={{ marginTop: 3 }}>{(t.venue_name || '').toUpperCase()}</Mono></div>
                </button>
              );
            })}
          </div>
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

      {/* stories — ispod liste: sadržaj scene, ne prvi utisak (trim 2026-07-21) */}
      <OSStories />

      {/* gamifikacija v2 — telo je kontroler: dođi i uzmi / sastavi šifru */}
      <ConvergenceRail />
      <CityCipherCard />

      {/* rute scene — Home distribuira odobrene roadmape (QUEST §6) */}
      <RoadmapRail />

      {/* quest nedelje — jedna kartica (pun hub je u JA) */}
      {weekQuest && (
        <div style={{ padding: '22px 18px 0' }}>
          <button onClick={() => setView('misije')} className="os-press" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.uvDim}` }}>
            <Mono fontSize={10} fontWeight={600} letterSpacing=".14em" color={AB.uv}>QUEST NEDELJE</Mono>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', color: AB.ink, marginTop: 5 }}>{weekQuest.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'oklch(1 0 0 / 0.07)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((weekQuest.progress / Math.max(weekQuest.target_count, 1)) * 100))}%`, borderRadius: 999, background: AB.acidDim }} />
              </div>
              <Mono fontSize={11} color={AB.ink3}>{weekQuest.progress}/{weekQuest.target_count}</Mono>
              <Mono fontSize={11} fontWeight={600} color={AB.ink2}>+{weekQuest.xp_reward}</Mono>
            </div>
          </button>
        </div>
      )}

      {/* GRAD trim 2026-07-21: OTKRIJ MESTA duplira Kartu (44 mesta su prikaz),
          OCENILA živi na venue stranama. */}
      <KrajBlok onSwitch={() => setView('karta')} to="karta" />
      </div>)}
    </div>
  );
};
