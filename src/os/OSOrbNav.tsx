import type { ReactNode } from 'react';
import { Building2, Heart } from 'lucide-react';
import { AB, MONO } from './osTheme';

// IA v2 §11 (2026-07-21): fiksna 3-tačka traka GRAD · (ORB=TU SAM) · JA.
// Redesign 2026-08-03 (§12–13): plutajuća crna traka (radius 24, 1px ivica),
// orb bez conic duge — crno jezgro + acid prsten; dva stanja (spremno/aktivna
// noć) + mono state label ispod orba. Locked stanje ne postoji u beti
// (geofence ne gate-uje orb), pa se ne renderuje.
export type OSScreen = 'grad' | 'ja';

export const OSOrbNav = ({ current, onGo, onOrb, live }: {
  current: OSScreen;
  onGo: (s: OSScreen) => void;
  onOrb: () => void;
  live: boolean;
}) => {
  const tab = (screen: OSScreen, label: string, icon: ReactNode) => {
    const on = current === screen;
    return (
      <button
        onClick={() => onGo(screen)}
        data-tour={screen}
        aria-label={label}
        aria-current={on ? 'page' : undefined}
        className="os-press"
        style={{
          flex: 1, minHeight: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
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
        position: 'relative', display: 'flex', alignItems: 'center', maxWidth: 520,
        margin: '0 10px calc(env(safe-area-inset-bottom) + 10px)', marginLeft: 'auto', marginRight: 'auto',
        width: 'calc(100% - 20px)',
        padding: '8px 12px 10px',
        background: 'rgba(5,5,6,.94)', backdropFilter: 'blur(18px)',
        border: `1px solid ${AB.line2}`, borderRadius: 24,
        boxShadow: '0 18px 44px -18px rgba(0,0,0,.85)',
        pointerEvents: 'auto',
      }}>
        {tab('grad', 'GRAD', <Building2 size={18} strokeWidth={1.8} />)}

        {/* ORB = TU SAM (§12) — crno jezgro, acid prsten; bez conic duge */}
        <div style={{ flex: 'none', width: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button
            onClick={onOrb}
            data-tour="orb"
            aria-label={live ? 'Noć je aktivna — otvori hub' : 'Tu sam — aktiviraj noć'}
            className="os-press"
            style={{
              position: 'relative', top: -20, width: 74, height: 74, borderRadius: '50%', cursor: 'pointer',
              border: `2px solid ${live ? AB.acid : AB.acidDim}`,
              background: 'radial-gradient(circle at 36% 30%, #101113, #050506 72%)',
              boxShadow: live
                ? `0 0 0 3px var(--ab-acid-soft), var(--ab-glow-acid), 0 14px 36px -10px rgba(0,0,0,.9)`
                : `0 0 14px rgba(199,255,33,.14), 0 14px 36px -10px rgba(0,0,0,.9)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'box-shadow .25s, border-color .25s',
            }}
          >
            {live && <span aria-hidden style={{ position: 'absolute', inset: 5, borderRadius: '50%', border: `1px solid var(--ab-acid-soft)`, animation: 'os-pulse 3.2s ease-in-out infinite' }} />}
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: live ? AB.acid : AB.ink, lineHeight: 1.3, textAlign: 'center' }}>
              TU<br />SAM
            </span>
          </button>
          <span style={{ position: 'relative', top: -18, fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: '.12em', color: live ? AB.acid : AB.ink3, whiteSpace: 'nowrap' }}>
            {live ? 'NOĆ JE AKTIVNA' : 'AKTIVIRAJ NOĆ'}
          </span>
        </div>

        {tab('ja', 'JA', <Heart size={18} strokeWidth={1.8} fill={current === 'ja' ? 'currentColor' : 'none'} />)}
      </div>
    </div>
  );
};
