import { useState, useMemo } from 'react';
import { useHeatVenues } from '@/hooks/useHeatVenues';
import { OS, G, hexA, MONO, ROLE, genreCol } from '../osTheme';
import type { OSVenue } from '../OSVenueSheet';

const HOODS = ['All', 'Savamala', 'Dorćol', 'Vračar', 'Stari Grad', 'Novi Beograd'];
const TYPES: [string, string][] = [
  ['all', 'Sve'], ['club', 'Klubovi'], ['bar', 'Barovi'], ['splav', 'Splavovi'], ['cafe', 'Kafići'], ['festival', 'Festivali'], ['afterplace', 'After'],
];
const typeMatch = (vt: string, t: string) => t === 'all' || (t === 'cafe' ? /cafe/.test(vt) : vt === t);

export const OSExplore = ({ onOpenVenue }: { onOpenVenue: (v: OSVenue) => void }) => {
  const { data: venues = [] } = useHeatVenues();
  const [ghost, setGhost] = useState(false);
  const [type, setType] = useState('all');
  const [hood, setHood] = useState('All');

  const filtered = useMemo(() => venues
    .filter((v: any) => typeMatch(v.type || '', type))
    .filter((v: any) => hood === 'All' || (v.neighborhood || '').toLowerCase().includes(hood.toLowerCase())),
    [venues, type, hood]);
  // Deterministički: pin dobija top-15 po (prisustvo, heat) — ne prvih 12 iz
  // baze; labelu nosi samo top-10, naizmenično iznad/ispod (declutter).
  const pins = [...filtered]
    .sort((a: any, b: any) => ((b.here ?? 0) - (a.here ?? 0)) || ((b.heat ?? 0) - (a.heat ?? 0)))
    .slice(0, 15)
    .map((v: any, i: number) => ({ v, col: genreCol(v.genreLabel || v.type), left: `${v.x}%`, top: `${v.y}%`, count: v.here ?? 0, labeled: i < 10, above: i % 2 === 1 }));
  const ranked = useMemo(() => [...filtered].sort((a: any, b: any) => (b.heat ?? 0) - (a.heat ?? 0)).slice(0, 12), [filtered]);
  const liveTotal = venues.reduce((s: number, v: any) => s + (v.here ?? 0), 0);

  const open = (v: any) => onOpenVenue({
    name: v.name, genre: (v.genreLabel || v.type || 'VENUE').toUpperCase(), col: genreCol(v.genreLabel || v.type),
    venueId: v.venue_id ?? null, presenceId: v.id ?? null, lat: v.lat ?? null, lng: v.lng ?? null, radius: v.radius,
    heat: v.heat, here: v.here ?? 0, neighborhood: (v.neighborhood || '').toUpperCase(),
  });

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      {/* header + ghost */}
      <div style={{ padding: '8px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.22em', color: OS.ink6 }}>CITY PULSE · LIVE</div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', color: OS.ink, marginTop: 2 }}>Heat</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: ghost ? OS.ink5 : G.festival }}>{ghost ? 'GHOST' : 'VISIBLE'}</span>
          <button onClick={() => setGhost((g) => !g)} aria-label="Vidljivost" style={{ cursor: 'pointer', width: 42, height: 24, borderRadius: 999, border: '1px solid rgba(255,255,255,.12)', background: ghost ? 'rgba(255,255,255,.06)' : hexA(G.festival, 0.3), position: 'relative', padding: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: ghost ? 2 : 20, width: 18, height: 18, borderRadius: '50%', background: OS.ink, transition: 'left .2s' }} />
          </button>
        </div>
      </div>

      {/* type chips */}
      <div className="os-scroll" style={{ overflowX: 'auto', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {TYPES.map(([k, l]) => {
            const on = type === k;
            return <button key={k} onClick={() => setType(k)} style={{ flex: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 999, fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${on ? hexA(G.community, 0.4) : 'rgba(255,255,255,.07)'}`, background: on ? hexA(G.community, 0.16) : OS.surface, color: on ? OS.ink : OS.ink5 }}>{l}</button>;
          })}
        </div>
      </div>

      {/* hoods */}
      <div className="os-scroll" style={{ overflowX: 'auto', padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {HOODS.map((h) => {
            const on = hood === h;
            return <button key={h} onClick={() => setHood(h)} style={{ flex: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 999, fontFamily: MONO, fontSize: 10, letterSpacing: '.04em', whiteSpace: 'nowrap', border: `1px solid ${on ? hexA(G.house, 0.4) : 'rgba(255,255,255,.07)'}`, background: on ? hexA(G.house, 0.16) : 'transparent', color: on ? G.house : OS.ink6 }}>{h === 'All' ? 'SVI KVARTOVI' : h.toUpperCase()}</button>;
          })}
        </div>
      </div>

      {/* pulse map */}
      <div style={{ position: 'relative', margin: '14px 16px 0', height: 'min(360px, 42vh)', borderRadius: 20, overflow: 'hidden', background: `radial-gradient(70% 50% at 40% 30%, ${hexA(G.techno, 0.1)}, transparent 70%), #101013`, border: `1px solid ${OS.line}` }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 380 360" preserveAspectRatio="xMidYMid slice">
          <line x1="0" y1="120" x2="380" y2="100" stroke="#1f1f22" strokeWidth="1" />
          <line x1="0" y1="240" x2="380" y2="260" stroke="#1f1f22" strokeWidth="1" />
          <line x1="120" y1="0" x2="150" y2="360" stroke="#1f1f22" strokeWidth="1" />
          <line x1="270" y1="0" x2="240" y2="360" stroke="#1f1f22" strokeWidth="1" />
          <path d="M -20 300 Q 120 280 220 310 T 420 320 L 420 400 L -20 400 Z" fill="#0e1a1f" stroke="#16323a" strokeWidth="1" />
          <text x="34" y="335" fill="#2f4a52" fontFamily="'IBM Plex Mono',monospace" fontSize="10" letterSpacing="3">SAVA</text>
        </svg>
        {pins.map(({ v, col, left, top, count, labeled, above }) => (
          <button key={v.id} onClick={() => open(v)} style={{ position: 'absolute', left, top, transform: 'translate(-50%,-50%)', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}>
            <span style={{ position: 'absolute', inset: 0, margin: 'auto', width: 14, height: 14, borderRadius: '50%', background: col, animation: 'os-ping 2.4s ease-out infinite' }} />
            <span style={{ position: 'relative', display: 'flex', flexDirection: above ? 'column-reverse' : 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: col, border: '2px solid #101013', boxShadow: `0 0 12px ${col}` }} />
              {labeled && <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink, background: 'rgba(11,11,13,.6)', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>{v.name}{count > 0 ? ` · ${count}` : ''}</span>}
            </span>
          </button>
        ))}
        <div style={{ position: 'absolute', left: '46%', top: '54%', transform: 'translate(-50%,-50%)' }}>
          <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #0B0B0D', boxShadow: '0 0 0 4px rgba(255,255,255,.18)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: MONO, fontSize: 10, color: OS.ink5 }}>{filtered.length} MESTA · {liveTotal} LIVE</div>
      </div>

      {/* empty-state: quiet city → point to the weekend, don't showcase the void */}
      {liveTotal === 0 && (
        <div style={{ margin: '12px 16px 0', padding: '12px 14px', borderRadius: 14, background: `linear-gradient(140deg,${hexA(G.afterparty, 0.1)},transparent)`, border: `1px solid ${hexA(G.afterparty, 0.25)}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ fontSize: 20 }}>🌙</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: OS.ink }}>Tišina pre bure.</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>GRAD SE PALI VIKENDOM — POGLEDAJ ŠTA SE SPREMA NA HOME.</div>
          </div>
        </div>
      )}

      {/* ranked venue list — RA/OS rows */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>VRUĆE U BLIZINI</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6 }}>PO ENERGIJI ≈</span>
        </div>
        <div>
          {ranked.map((v: any) => <VenueRow key={v.id} v={v} onClick={() => open(v)} />)}
          {ranked.length === 0 && <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, textAlign: 'center', padding: '24px 0' }}>NEMA MESTA ZA OVAJ FILTER.</div>}
        </div>
      </div>
    </div>
  );
};

/* ── Venue row: emoji | name(red) + genre(blue)·hood | energy(green) ── */
const VenueRow = ({ v, onClick }: { v: any; onClick: () => void }) => {
  const here = v.here ?? 0;
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', padding: '13px 0', background: 'transparent', border: 0, borderTop: `1px solid ${OS.line}`, cursor: 'pointer' }}>
      <div style={{ flex: 'none', width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#1b1c20,#0e0f12)', border: `1px solid ${OS.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{v.emoji || '📍'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: ROLE.name, lineHeight: 1.2 }}>{v.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', marginTop: 4 }}>
          <span style={{ color: ROLE.genre }}>{(v.genreLabel || v.type || '').toUpperCase()}</span>
          <span style={{ color: OS.ink6 }}> · {(v.neighborhood || 'BEOGRAD').toUpperCase()}</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink2, marginTop: 3 }}>{here > 0 ? `${here} ovde` : 'mirno'}</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: ROLE.energy }}>≈{v.heat ?? 0}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: OS.ink6, marginTop: 1 }}>ENERGY</div>
      </div>
    </button>
  );
};
