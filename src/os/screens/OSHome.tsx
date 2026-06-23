import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OSLucky100Modal } from '../OSLucky100Modal';
import { OS, G, hexA, MONO, HATCH, stripe, genreCol, CONIC } from '../osTheme';
import type { OSVenue } from '../OSVenueSheet';

interface Ev {
  id: string; title: string; date: string; start_time: string; venue_name: string;
  image_url: string; music_genres: string[]; venue_type: string; event_type: string; venue_id?: string | null;
}

// Stable pseudo "energy" 60–93 from id (no real energy metric yet).
const energyOf = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 34; return 60 + h; };
const dayLabel = (d: string) => { try { return ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'][new Date(d).getDay()]; } catch { return ''; } };

const Mono = ({ children, ...s }: any) => <div style={{ fontFamily: MONO, ...s }}>{children}</div>;
const SectionLabel = ({ children, right }: { children: string; right?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', color: OS.ink6 }}>{children}</span>
    {right && <span style={{ fontFamily: MONO, fontSize: 11, color: OS.ink6 }}>{right}</span>}
  </div>
);

export const OSHome = ({ onOpenVenue, goProfile }: { onOpenVenue: (v: OSVenue) => void; goProfile: () => void }) => {
  const [filter, setFilter] = useState('ALL');
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
    col: genreCol(e.music_genres?.[0] || e.venue_type), venueId: e.venue_id ?? null,
    heat: energyOf(e.id), neighborhood: (e.venue_type || '').toUpperCase(),
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const tonightCount = events.filter((e) => e.date === todayStr && e.venue_type !== 'afterplace').length;

  const filtered = useMemo(() => events.filter((e) => {
    if (e.venue_type === 'afterplace') return false;
    if (filter === 'ALL') return true;
    if (filter === 'TONIGHT') return e.date === todayStr;
    if (filter === 'WEEKEND') { const d = new Date(e.date).getDay(); return d === 5 || d === 6 || d === 0; }
    if (filter === 'CLUBS') return e.venue_type === 'club';
    if (filter === 'SPLAVS') return e.venue_type === 'splav';
    if (filter === 'SECRET') return e.event_type === 'secret';
    return true;
  }), [events, filter, todayStr]);

  const trending = [...events].sort((a, b) => (signals[b.id] || 0) - (signals[a.id] || 0)).slice(0, 3);
  const best = trending[0];
  const filters = ['ALL', 'TONIGHT', 'WEEKEND', 'CLUBS', 'SPLAVS', 'SECRET'];

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: 150 }}>
      {/* header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(11,11,13,.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${OS.line}`, padding: '11px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Mono fontSize={9} letterSpacing=".24em" color={OS.ink6}>NIGHTLIFE OS</Mono>
            <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-.02em', color: OS.ink, lineHeight: 1, marginTop: 2 }}>AfterBefore</div>
          </div>
          <button onClick={goProfile} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', background: CONIC, padding: 0 }} />
        </div>
      </div>

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

      {/* lucky100 */}
      <div style={{ padding: '14px 16px 0' }}>
        <button onClick={() => setLucky(true)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: 18 }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, background: OS.surface, border: `1px solid ${OS.line2}` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#a64dff,#ff4d8d,#f5a623)' }} />
          <div style={{ padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div><Mono fontSize={9} letterSpacing=".2em" color={OS.ink6}>SISTEM · INSTANT WIN</Mono><div style={{ fontWeight: 700, fontSize: 17, color: OS.ink, marginTop: 3 }}>Lucky 100</div></div>
              <Mono fontSize={11} color={G.festival}>#500 NEXT</Mono>
            </div>
            <Mono fontSize={10} color={OS.ink5} style={{ display: 'flex', justifyContent: 'space-between', margin: '11px 0 6px' }}><span>477 / 500</span><span style={{ color: G.festival }}>23 AWAY</span></Mono>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: '95%', background: 'linear-gradient(90deg,#a64dff,#ff4d8d)', borderRadius: 3 }} /></div>
          </div>
        </div>
        </button>
      </div>

      {/* best party */}
      {best && (
        <div style={{ padding: '18px 16px 0' }}>
          <SectionLabel>[ NAJBOLJA NEDELJE ]</SectionLabel>
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
          <div style={{ padding: '0 16px' }}><SectionLabel right={`${trending.length} LIVE`}>[ TRENDING VEČERAS ]</SectionLabel></div>
          <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px' }}>
            {trending.map((t) => {
              const col = genreCol(t.music_genres?.[0] || t.venue_type);
              return (
                <button key={t.id} onClick={() => openEvent(t)} style={{ minWidth: 230, maxWidth: 230, flex: 'none', borderRadius: 16, overflow: 'hidden', border: `1px solid ${OS.line2}`, background: OS.surface, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                  <div style={{ position: 'relative', height: 108, background: t.image_url ? `center/cover url(${t.image_url})` : stripe(col) }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.78),transparent 70%)' }} />
                    <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999, fontFamily: MONO, fontSize: 10, color: col, background: 'rgba(11,11,13,.66)', border: `1px solid ${hexA(col, 0.4)}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}` }} />{signals[t.id] || 0} GOING
                    </div>
                  </div>
                  <div style={{ padding: 11 }}><div style={{ fontWeight: 600, fontSize: 14, color: OS.ink }}>{t.title}</div><Mono fontSize={10} color={OS.ink5} style={{ marginTop: 3 }}>{(t.venue_name || '').toUpperCase()}</Mono></div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* filters */}
      <div style={{ padding: '22px 16px 0' }}>
        <div className="os-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {filters.map((f) => {
            const on = filter === f;
            return <button key={f} onClick={() => setFilter(f)} style={{ flex: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 999, fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${on ? hexA(G.community, 0.4) : 'rgba(255,255,255,.07)'}`, background: on ? hexA(G.community, 0.16) : OS.surface, color: on ? OS.ink : OS.ink5 }}>{f}</button>;
          })}
        </div>
      </div>

      {/* events */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionLabel right={`${filtered.length} LISTED`}>[ UPCOMING ]</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((e) => {
            const col = genreCol(e.music_genres?.[0] || e.venue_type);
            const en = energyOf(e.id);
            return (
              <button key={e.id} onClick={() => openEvent(e)} style={{ textAlign: 'left', cursor: 'pointer', padding: 0, border: `1px solid ${OS.line2}`, borderRadius: 18, overflow: 'hidden', background: OS.surface }}>
                <div style={{ position: 'relative', height: 128 }}>
                  <div style={{ position: 'absolute', inset: 0, background: e.image_url ? `center/cover url(${e.image_url})` : stripe(col) }} />
                  <div style={{ position: 'absolute', inset: 0, background: HATCH }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#131417 3%,transparent 62%)' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, width: 46, height: 46, borderRadius: '50%', background: `conic-gradient(${col} ${Math.round(en / 100 * 360)}deg, rgba(255,255,255,.08) 0)`, padding: 3.5 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0e0f12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 13, color: OS.ink }}>{en}</div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}` }} /><Mono fontSize={9} letterSpacing=".14em" color={col}>{(e.music_genres?.[0] || e.venue_type || '').toUpperCase()}</Mono></div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: OS.ink, marginTop: 5 }}>{e.title}</div>
                    <Mono fontSize={10.5} color={OS.ink4} style={{ marginTop: 4 }}>{dayLabel(e.date)} {e.start_time?.slice(0, 5)} · {e.venue_name}</Mono>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <Mono fontSize={12} color={OS.ink5} style={{ textAlign: 'center', padding: '24px 0' }}>Nema događaja za ovaj filter.</Mono>}
        </div>
      </div>

      <OSLucky100Modal isOpen={lucky} onClose={() => setLucky(false)} />
    </div>
  );
};
