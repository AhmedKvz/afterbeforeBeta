import { OSMatches } from './screens/OSMatches';
import { useExit } from './useExit';
import { AB, MONO } from './osTheme';

/**
 * PORUKE van noći. IA v2 je poruke smestio u hub večeri (koji traži check-in),
 * ali LJUDI radi cele nedelje — ko se upozna u utorak mora da otvori nit i bez
 * izlaska. Isti sadržaj kao u hubu (OSMatches embedded), samo svoj okvir.
 */
export const OSMessagesOverlay = ({ onClose }: { onClose: () => void }) => {
  const { closing, close } = useExit(onClose);
  return (
    <div
      className="os-scroll"
      style={{
        position: 'fixed', inset: 0, zIndex: 95, background: AB.void, overflowY: 'auto',
        paddingBottom: 40,
        animation: closing ? 'os-overlay-out .15s ease forwards' : 'os-overlay-in .2s cubic-bezier(.16,1,.3,1)',
      }}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'oklch(0.135 0.012 285 / 0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${AB.line}`, padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 }}>PORUKE · ISKRE</div>
          <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: AB.ink, marginTop: 3 }}>Tvoji ljudi</div>
        </div>
        <button onClick={close} className="os-press" aria-label="Zatvori" style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', border: `1px solid ${AB.line2}`, cursor: 'pointer', background: 'transparent', color: AB.ink2, fontSize: 15 }}>✕</button>
      </div>

      <OSMatches embedded />
    </div>
  );
};
