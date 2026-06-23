import { useState, useMemo } from 'react';
import { useHeatVenues } from '@/hooks/useHeatVenues';
import { OS, G, hexA, MONO, genreCol } from '../osTheme';
import type { OSVenue } from '../OSVenueSheet';

const HOODS = ['All', 'Savamala', 'Dorćol', 'Vračar', 'Stari Grad', 'Novi Beograd'];
const MODES: [string, string, string][] = [['pulse', 'Pulse', 'See the city live'], ['active', 'Active', '5 free / day']];

export const OSExplore = ({ onOpenVenue }: { onOpenVenue: (v: OSVenue) => void }) => {
  const { data: venues = [] } = useHeatVenues();
  const [ghost, setGhost] = useState(false);
  const [mode, setMode] = useState('pulse');
  const [hood, setHood] = useState('All');

  const pins = useMemo(() => venues
    .filter((v: any) => hood === 'All' || (v.neighborhood || '').toLowerCase().includes(hood.toLowerCase()))
    .slice(0, 12)
    .map((v: any) => ({ v, col: genreCol(v.genreLabel || v.type), left: `${v.x}%`, top: `${v.y}%`, count: v.here ?? 0 })), [venues, hood]);

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
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.22em', color: OS.ink6 }}>CITY PULSE · LIVE</div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', color: OS.ink, marginTop: 2 }}>Heat</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: ghost ? OS.ink5 : G.festival }}>{ghost ? 'GHOST' : 'VISIBLE'}</span>
          <button onClick={() => setGhost((g) => !g)} style={{ cursor: 'pointer', width: 42, height: 24, borderRadius: 999, border: '1px solid rgba(255,255,255,.12)', background: ghost ? 'rgba(255,255,255,.06)' : hexA(G.festival, 0.3), position: 'relative', padding: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: ghost ? 2 : 20, width: 18, height: 18, borderRadius: '50%', background: OS.ink, transition: 'left .2s' }} />
          </button>
        </div>
      </div>

      {/* modes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, padding: '14px 16px 0' }}>
        {MODES.map(([k, l, d]) => {
          const on = mode === k;
          return (
            <button key={k} onClick={() => setMode(k)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3, padding: 13, borderRadius: 14, border: `1px solid ${on ? hexA(G.community, 0.4) : 'rgba(255,255,255,.07)'}`, background: on ? hexA(G.community, 0.14) : OS.surface, textAlign: 'left' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: G.community }}>{on ? 'AKTIVNO' : ''}</span>
              <span style={{ fontWeight: 640, fontSize: 15, color: OS.ink, marginTop: 2 }}>{l}</span>
              <span style={{ fontSize: 11, color: OS.ink5 }}>{d}</span>
            </button>
          );
        })}
      </div>

      {/* hoods */}
      <div className="os-scroll" style={{ overflowX: 'auto', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {HOODS.map((h) => {
            const on = hood === h;
            return <button key={h} onClick={() => setHood(h)} style={{ flex: 'none', cursor: 'pointer', padding: '7px 13px', borderRadius: 999, fontFamily: MONO, fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${on ? hexA(G.house, 0.4) : 'rgba(255,255,255,.07)'}`, background: on ? hexA(G.house, 0.16) : OS.surface, color: on ? G.house : OS.ink5 }}>{h}</button>;
          })}
        </div>
      </div>

      {/* pulse map */}
      <div style={{ position: 'relative', margin: '14px 16px 0', height: 470, borderRadius: 20, overflow: 'hidden', background: `radial-gradient(70% 50% at 40% 30%, ${hexA(G.techno, 0.1)}, transparent 70%), #101013`, border: `1px solid ${OS.line}` }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 380 470" preserveAspectRatio="xMidYMid slice">
          <line x1="0" y1="150" x2="380" y2="120" stroke="#1f1f22" strokeWidth="1" />
          <line x1="0" y1="300" x2="380" y2="330" stroke="#1f1f22" strokeWidth="1" />
          <line x1="120" y1="0" x2="150" y2="470" stroke="#1f1f22" strokeWidth="1" />
          <line x1="270" y1="0" x2="240" y2="470" stroke="#1f1f22" strokeWidth="1" />
          <path d="M -20 380 Q 120 350 220 400 T 420 420 L 420 500 L -20 500 Z" fill="#0e1a1f" stroke="#16323a" strokeWidth="1" />
          <text x="34" y="430" fill="#2f4a52" fontFamily="'IBM Plex Mono',monospace" fontSize="10" letterSpacing="3">SAVA</text>
        </svg>
        {pins.map(({ v, col, left, top, count }) => (
          <button key={v.id} onClick={() => open(v)} style={{ position: 'absolute', left, top, transform: 'translate(-50%,-50%)', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}>
            <span style={{ position: 'absolute', inset: 0, margin: 'auto', width: 14, height: 14, borderRadius: '50%', background: col, animation: 'os-ping 2.4s ease-out infinite' }} />
            <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: col, border: '2px solid #101013', boxShadow: `0 0 12px ${col}` }} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink, background: 'rgba(11,11,13,.6)', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>{v.name} · {count}</span>
            </span>
          </button>
        ))}
        <div style={{ position: 'absolute', left: '46%', top: '54%', transform: 'translate(-50%,-50%)' }}>
          <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #0B0B0D', boxShadow: '0 0 0 4px rgba(255,255,255,.18)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: MONO, fontSize: 10, color: OS.ink5 }}>{venues.length} VENUES · {liveTotal} LIVE</div>
      </div>
    </div>
  );
};
