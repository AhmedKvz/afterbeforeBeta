import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVenueDirectory } from '@/hooks/useHeatVenues';
import { OSLucky100Modal } from '../OSLucky100Modal';
import { RoadmapRail } from '../OSRoadmaps';
import { OSStories } from '../OSStories';
import { OSEventRow } from '../OSEventRow';
import { AB, OS, G, hexA, MONO, stripe, genreCol, CONIC } from '../osTheme';
import { lifecycleKey } from '@/lib/nightState';
import type { OSVenue } from '../OSVenueSheet';

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  club: { emoji: '🎵', label: 'CLUB' }, splav: { emoji: '🚢', label: 'SPLAV' }, cafe: { emoji: '☕', label: 'CAFE' },
  cafe_bar: { emoji: '☕', label: 'CAFE' }, bar: { emoji: '🍸', label: 'BAR' }, restaurant: { emoji: '🍽', label: 'EATS' },
  afterplace: { emoji: '🍔', label: 'AFTER' }, gallery: { emoji: '🎨', label: 'ART' },
};

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

const LIVE_RED = '#ff3b46';

export const OSHome = ({ onOpenVenue, goProfile }: { onOpenVenue: (v: OSVenue) => void; goProfile: () => void }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [lens, setLens] = useState<'foryou' | 'all'>('foryou');
  const [dateF, setDateF] = useState<'SVE' | 'VEČERAS' | 'VIKEND'>('SVE');
  const [genreF, setGenreF] = useState<string | null>(null);
  const [lucky, setLucky] = useState(false);

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
            <Mono fontSize={10} letterSpacing=".24em" color={AB.ink3}>NIGHTLIFE OS</Mono>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: AB.ink, lineHeight: 1, marginTop: 2 }}>AfterBefore</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/notifications')} aria-label="Notifikacije" style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${OS.line2}`, cursor: 'pointer', background: OS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: OS.ink3 }}><Bell className="w-4 h-4" /></button>
            <button onClick={goProfile} aria-label="Profil" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', background: CONIC, padding: 0 }} />
          </div>
        </div>
      </div>

      {/* lens tabs */}
      <div style={{ display: 'flex', gap: 24, padding: '0 18px', borderBottom: `1px solid ${OS.line}` }}>
        {([['foryou', 'Za tebe'], ['all', 'Sve']] as const).map(([k, l]) => {
          const on = lens === k;
          return <button key={k} onClick={() => setLens(k)} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: '12px 0', fontSize: 14, fontWeight: on ? 700 : 500, color: on ? AB.ink : AB.ink3, borderBottom: `2px solid ${on ? AB.ink : 'transparent'}` }}>{l}</button>;
        })}
      </div>

      {lens === 'foryou' && (<div key="foryou" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
      {/* stories */}
      <OSStories />

      {/* live line */}
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: AB.hot, animation: 'os-pulse 1.8s ease-in-out infinite' }} />
          <Mono fontSize={11} color={AB.ink2}>BEOGRAD · {upcoming.length} NAJAVLJENO</Mono>
        </div>
        <Mono fontSize={11} color={AB.ink3}>VEČERAS {tonightCount} ↗</Mono>
      </div>

      {/* AI strip */}
      <div style={{ margin: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}` }}>
        <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 8, background: hexA(G.community, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, color: G.community }}>⚡</span>
        <span style={{ fontSize: 13, lineHeight: 1.4, color: AB.ink2 }}>{tonightCount > 0 ? `Večeras ${tonightCount} ${tonightCount === 1 ? 'događaj' : tonightCount < 5 ? 'događaja' : 'događaja'} — grad se budi.` : 'Mirno veče — vikend se sprema. Pogledaj šta dolazi.'}</span>
      </div>

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

      {/* za tebe — curated slice (state chips, no type filters) */}
      <div style={{ padding: '22px 18px 0' }}>
        {tonightCount > 0 ? <SectionLabel right={`${forYou.length}`}>ZA TEBE VEČERAS</SectionLabel> : <SectionLabel right={`${forYou.length}`}>IZ ARHIVE SCENE · DOK SE GRAD NE UPALI</SectionLabel>}
        <div>
          {forYou.map((e, i) => <div key={e.id} style={reveal(i)}><OSEventRow e={e} state={stateOf(e)} onClick={() => openEvent(e)} /></div>)}
          {forYou.length === 0 && <Mono fontSize={12} color={AB.ink3} style={{ textAlign: 'center', padding: '24px 0' }}>Još nema događaja.</Mono>}
        </div>
      </div>

      {/* rute scene — Home distribuira odobrene roadmape (QUEST §6) */}
      <RoadmapRail />

      {/* discover places + community reviewed */}
      <OSDiscover navigate={navigate} />
      <OSCommunity navigate={navigate} />

      {/* lucky100 — moved below the lead content */}
      <div style={{ padding: '24px 18px 0' }}>
        <button onClick={() => setLucky(true)} className="os-press" style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', overflow: 'hidden', borderRadius: 16 }}>
        <div style={{ overflow: 'hidden', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${AB.uv}` }}>
          <div style={{ padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div><Mono fontSize={10} fontWeight={600} letterSpacing=".14em" color={AB.ink3}>SISTEM · INSTANT WIN</Mono><div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', color: AB.ink, marginTop: 3 }}>Lucky 100</div></div>
              <Mono fontSize={11} color={AB.uv}>Otvori →</Mono>
            </div>
            <div style={{ fontSize: 13, color: AB.ink2, margin: '10px 0 0' }}>Svaki 100. check-in nosi nagradu — vidi svoj broj unutra.</div>
          </div>
        </div>
        </button>
      </div>
      </div>)}

      {lens === 'all' && (
        <div key="all" style={{ padding: '14px 18px 0', animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
          {/* date pills — aktivan filter = acid (kanon §6.1 filter rail) */}
          <div className="os-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
            {(['SVE', 'VEČERAS', 'VIKEND'] as const).map((dF) => {
              const on = dateF === dF;
              return <button key={dF} onClick={() => setDateF(dF)} className="os-press" style={{ flex: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 999, fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em', border: `1px solid ${on ? 'transparent' : AB.line}`, background: on ? AB.acid : AB.surface, color: on ? AB.acidInk : AB.ink3 }}>{dF}</button>;
            })}
          </div>
          {/* genre chips */}
          {genres.length > 0 && (
            <div className="os-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 12 }}>
              <button onClick={() => setGenreF(null)} style={gChip(!genreF)}>SVI</button>
              {genres.map((g) => <button key={g} onClick={() => setGenreF(g)} style={gChip(genreF === g)}>{g.toUpperCase()}</button>)}
            </div>
          )}
          <SectionLabel right={`${catalog.length} DOGAĐAJA`}>SVE</SectionLabel>
          <div>
            {catalog.map((e, i) => <div key={e.id} style={reveal(Math.min(i, 8))}><OSEventRow e={e} state={stateOf(e)} onClick={() => openEvent(e)} /></div>)}
            {catalog.length === 0 && <Mono fontSize={12} color={AB.ink3} style={{ textAlign: 'center', padding: '24px 0' }}>Nema događaja za ovaj filter.</Mono>}
          </div>
        </div>
      )}

      <OSLucky100Modal isOpen={lucky} onClose={() => setLucky(false)} />
    </div>
  );
};

/* ── Discover places (venue cards) ── */
const OSDiscover = ({ navigate }: { navigate: (p: string) => void }) => {
  // Imenik (44 mesta) umesto club-naloga: partneri uvek prvi, ostatak se
  // ROTIRA dnevno (seed = dan) — rail je svaki dan drugačiji, ceo imenik
  // vremenom prodefiluje kroz Home.
  const { data: venues = [] } = useQuery({
    queryKey: ['os-discover', new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const { data } = await supabase.from('venues')
        .select('name, type, emoji, neighborhood, is_partner');
      const all = (data || []).map((v: any) => ({ venue_name: v.name, venue_type: v.type, venue_logo_url: null, neighborhood: v.neighborhood, emoji: v.emoji, is_partner: v.is_partner }));
      const partners = all.filter((v: any) => v.is_partner);
      const rest = all.filter((v: any) => !v.is_partner);
      // deterministički dnevni shuffle (bez Math.random — stabilno unutar dana)
      const day = Math.floor(Date.now() / 86400000);
      const keyed = rest.map((v: any, i: number) => ({ v, k: ((i + 1) * 2654435761 + day * 97) % 1000 })).sort((a: any, b: any) => a.k - b.k);
      return [...partners, ...keyed.map((x: any) => x.v)].slice(0, 12);
    },
  });
  if (!venues.length) return null;
  return (
    <div style={{ padding: '24px 0 0' }}>
      <div style={{ padding: '0 18px' }}><SectionLabel right={`${venues.length} MESTA`}>OTKRIJ MESTA</SectionLabel></div>
      <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px' }}>
        {venues.map((v: any) => {
          const meta = TYPE_META[v.venue_type || 'club'] || TYPE_META.club;
          const col = genreCol(v.venue_type);
          return (
            <button key={v.venue_name} onClick={() => navigate(`/venue/${encodeURIComponent(v.venue_name)}`)} className="os-press" style={{ minWidth: 160, maxWidth: 160, flex: 'none', borderRadius: 16, overflow: 'hidden', border: `1px solid ${AB.line2}`, background: AB.surface, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
              <div style={{ position: 'relative', height: 82, background: stripe(col), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{v.emoji || meta.emoji}
                {v.is_partner && <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: MONO, fontSize: 9, color: G.house }}>★</div>}
                <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: MONO, fontSize: 10, color: col, background: 'rgba(11,11,13,.66)', border: `1px solid ${hexA(col, 0.4)}`, padding: '2px 7px', borderRadius: 999 }}>{meta.label}</div>
              </div>
              <div style={{ padding: 11 }}><div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-.01em', color: AB.ink }}>{v.venue_name}</div>{v.neighborhood && <Mono fontSize={10} color={AB.ink3} style={{ marginTop: 3 }}>{v.neighborhood.toUpperCase()}</Mono>}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Community reviewed ── */
const OSCommunity = ({ navigate }: { navigate: (p: string) => void }) => {
  const { data: reviews = [] } = useQuery({
    queryKey: ['os-community-reviewed'],
    queryFn: async () => {
      const { data } = await supabase.from('event_reviews').select('id, venue_name, rating, review_text, verified_visit').neq('moderation_status', 'flagged').not('venue_name', 'is', null).order('helpful_count', { ascending: false }).limit(6);
      return data || [];
    },
  });
  if (!reviews.length) return null;
  return (
    <div style={{ padding: '24px 0 0' }}>
      <div style={{ padding: '0 18px' }}><SectionLabel>OCENILA ZAJEDNICA</SectionLabel></div>
      <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px' }}>
        {reviews.map((r: any) => (
          <button key={r.id} onClick={() => r.venue_name && navigate(`/venue/${encodeURIComponent(r.venue_name)}#reviews`)} className="os-press" style={{ minWidth: 240, maxWidth: 240, flex: 'none', borderRadius: 16, border: `1px solid ${AB.line2}`, background: AB.surface, padding: 13, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{r.venue_name}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: G.house }}>★ {r.rating}</span>
            </div>
            {r.review_text && <div style={{ fontSize: 12.5, fontStyle: 'italic', color: AB.ink2, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{r.review_text}"</div>}
            {r.verified_visit && <span style={{ display: 'inline-block', marginTop: 8, fontFamily: MONO, fontSize: 10, color: G.festival, background: hexA(G.festival, 0.12), padding: '2px 7px', borderRadius: 999 }}>✓ POSEĆENO</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
