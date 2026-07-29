import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHeatVenues } from '@/hooks/useHeatVenues';
import { useExit } from './useExit';
import { AB, MONO, genreCol } from './osTheme';
import type { OSVenue } from './OSVenueSheet';

const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;

/**
 * "Gde si?" — orb bez check-ina otvara ovo (IA v2 §11.2). Prečica do venue
 * sheeta gde check-in već radi sve; NE duplira check-in logiku.
 */
export const OSVenuePicker = ({ onPick, onClose }: { onPick: (v: OSVenue) => void; onClose: () => void }) => {
  const { closing, close } = useExit(onClose);
  const { data: venues = [] } = useHeatVenues();
  const { profile } = useAuth();
  const myLevel = (profile as any)?.level || 1;
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    // Picker služi check-inu — zaključana skrivena mesta ne nudimo (gate §6).
    const eligible = venues.filter((v: any) => !(v.hidden && (v.minLevel || 0) > myLevel));
    const term = q.trim().toLowerCase();
    const base = term
      ? eligible.filter((v: any) => (v.name || '').toLowerCase().includes(term) || (v.neighborhood || '').toLowerCase().includes(term))
      : [...eligible].sort((a: any, b: any) => ((b.here ?? 0) - (a.here ?? 0)) || ((b.heat ?? 0) - (a.heat ?? 0)));
    return base.slice(0, term ? 12 : 5);
  }, [venues, q, myLevel]);

  const pick = (v: any) => {
    onPick({
      name: v.name, genre: (v.genreLabel || v.type || 'VENUE').toUpperCase(), col: genreCol(v.genreLabel || v.type),
      venueId: v.venue_id ?? null, presenceId: v.id ?? null, lat: v.lat ?? null, lng: v.lng ?? null,
      radius: v.radius, heat: v.heat, here: v.here ?? 0, neighborhood: (v.neighborhood || '').toUpperCase(),
      hidden: v.hidden, minLevel: v.minLevel, discoveredBy: v.discoveredBy,
    });
    close();
  };

  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 92, background: 'rgba(5,5,7,.66)', animation: closing ? 'os-scrim-out .15s ease forwards' : 'os-scrim .25s ease' }} />
      <div className="os-scroll" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '78vh', zIndex: 93, overflowY: 'auto', borderRadius: '22px 22px 0 0', background: AB.surface, border: `1px solid ${AB.line}`, maxWidth: 520, margin: '0 auto', paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)', animation: closing ? 'os-sheet-out .15s ease forwards' : 'os-sheet .4s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ position: 'sticky', top: 0, background: AB.surface, padding: '16px 18px 12px', borderBottom: `1px solid ${AB.line}` }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.25)', margin: '0 auto 14px' }} />
          <div style={LABEL}>GDE SI?</div>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: AB.ink, marginTop: 4 }}>Čekiraj se i noć počinje</div>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Traži mesto…" aria-label="Traži mesto"
            style={{ width: '100%', marginTop: 12, background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 12, padding: '11px 14px', fontSize: 14.5, color: AB.ink, outline: 'none' }}
          />
        </div>
        <div style={{ padding: '4px 18px 0' }}>
          {list.map((v: any) => (
            <button key={v.id} onClick={() => pick(v)} className="os-press" style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', padding: '14px 0', background: 'transparent', border: 0, borderTop: `1px solid ${AB.line}`, cursor: 'pointer' }}>
              <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: AB.raised, border: `1px solid ${AB.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{v.emoji || '📍'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{v.name}</span>
                <span style={{ display: 'block', fontFamily: MONO, fontSize: 10, color: AB.ink3, marginTop: 3 }}>{(v.neighborhood || 'BEOGRAD').toUpperCase()}</span>
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: (v.here ?? 0) > 0 ? AB.acid : AB.ink3 }}>{(v.here ?? 0) > 0 ? `${v.here} ovde` : 'mirno'}</span>
            </button>
          ))}
          {list.length === 0 && <div style={{ ...LABEL, textAlign: 'center', padding: '28px 0' }}>NEMA MESTA ZA TU PRETRAGU.</div>}
        </div>
      </div>
    </>
  );
};
