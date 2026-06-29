import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OSLucky100Modal } from '../OSLucky100Modal';
import { OSStories } from '../OSStories';
import { OSEventRow } from '../OSEventRow';
import { OS, G, hexA, MONO, HATCH, stripe, genreCol, CONIC } from '../osTheme';
import type { OSVenue } from '../OSVenueSheet';

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  club: { emoji: '🎵', label: 'CLUB' }, splav: { emoji: '🚢', label: 'SPLAV' }, cafe: { emoji: '☕', label: 'CAFE' },
  cafe_bar: { emoji: '☕', label: 'CAFE' }, bar: { emoji: '🍸', label: 'BAR' }, restaurant: { emoji: '🍽', label: 'EATS' },
  afterplace: { emoji: '🍔', label: 'AFTER' }, gallery: { emoji: '🎨', label: 'ART' },
};

interface Ev {
  id: string; title: string; date: string; start_time: string; venue_name: string;
  image_url: string; music_genres: string[]; venue_type: string; event_type: string; venue_id?: string | null;
}

// Stable pseudo "energy" 60–93 from id (no real energy metric yet).
const energyOf = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 34; return 60 + h; };
const dayLabel = (d: string) => { try { return ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'][new Date(d).getDay()]; } catch { return ''; } };

const Mono = ({ children, style, ...s }: any) => <div style={{ fontFamily: MONO, ...s, ...(style || {}) }}>{children}</div>;
const SectionLabel = ({ children, right }: { children: string; right?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', color: OS.ink6 }}>{children}</span>
    {right && <span style={{ fontFamily: MONO, fontSize: 11, color: OS.ink6 }}>{right}</span>}
  </div>
);

const LIVE_RED = '#ff3b46';

export const OSHome = ({ onOpenVenue, goProfile }: { onOpenVenue: (v: OSVenue) => void; goProfile: () => void }) => {
  const navigate = useNavigate();
  const [lens, setLens] = useState<'foryou' | 'all'>('foryou');
  const [dateF, setDateF] = useState<'SVE' | 'VEČERAS' | 'VIKEND'>('SVE');
  const [genreF, setGenreF] = useState<string | null>(null);
  const [lucky, setLucky] = useState(false);

  const { data: events = [] } = useQuery<Ev[]>({
    queryKey: ['os-events'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
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

  const openEvent = (e: Ev) => onOpenVenue({
    name: e.venue_name || e.title, genre: (e.music_genres?.[0] || e.venue_type || 'VENUE').toUpperCase(),
    col: genreCol(e.music_genres?.[0] || e.venue_type), venueId: e.venue_id ?? null, eventId: e.id,
    heat: energyOf(e.id), neighborhood: (e.venue_type || '').toUpperCase(),
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const tonightCount = events.filter((e) => e.date === todayStr && e.venue_type !== 'afterplace').length;

  // Lifecycle state from time + going-count. LIVE = tonight & started; else SKUPLJA SE / NAJAVLJEN.
  const stateOf = (e: Ev): { label: string; color: string } => {
    const going = signals[e.id] || 0;
    const startMin = e.start_time ? parseInt(e.start_time.slice(0, 2), 10) * 60 + parseInt(e.start_time.slice(3, 5), 10) : null;
    const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
    if (e.date === todayStr && startMin != null && nowMin >= startMin) return { label: 'LIVE SADA', color: LIVE_RED };
    if (going > 0) return { label: `SKUPLJA SE · ${going} IDE`, color: G.house };
    return { label: 'NAJAVLJEN', color: OS.ink6 };
  };

  const trending = [...events].sort((a, b) => (signals[b.id] || 0) - (signals[a.id] || 0)).slice(0, 3);
  const best = trending[0];

  // "Za tebe" curated slice — tonight first, ranked by going-count.
  const forYou = useMemo(() => {
    const base = events.filter((e) => e.venue_type !== 'afterplace');
    const tonight = base.filter((e) => e.date === todayStr);
    const pool = tonight.length ? tonight : base;
    return [...pool].sort((a, b) => (signals[b.id] || 0) - (signals[a.id] || 0)).slice(0, 6);
  }, [events, signals, todayStr]);

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

  const gChip = (on: boolean) => ({ flex: 'none' as const, cursor: 'pointer', padding: '6px 11px', borderRadius: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', whiteSpace: 'nowrap' as const, border: `1px solid ${on ? 'transparent' : 'rgba(255,255,255,.1)'}`, background: on ? hexA(G.techno, 0.18) : 'transparent', color: on ? '#7AA0E8' : OS.ink5 });

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: 150 }}>
      {/* header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(11,11,13,.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${OS.line}`, padding: '11px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Mono fontSize={9} letterSpacing=".24em" color={OS.ink6}>NIGHTLIFE OS</Mono>
            <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-.02em', color: OS.ink, lineHeight: 1, marginTop: 2 }}>AfterBefore</div>
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
          return <button key={k} onClick={() => setLens(k)} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: '12px 0', fontSize: 14, fontWeight: on ? 700 : 500, color: on ? OS.ink : OS.ink5, borderBottom: `2px solid ${on ? G.afterparty : 'transparent'}` }}>{l}</button>;
        })}
      </div>

      {lens === 'foryou' && (<>
      {/* stories */}
      <OSStories />

      {/* live line */}
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: G.festival, boxShadow: `0 0 10px ${G.festival}`, animation: 'os-pulse 1.8s ease-in-out infinite' }} />
          <Mono fontSize={11} color={OS.ink4}>BEOGRAD · {events.length} OTVORENO</Mono>
        </div>
        <Mono fontSize={11} color={OS.ink6}>VEČERAS {tonightCount} ↗</Mono>
      </div>

      {/* AI strip */}
      <div style={{ margin: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}` }}>
        <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 8, background: hexA(G.community, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, color: G.community }}>AI</span>
        <span style={{ fontSize: 12.5, lineHeight: 1.35, color: OS.ink3 }}>Underground scena vodi grad večeras — energija raste u centru.</span>
      </div>

      {/* best party — the single hero moment */}
      {best && (
        <div style={{ padding: '18px 16px 0' }}>
          <SectionLabel>NAJBOLJA NEDELJE</SectionLabel>
          <button onClick={() => openEvent(best)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, border: 0, background: 'transparent', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 150, borderRadius: 18, overflow: 'hidden', border: `1px solid ${OS.line2}`, background: best.image_url ? `center/cover url(${best.image_url})` : stripe(G.house) }}>
              <div style={{ position: 'absolute', inset: 0, background: HATCH }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#101013 4%,transparent 70%)' }} />
              <Mono style={{ position: 'absolute', top: 12, left: 14 }} fontSize={9} letterSpacing=".16em" color="#f5c97a">★ TOP RATED · {(8 + (energyOf(best.id) % 10) / 10).toFixed(1)}</Mono>
              <div style={{ position: 'absolute', bottom: 13, left: 14, right: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 19, color: OS.ink }}>{best.title}</div>
                <Mono fontSize={11} color={OS.ink4} style={{ marginTop: 6 }}>{dayLabel(best.date)} · {best.start_time?.slice(0, 5)} · {best.venue_name}</Mono>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* trending */}
      {trending.length > 0 && (
        <div style={{ padding: '22px 0 0' }}>
          <div style={{ padding: '0 16px' }}><SectionLabel right={`${trending.length} LIVE`}>TRENDING VEČERAS</SectionLabel></div>
          <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px' }}>
            {trending.map((t) => {
              const col = genreCol(t.music_genres?.[0] || t.venue_type);
              return (
                <button key={t.id} onClick={() => openEvent(t)} style={{ minWidth: 230, maxWidth: 230, flex: 'none', borderRadius: 16, overflow: 'hidden', border: `1px solid ${OS.line2}`, background: OS.surface, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                  <div style={{ position: 'relative', height: 108, background: t.image_url ? `center/cover url(${t.image_url})` : stripe(col) }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.78),transparent 70%)' }} />
                    <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999, fontFamily: MONO, fontSize: 10, color: col, background: 'rgba(11,11,13,.66)', border: `1px solid ${hexA(col, 0.4)}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}` }} />{signals[t.id] || 0} IDE
                    </div>
                  </div>
                  <div style={{ padding: 11 }}><div style={{ fontWeight: 600, fontSize: 14, color: OS.ink }}>{t.title}</div><Mono fontSize={10} color={OS.ink5} style={{ marginTop: 3 }}>{(t.venue_name || '').toUpperCase()}</Mono></div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* za tebe — curated slice (state chips, no type filters) */}
      <div style={{ padding: '22px 16px 0' }}>
        <SectionLabel right={`${forYou.length}`}>ZA TEBE VEČERAS</SectionLabel>
        <div>
          {forYou.map((e) => <OSEventRow key={e.id} e={e} state={stateOf(e)} onClick={() => openEvent(e)} />)}
          {forYou.length === 0 && <Mono fontSize={12} color={OS.ink5} style={{ textAlign: 'center', padding: '24px 0' }}>Još nema događaja.</Mono>}
        </div>
      </div>

      {/* discover places + community reviewed */}
      <OSDiscover navigate={navigate} />
      <OSCommunity navigate={navigate} />

      {/* lucky100 — moved below the lead content */}
      <div style={{ padding: '24px 16px 0' }}>
        <button onClick={() => setLucky(true)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: 18 }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: OS.surface, border: `1px solid ${OS.line2}` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#a64dff,#ff4d8d,#f5a623)' }} />
          <div style={{ padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div><Mono fontSize={10} letterSpacing=".2em" color={OS.ink5}>SISTEM · INSTANT WIN</Mono><div style={{ fontWeight: 700, fontSize: 17, color: OS.ink, marginTop: 3 }}>Lucky 100</div></div>
              <Mono fontSize={11} color={G.festival}>#500 NEXT</Mono>
            </div>
            <Mono fontSize={10.5} color={OS.ink5} style={{ display: 'flex', justifyContent: 'space-between', margin: '11px 0 6px' }}><span>477 / 500</span><span style={{ color: G.festival }}>23 AWAY</span></Mono>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: '95%', background: 'linear-gradient(90deg,#a64dff,#ff4d8d)', borderRadius: 3 }} /></div>
          </div>
        </div>
        </button>
      </div>
      </>)}

      {lens === 'all' && (
        <div style={{ padding: '14px 16px 0' }}>
          {/* date pills */}
          <div className="os-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
            {(['SVE', 'VEČERAS', 'VIKEND'] as const).map((dF) => {
              const on = dateF === dF;
              return <button key={dF} onClick={() => setDateF(dF)} style={{ flex: 'none', cursor: 'pointer', padding: '7px 13px', borderRadius: 999, fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', border: `1px solid ${on ? hexA(G.afterparty, 0.4) : 'rgba(255,255,255,.08)'}`, background: on ? hexA(G.afterparty, 0.16) : OS.surface, color: on ? OS.ink : OS.ink5 }}>{dF}</button>;
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
            {catalog.map((e) => <OSEventRow key={e.id} e={e} state={stateOf(e)} onClick={() => openEvent(e)} />)}
            {catalog.length === 0 && <Mono fontSize={12} color={OS.ink5} style={{ textAlign: 'center', padding: '24px 0' }}>Nema događaja za ovaj filter.</Mono>}
          </div>
        </div>
      )}

      <OSLucky100Modal isOpen={lucky} onClose={() => setLucky(false)} />
    </div>
  );
};

/* ── Discover places (venue cards) ── */
const OSDiscover = ({ navigate }: { navigate: (p: string) => void }) => {
  const { data: venues = [] } = useQuery({
    queryKey: ['os-discover'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('venue_name, venue_type, venue_logo_url, neighborhood').eq('account_type', 'club_venue').not('venue_name', 'is', null).limit(12);
      return data || [];
    },
  });
  if (!venues.length) return null;
  return (
    <div style={{ padding: '24px 0 0' }}>
      <div style={{ padding: '0 16px' }}><SectionLabel right={`${venues.length} MESTA`}>OTKRIJ MESTA</SectionLabel></div>
      <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px' }}>
        {venues.map((v: any) => {
          const meta = TYPE_META[v.venue_type || 'club'] || TYPE_META.club;
          const col = genreCol(v.venue_type);
          return (
            <button key={v.venue_name} onClick={() => navigate(`/venue/${encodeURIComponent(v.venue_name)}`)} style={{ minWidth: 160, maxWidth: 160, flex: 'none', borderRadius: 16, overflow: 'hidden', border: `1px solid ${OS.line2}`, background: OS.surface, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
              <div style={{ position: 'relative', height: 82, background: v.venue_logo_url ? `center/cover url(${v.venue_logo_url})` : stripe(col), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{!v.venue_logo_url && meta.emoji}
                <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: MONO, fontSize: 9, color: col, background: 'rgba(11,11,13,.66)', border: `1px solid ${hexA(col, 0.4)}`, padding: '2px 7px', borderRadius: 999 }}>{meta.label}</div>
              </div>
              <div style={{ padding: 11 }}><div style={{ fontWeight: 600, fontSize: 13, color: OS.ink }}>{v.venue_name}</div>{v.neighborhood && <Mono fontSize={9} color={OS.ink6} style={{ marginTop: 3 }}>{v.neighborhood.toUpperCase()}</Mono>}</div>
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
      <div style={{ padding: '0 16px' }}><SectionLabel>OCENILA ZAJEDNICA</SectionLabel></div>
      <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px' }}>
        {reviews.map((r: any) => (
          <button key={r.id} onClick={() => r.venue_name && navigate(`/venue/${encodeURIComponent(r.venue_name)}#reviews`)} style={{ minWidth: 240, maxWidth: 240, flex: 'none', borderRadius: 16, border: `1px solid ${OS.line2}`, background: OS.surface, padding: 13, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: OS.ink }}>{r.venue_name}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: G.house }}>★ {r.rating}</span>
            </div>
            {r.review_text && <div style={{ fontSize: 11.5, fontStyle: 'italic', color: OS.ink4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{r.review_text}"</div>}
            {r.verified_visit && <span style={{ display: 'inline-block', marginTop: 8, fontFamily: MONO, fontSize: 9, color: G.festival, background: hexA(G.festival, 0.12), padding: '2px 7px', borderRadius: 999 }}>✓ POSEĆENO</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
