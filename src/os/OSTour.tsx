import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { AB, MONO } from './osTheme';

const KEY = 'ab-tour-done';

/**
 * VODIČ ZA PRVI ULAZAK (founder 2026-08-08): tri koraka, dugme po dugme —
 * GRAD → orb (aktiviraj noć) → JA. Spotlight preko nav dugmadi, „Dalje",
 * jednom po korisniku (localStorage). Ne otvara ekrane — pokazuje gde su,
 * korisnik posle sam klikće (učenje radnjom, ne čitanjem).
 */
const STEPS = [
  {
    target: '[data-tour="grad"]',
    title: 'GRAD',
    text: 'Ovde živi večeras: lista i karta događaja, misije, ljudi i scena. Odavde biraš gde se izlazi.',
  },
  {
    target: '[data-tour="orb"]',
    title: 'TU SAM',
    text: 'Kad stigneš — jedan tap i noć počinje: poeni, ekipa, sve. A ako si ranije označio „Idem", prijaviće te sam čim stigneš.',
  },
  {
    target: '[data-tour="ja"]',
    title: 'JA',
    text: 'Tvoj pasoš noći. Svaki izlazak se upiše sam — ruta, pečati, ekipa. Ne moraš ništa da kucaš.',
  },
];

export const shouldShowTour = () => {
  try { return !localStorage.getItem(KEY); } catch { return false; }
};

export const OSTour = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => { track('tour_started', {}); }, []);

  // prati poziciju mete (resize/rotacija) — meta je uvek u fiksiranom navu
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(STEPS[step].target);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 250); // sačekaj nav animaciju na mountu
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [step]);

  const finish = (how: 'done' | 'skip') => {
    try { localStorage.setItem(KEY, '1'); } catch { /* noop */ }
    track(how === 'done' ? 'tour_done' : 'tour_skipped', { step });
    onDone();
  };
  const next = () => {
    if (step >= STEPS.length - 1) { finish('done'); return; }
    track('tour_step', { step: step + 1 });
    setStep(step + 1);
  };

  if (!rect) return null;
  const s = STEPS[step];
  const pad = 8;
  // kartica iznad mete (nav je na dnu ekrana)
  const cardBottom = window.innerHeight - rect.top + 18;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
      {/* spotlight: rupa preko mete, sve ostalo zatamnjeno (box-shadow trik) */}
      <div style={{
        position: 'absolute', left: rect.left - pad, top: rect.top - pad,
        width: rect.width + pad * 2, height: rect.height + pad * 2,
        borderRadius: s.title === 'TU SAM' ? '50%' : 18,
        boxShadow: '0 0 0 9999px rgba(5,5,7,.82)',
        border: `2px solid ${AB.acid}`,
        transition: 'all .3s cubic-bezier(.22,1,.36,1)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: cardBottom,
        maxWidth: 420, margin: '0 auto',
        background: AB.surface, border: `1px solid ${AB.line2}`, borderRadius: 20,
        padding: 18, boxShadow: '0 18px 44px -12px rgba(0,0,0,.9)',
        animation: 'os-sheet .35s cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.16em', fontWeight: 700, color: AB.acid }}>
            {step + 1} / {STEPS.length} · {s.title}
          </span>
          <button onClick={() => finish('skip')} style={{ background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em', color: AB.ink3, padding: 4 }}>
            PRESKOČI
          </button>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: AB.ink, margin: '10px 0 0' }}>{s.text}</p>
        <button onClick={next} className="os-press" style={{ width: '100%', marginTop: 14, minHeight: 46, borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14.5, fontWeight: 800, background: AB.acid, color: AB.acidInk }}>
          {step >= STEPS.length - 1 ? 'Kreni →' : 'Dalje'}
        </button>
      </div>
    </div>
  );
};
