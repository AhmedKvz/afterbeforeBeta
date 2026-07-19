import { useState, useMemo } from 'react';
import { useHeatVenues } from '@/hooks/useHeatVenues';
import { AB, OS, G, hexA, MONO, ROLE, genreCol } from '../osTheme';
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

  // Glass pilula preko mape (kanon §9: UI pluta NAD mapom, nikad paneli ispod).
  const glass = (on: boolean) => ({
    flex: 'none' as const, cursor: 'pointer', padding: '8px 14px', borderRadius: 999,
    fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
    border: `1px solid ${on ? 'transparent' : AB.line2}`,
    background: on ? AB.acid : 'rgba(11,11,13,.62)', backdropFilter: 'blur(10px)',
    color: on ? AB.acidInk : AB.ink2,
  });

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', background: AB.void, paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      {/* header + ghost */}
      <div style={{ padding: '8px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 }}>CITY PULSE · LIVE</div>
          <div style={{ fontWeight: 800, fontSize: 30, lineHeight: '34px', letterSpacing: '-.02em', color: AB.ink, marginTop: 4 }}>Heat</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: ghost ? AB.ink3 : AB.acid }}>{ghost ? 'GHOST' : 'VISIBLE'}</span>
          <button onClick={() => setGhost((g) => !g)} aria-label="Vidljivost" style={{ cursor: 'pointer', width: 42, height: 24, borderRadius: 999, border: `1px solid ${AB.line2}`, background: ghost ? 'rgba(255,255,255,.06)' : 'oklch(0.88 0.19 158 / 0.3)', position: 'relative', padding: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: ghost ? 2 : 20, width: 18, height: 18, borderRadius: '50%', background: AB.ink, transition: 'left .2s' }} />
          </button>
        </div>
      </div>

      {/* pulse map — hero (kanon §9), filteri plutaju preko nje */}
      <div style={{ position: 'relative', margin: '14px 18px 0', height: 'min(480px, 56vh)', borderRadius: 22, overflow: 'hidden', background: `radial-gradient(70% 50% at 40% 30%, ${hexA(G.techno, 0.1)}, transparent 70%), #101013`, border: `1px solid ${AB.line}` }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 380 360" preserveAspectRatio="xMidYMid slice">
          <line x1="0" y1="120" x2="380" y2="100" stroke="#1f1f22" strokeWidth="1" />
          <line x1="0" y1="240" x2="380" y2="260" stroke="#1f1f22" strokeWidth="1" />
          <line x1="120" y1="0" x2="150" y2="360" stroke="#1f1f22" strokeWidth="1" />
          <line x1="270" y1="0" x2="240" y2="360" stroke="#1f1f22" strokeWidth="1" />
          <path d="M -20 300 Q 120 280 220 310 T 420 320 L 420 400 L -20 400 Z" fill="#0e1a1f" stroke="#16323a" strokeWidth="1" />
          <text x="34" y="335" fill="#2f4a52" fontFamily="'IBM Plex Mono',monospace" fontSize="10" letterSpacing="3">SAVA</text>
        </svg>
        {/* pin puls samo gde ima ljudi (≤6 po viewport-u), veličina ∝ prisustvo,
            glow earned — mirna mesta su mirne tačke */}
        {pins.map(({ v, col, left, top, count, labeled, above }, pi) => {
          const live = count > 0;
          const size = 12 + Math.min(count * 2, 10);
          return (
            <button key={v.id} onClick={() => open(v)} style={{ position: 'absolute', left, top, transform: 'translate(-50%,-50%)', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}>
              {live && pi < 6 && <span style={{ position: 'absolute', inset: 0, margin: 'auto', width: size, height: size, borderRadius: '50%', background: col, animation: 'os-ping 2.4s ease-out infinite' }} />}
              <span style={{ position: 'relative', display: 'flex', flexDirection: above ? 'column-reverse' : 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ width: size, height: size, borderRadius: '50%', background: live ? col : hexA(col, 0.5), border: '2px solid #101013', boxShadow: live ? `0 0 12px ${col}` : 'none' }} />
                {labeled && <span style={{ fontFamily: MONO, fontSize: 10, color: AB.ink, background: 'rgba(11,11,13,.62)', backdropFilter: 'blur(6px)', padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>{v.name}{count > 0 ? ` · ${count}` : ''}</span>}
              </span>
            </button>
          );
        })}
        <div style={{ position: 'absolute', left: '46%', top: '54%', transform: 'translate(-50%,-50%)' }}>
          <span style={{ display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #0B0B0D', boxShadow: '0 0 0 4px rgba(255,255,255,.18)' }} />
        </div>

        {/* filteri — glass pilule preko mape (kanon §9) */}
        <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div className="os-scroll" style={{ overflowX: 'auto', padding: '0 12px' }}>
            <div style={{ display: 'flex', gap: 7, width: 'max-content' }}>
              {TYPES.map(([k, l]) => <button key={k} onClick={() => setType(k)} className="os-press" style={glass(type === k)}>{l}</button>)}
            </div>
          </div>
          <div className="os-scroll" style={{ overflowX: 'auto', padding: '0 12px' }}>
            <div style={{ display: 'flex', gap: 7, width: 'max-content' }}>
              {HOODS.map((h) => {
                const on = hood === h;
                return <button key={h} onClick={() => setHood(h)} className="os-press" style={{ ...glass(on), background: on ? AB.raised : 'rgba(11,11,13,.62)', color: on ? AB.ink : AB.ink3, border: `1px solid ${on ? AB.line2 : AB.line}`, fontSize: 10, padding: '6px 12px' }}>{h === 'All' ? 'SVI KVARTOVI' : h.toUpperCase()}</button>;
              })}
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: AB.ink2, background: 'rgba(11,11,13,.62)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: 999 }}>{filtered.length} MESTA · {liveTotal} LIVE</div>
      </div>

      {/* empty-state: quiet city → point to the weekend, don't showcase the void */}
      {liveTotal === 0 && (
        <div style={{ margin: '12px 18px 0', padding: '12px 14px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${G.afterparty}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ fontSize: 20 }}>🌙</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>Tišina pre bure.</div>
            <div style={{ fontSize: 12, color: AB.ink2, marginTop: 2 }}>Grad se pali vikendom — pogledaj šta se sprema na Home.</div>
          </div>
        </div>
      )}

      {/* ranked venue list — RA/OS rows */}
      <div style={{ padding: '20px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 }}>VRUĆE U BLIZINI</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: AB.ink3 }}>PO ENERGIJI ≈</span>
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
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', padding: '13px 0', background: 'transparent', border: 0, borderTop: `1px solid ${AB.line}`, cursor: 'pointer' }}>
      <div style={{ flex: 'none', width: 46, height: 46, borderRadius: 12, background: AB.raised, border: `1px solid ${AB.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{v.emoji || '📍'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-.01em', color: ROLE.name, lineHeight: 1.2 }}>{v.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', marginTop: 4 }}>
          <span style={{ color: ROLE.genre }}>{(v.genreLabel || v.type || '').toUpperCase()}</span>
          <span style={{ color: AB.ink3 }}> · {(v.neighborhood || 'BEOGRAD').toUpperCase()}</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: AB.ink2, marginTop: 3 }}>{here > 0 ? `${here} ovde` : 'mirno'}</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right' }}>
        <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: ROLE.energy }}>≈{v.heat ?? 0}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: AB.ink3, marginTop: 1 }}>ENERGY</div>
      </div>
    </button>
  );
};
