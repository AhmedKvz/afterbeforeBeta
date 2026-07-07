import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { OS, G, hexA, MONO } from './osTheme';

interface Props { otherName?: string | null; otherAvatar?: string | null; onClose: () => void; onOpenChat?: () => void }

const Av = ({ name, avatar, size = 84 }: { name?: string | null; avatar?: string | null; size?: number }) =>
  avatar
    ? <img src={avatar} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${OS.bgDeep}` }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: size * 0.34, border: `2px solid ${OS.bgDeep}`, background: avatarGradient(hueFromString(name || 'x')) }}>{initials(name || '·')}</div>;

/** The MATCH moment — a mutual spark deserves a beat, not a silent toast. */
export const OSMatchCelebration = ({ otherName, otherAvatar, onClose, onOpenChat }: Props) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: `radial-gradient(120% 80% at 50% 30%, ${hexA(G.afterparty, 0.22)}, ${OS.bgDeep} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.3em', color: G.afterparty, marginBottom: 20, animation: 'os-pulse 1.6s ease-in-out infinite' }}>✨ ISKRA JE UZAJAMNA ✨</div>

    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
      <div style={{ marginRight: -18 }}><Av name="Ti" avatar={null} /></div>
      <div style={{ marginLeft: -18 }}><Av name={otherName} avatar={otherAvatar} /></div>
    </div>

    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: OS.ink }}>MATCH</div>
    <div style={{ fontSize: 15, color: OS.ink3, marginTop: 8, textAlign: 'center', maxWidth: 280, lineHeight: 1.4 }}>
      Ti i {otherName || 'neko'} ste se povezali večeras. Prozor je otvoren — piši dok noć traje.
    </div>

    <button onClick={onOpenChat || onClose} style={{ marginTop: 28, width: '100%', maxWidth: 300, padding: 15, borderRadius: 15, border: 0, cursor: 'pointer', background: G.afterparty, color: '#0B0B0D', fontWeight: 700, fontSize: 15 }}>
      Otvori poruke →
    </button>
    <button onClick={onClose} style={{ marginTop: 12, background: 'transparent', border: 0, cursor: 'pointer', color: OS.ink5, fontSize: 13 }}>Kasnije</button>
  </div>
);
