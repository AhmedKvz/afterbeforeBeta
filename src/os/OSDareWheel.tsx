import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { incrementQuestProgress } from '@/services/questProgress';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from './osTheme';

/** ZAVRTI NOĆ — točak smelih misija. App te izaziva da živiš noć umesto da
 *  skroluješ. Sve misije su consent-aware i scene-safe (Z4); „odrađeno" gura
 *  postojeći quest progres (social/dance/story/explore) — nula nove ekonomije. */
const DARES: { text: string; type: string; emoji: string; col: string }[] = [
  { text: 'Pitaj nekog na šanku koja mu je pesma večeri — pa je zatraži od DJ-a.', type: 'social', emoji: '🎧', col: G.techno },
  { text: 'Nauči pokret od najboljeg plesača kog vidiš. Ne pitaj — kopiraj.', type: 'dance', emoji: '🕺', col: G.afterparty },
  { text: 'Iskra osobi koju si primetio/la još na ulazu.', type: 'social', emoji: '✨', col: G.underground },
  { text: 'Odvedi ekipu na podijum PRE nego što krene hit.', type: 'dance', emoji: '🔥', col: G.afterparty },
  { text: 'Izgubi telefon iz ruke na ceo jedan set. Ceo.', type: 'dance', emoji: '📵', col: G.festival },
  { text: 'Časti vodom nekoga ko đuska jače od tebe.', type: 'social', emoji: '💧', col: G.community },
  { text: 'Upiši satnicu ako je nema — budi izvor za ceo grad.', type: 'explore', emoji: '🕒', col: G.house },
  { text: 'Prvi/prva na podijumu kad se otvori. Da, sada.', type: 'dance', emoji: '🚀', col: G.afterparty },
  { text: 'Predstavi dvoje ljudi koji se ne znaju.', type: 'social', emoji: '🤝', col: G.community },
  { text: 'Pošalji „Idem" na mesto na kom nikad nisi bio/la.', type: 'explore', emoji: '🧭', col: G.house },
  { text: 'Snimi svitanje na afteru — ni sekund ranije.', type: 'story', emoji: '🌅', col: G.festival },
  { text: 'Pitaj najstariju osobu u klubu koja je bila najbolja žurka ikada ovde.', type: 'social', emoji: '📜', col: G.techno },
  { text: 'Ostani do kraja seta koji ne poznaješ — ceo, bez izlaska.', type: 'dance', emoji: '🎶', col: G.underground },
  { text: 'Napiši recenziju večeras dok ti je još u kostima — ne sutra.', type: 'review', emoji: '✍️', col: G.community },
  { text: 'Nađi osobu koja je došla sama i uvuci je u ekipu.', type: 'social', emoji: '🧑‍🤝‍🧑', col: G.community },
  { text: 'Zamoli DJ-a za JEDNU pesmu za nekog drugog — i reci mu za koga.', type: 'social', emoji: '🎁', col: G.underground },
];

export const OSDareWheel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'idle' | 'spin' | 'landed'>('idle');
  const [idx, setIdx] = useState(0);
  const [respins, setRespins] = useState(2);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const spin = () => {
    if (phase === 'spin') return;
    setPhase('spin');
    track('dare_spin', {});
    let ticks = 0;
    const target = 18 + Math.floor(Math.random() * DARES.length);
    timer.current = setInterval(() => {
      ticks++;
      setIdx((i) => (i + 1) % DARES.length);
      if (ticks >= target) {
        if (timer.current) clearInterval(timer.current);
        setPhase('landed');
      }
    }, 90);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const done = async () => {
    const d = DARES[idx];
    track('dare_done', { type: d.type });
    if (user) incrementQuestProgress(user.id, d.type).catch(() => {});
    toast.success('Legenda večeras 🖤 Quest progres upisan.');
    onClose();
  };

  const d = DARES[idx];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(5,5,7,.88)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={phase !== 'spin' ? onClose : undefined}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.26em', color: G.afterparty, marginBottom: 10 }}>🎲 ZAVRTI NOĆ</div>

        {phase === 'idle' && (
          <>
            <div style={{ fontSize: 46, marginBottom: 10 }}>🎲</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: OS.ink, letterSpacing: '-.02em' }}>Smeš li?</div>
            <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8, lineHeight: 1.55 }}>Jedna smela misija za večeras. Točak bira — ti izvodiš. Bez snimanja, bez izgovora.</div>
            <button onClick={spin} style={{ marginTop: 22, minHeight: 52, padding: '14px 40px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 16, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg,${G.afterparty},${G.underground})`, boxShadow: `0 14px 40px -10px ${hexA(G.afterparty, 0.6)}` }}>ZAVRTI</button>
          </>
        )}

        {phase !== 'idle' && (
          <div style={{ borderRadius: 20, border: `1px solid ${hexA(d.col, phase === 'landed' ? 0.55 : 0.25)}`, background: `radial-gradient(120% 100% at 50% 0%, ${hexA(d.col, 0.14)}, transparent 60%), ${OS.surface}`, padding: '30px 22px', transition: 'border-color .2s', boxShadow: phase === 'landed' ? `0 0 60px -20px ${hexA(d.col, 0.7)}` : 'none' }}>
            <div style={{ fontSize: 40, marginBottom: 12, filter: phase === 'spin' ? 'blur(1px)' : 'none' }}>{d.emoji}</div>
            <div style={{ fontSize: 17.5, fontWeight: 700, color: OS.ink, lineHeight: 1.45, minHeight: 76, opacity: phase === 'spin' ? 0.55 : 1 }}>{d.text}</div>
            {phase === 'landed' && (
              <>
                <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
                  <button onClick={done} style={{ flex: 1, minHeight: 46, borderRadius: 13, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14.5, background: d.col, color: '#0B0B0D' }}>ODRAĐENO ✓</button>
                  {respins > 0 && (
                    <button onClick={() => { setRespins((r) => r - 1); spin(); }} style={{ flex: 'none', minHeight: 46, padding: '0 16px', borderRadius: 13, border: `1px solid ${OS.line2}`, cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: OS.ink4, background: 'transparent' }}>PREJAKO · {respins}</button>
                  )}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: OS.ink6, marginTop: 12 }}>ODRAĐENO GURA TVOJ QUEST PROGRES · NA REČ — SCENA VERUJE SVOJIMA</div>
              </>
            )}
          </div>
        )}

        <button onClick={onClose} style={{ marginTop: 18, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', color: OS.ink5 }}>MOŽDA SLEDEĆI VIKEND</button>
      </div>
    </div>
  );
};
