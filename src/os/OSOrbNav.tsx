import type { ReactNode } from 'react';
import { Building2, Heart } from 'lucide-react';
import { G, AB, hexA, MONO, CONIC } from './osTheme';

// IA v2 §11 (2026-07-21): fiksna 3-tačka traka GRAD · (ORB=TU SAM) · JA.
// Orb lepeza (skrivena navigacija) je ukinuta — pijan korisnik u mraku
// prepoznaje, ne pamti. Orb je money path: ugašen → gori → hub večeri.
export type OSScreen = 'grad' | 'ja';

/**
 * @param live  true = imaš aktivan check-in (orb gori i vodi u HUB VEČERI)
 * @param onOrb tap na orb: bez check-ina otvara izbor mesta, sa njim hub
 */
export const OSOrbNav = ({ current, onGo, onOrb, live }: {
  current: OSScreen;
  onGo: (s: OSScreen) => void;
  onOrb: () => void;
  live: boolean;
}) => {
  const orbCol = live ? AB.acid : G.community;

  // Trim 2026-07-21: emoji (🌃/🖤) → line ikone u kanon stilu (mono linija, ink).
  const tab = (screen: OSScreen, label: string, icon: ReactNode) => {
    const on = current === screen;
    return (
      <button
        onClick={() => onGo(screen)}
        aria-label={label}
        aria-current={on ? 'page' : undefined}
        className="os-press"
        style={{
          flex: 1, minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          background: 'transparent', border: 0, cursor: 'pointer', pointerEvents: 'auto', padding: 0,
        }}
      >
        <span style={{ display: 'flex', color: on ? AB.ink : AB.ink3 }}>{icon}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: on ? AB.ink : AB.ink3 }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70, pointerEvents: 'none' }}>
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', maxWidth: 520, margin: '0 auto',
        padding: `10px 12px calc(env(safe-area-inset-bottom) + 10px)`,
        background: 'oklch(0.135 0.012 285 / 0.94)', backdropFilter: 'blur(18px)', borderTop: `1px solid ${AB.line}`,
        pointerEvents: 'auto',
      }}>
        {tab('grad', 'GRAD', <Building2 size={18} strokeWidth={1.8} />)}

        {/* ORB = TU SAM — najveća meta, centar, money path */}
        <div style={{ flex: 'none', width: 92, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onOrb}
            aria-label={live ? 'Tvoja noć' : 'Tu sam — čekiraj se'}
            style={{
              position: 'relative', top: -18, width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
              border: `1px solid ${hexA(orbCol, live ? 0.7 : 0.35)}`,
              background: 'radial-gradient(circle at 38% 32%, #2a2c33, #0e0e11)',
              boxShadow: live
                ? `0 0 0 2px ${hexA(orbCol, 0.5)}, 0 0 30px ${hexA(orbCol, 0.45)}, 0 14px 40px -8px rgba(0,0,0,.9)`
                : `0 0 0 1.5px ${hexA(orbCol, 0.3)}, 0 14px 40px -8px rgba(0,0,0,.9)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              transition: 'box-shadow .4s, border-color .4s',
            }}
          >
            <span style={{
              width: 26, height: 26, borderRadius: '50%', background: CONIC,
              boxShadow: `0 0 16px ${hexA(orbCol, live ? 0.6 : 0.3)}`,
              animation: live ? 'os-pulse 2.4s ease-in-out infinite' : undefined,
            }} />
            <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 600, letterSpacing: '.1em', color: live ? AB.acid : AB.ink3 }}>
              {live ? 'NOĆ' : 'TU SAM'}
            </span>
          </button>
        </div>

        {tab('ja', 'JA', <Heart size={18} strokeWidth={1.8} fill={current === 'ja' ? 'currentColor' : 'none'} />)}
      </div>
    </div>
  );
};
