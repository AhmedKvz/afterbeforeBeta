import { useState } from 'react';
import { G, OS, hexA, MONO, CONIC } from './osTheme';

export type OSScreen = 'home' | 'explore' | 'matches' | 'quests' | 'profile';

const NAV: { screen: OSScreen; label: string; col: string }[] = [
  { screen: 'home', label: 'HOME', col: G.community },
  { screen: 'explore', label: 'HEAT', col: G.techno },
  { screen: 'matches', label: 'CHAT', col: G.afterparty },
  { screen: 'quests', label: 'QUEST', col: G.underground },
  { screen: 'profile', label: 'PROFILE', col: G.house },
];

const LABELS: Record<OSScreen, string> = {
  home: 'HOME · DISCOVERY',
  explore: 'HEAT · CITY PULSE',
  matches: 'CHAT · MESSAGES',
  quests: 'WEEKLY QUESTS',
  profile: 'PROFILE',
};

/** Orb radial navigation — a central core that fans out into the 5 screens. */
export const OSOrbNav = ({ current, onGo }: { current: OSScreen; onGo: (s: OSScreen) => void }) => {
  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useState(() => { try { return !!localStorage.getItem('os_orb_hint'); } catch { return true; } });
  const N = NAV.length;
  const radius = 120;
  const activeColor = NAV.find((n) => n.screen === current)?.col || G.community;

  const toggle = () => {
    setOpen((o) => !o);
    if (!hintSeen) { try { localStorage.setItem('os_orb_hint', '1'); } catch { /* ignore */ } setHintSeen(true); }
  };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 170, zIndex: 70, pointerEvents: 'none' }}>
      {/* backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(7,7,8,.62)', backdropFilter: 'blur(2px)', transition: 'opacity .35s', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      {/* fan items */}
      <div style={{ position: 'absolute', left: '50%', bottom: 50, width: 0, height: 0 }}>
        {NAV.map((o, i) => {
          const ang = Math.PI + (i / (N - 1)) * Math.PI;
          const dx = Math.cos(ang) * radius;
          const dy = Math.sin(ang) * radius;
          return (
            <button
              key={o.screen}
              onClick={() => { onGo(o.screen); setOpen(false); }}
              style={{
                position: 'absolute', left: 0, top: 0, width: 62, height: 62, margin: -31, borderRadius: '50%', cursor: 'pointer',
                border: `1px solid ${hexA(o.col, 0.45)}`, background: 'rgba(19,20,23,.82)', backdropFilter: 'blur(14px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                transform: open ? `translate(${dx - 31}px,${dy - 31}px) scale(1)` : 'translate(-31px,-31px) scale(.2)',
                opacity: open ? 1 : 0, transition: 'transform .42s cubic-bezier(.34,1.56,.64,1), opacity .3s', pointerEvents: open ? 'auto' : 'none',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.col, boxShadow: current === o.screen ? `0 0 10px ${o.col}` : 'none' }} />
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', color: current === o.screen ? OS.ink : OS.ink3 }}>{o.label}</span>
            </button>
          );
        })}
      </div>
      {/* first-run hint */}
      {!hintSeen && !open && (
        <div style={{ position: 'absolute', bottom: 122, left: '50%', transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: 999, background: hexA(activeColor, 0.16), border: `1px solid ${hexA(activeColor, 0.5)}`, fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: OS.ink, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          ↑ TAPNI ZA NAVIGACIJU
        </div>
      )}
      {/* core — ring tints to the active screen so you know where you are */}
      <button
        onClick={toggle}
        aria-label="Navigacija"
        style={{
          position: 'absolute', left: '50%', bottom: 50, transform: `translate(-50%,50%) ${open ? 'rotate(45deg)' : ''}`,
          width: 66, height: 66, borderRadius: '50%', cursor: 'pointer', pointerEvents: 'auto', border: `1px solid ${hexA(activeColor, 0.4)}`,
          background: 'radial-gradient(circle at 38% 32%, #2a2c33, #0e0e11)',
          boxShadow: `0 0 0 1.5px ${hexA(activeColor, open ? 0.2 : 0.55)}, 0 0 22px ${hexA(activeColor, open ? 0.12 : 0.3)}, 0 14px 40px -8px rgba(0,0,0,.9), inset 0 0 18px ${hexA(activeColor, 0.18)}`,
          transition: 'transform .4s cubic-bezier(.34,1.56,.64,1), box-shadow .4s, border-color .4s', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: CONIC, transition: 'transform .4s', transform: open ? 'scale(.7) rotate(180deg)' : 'scale(1)', boxShadow: `0 0 16px ${hexA(activeColor, 0.45)}` }} />
      </button>
      <div style={{ position: 'absolute', bottom: 15, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: hexA(activeColor, 0.9), pointerEvents: 'none' }}>{LABELS[current] || ''}</div>
    </div>
  );
};
