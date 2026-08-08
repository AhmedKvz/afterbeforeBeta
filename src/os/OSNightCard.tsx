import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NightCard } from '@/hooks/useNightCard';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { AB, MONO } from './osTheme';
import { useExit } from './useExit';

const db = supabase as any;
const LABEL: React.CSSProperties = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: AB.ink3, fontWeight: 600 };

const hm = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
};
const NIGHT_FMT = new Intl.DateTimeFormat('sr-Latn', { weekday: 'short', day: 'numeric', month: 'short' });

type Cmp = { friend: string; me: any; them: any } | null;

/**
 * PLESNA KARTICA — organski sadržaj posle noći. Trajanje + ruta + ples
 * (+ koraci kad ih native upiše), poređenje sa prijateljem po imenu, i
 * izvoz kao slika za IG/TikTok („I danced this much — let's try it out").
 * Iskren-broj: koraci se NE prikazuju dok ih pedometar stvarno ne izmeri.
 */
export const OSNightCard = ({ card, onClose }: { card: NightCard; onClose: () => void }) => {
  const { closing, close } = useExit(onClose);
  const [name, setName] = useState('');
  const [cmp, setCmp] = useState<Cmp>(null);
  const [busy, setBusy] = useState(false);
  const shown = useRef(false);
  if (!shown.current) { shown.current = true; track('night_card_shown', { night: card.night, venues: card.venues.length }); }

  const compare = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const { data, error } = await db.rpc('compare_night', { p_name: name.trim(), p_night: card.night });
      if (error) {
        const msg = String(error.message || '');
        toast(msg.includes('NO_SUCH_USER') ? 'Nema nikog sa tim imenom.' : msg.includes('NO_NIGHT') ? `${name.trim()} nije izlazio/la te noći.` : 'Nije prošlo — pokušaj ponovo.');
        return;
      }
      setCmp(data);
      track('night_card_compare', { night: card.night });
    } finally { setBusy(false); }
  };

  // Share = canvas slika (1080×1350, IG portret) — void pozadina, acid brojka.
  const share = async () => {
    track('night_card_shared', { night: card.night, compared: !!cmp });
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1350;
    const x = cv.getContext('2d')!;
    x.fillStyle = '#050506'; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = '#8e9298'; x.font = '600 34px ui-monospace, monospace';
    x.fillText(NIGHT_FMT.format(new Date(card.night + 'T12:00:00')).toUpperCase() + ' · BEOGRAD', 80, 140);
    x.fillStyle = '#c7ff21'; x.font = '900 200px system-ui';
    x.fillText(card.steps != null ? String(card.steps) : hm(card.duration_min), 80, 420);
    x.fillStyle = '#f4f3ee'; x.font = '800 52px system-ui';
    x.fillText(card.steps != null ? 'koraka na podijumu' : 'u noći', 80, 500);
    x.fillStyle = '#c5c6c8'; x.font = '600 40px system-ui';
    x.fillText(card.venues.join(' → ').slice(0, 44), 80, 600);
    x.fillText(`${card.from} → ${card.to}${card.dance_s > 0 ? ` · ${Math.round(card.dance_s / 60)}min plesa` : ''}`, 80, 665);
    if (cmp) {
      x.fillStyle = '#a15cff'; x.font = '800 44px system-ui';
      const mv = card.steps != null ? `${cmp.me.steps ?? '?'} vs ${cmp.them.steps ?? '?'} koraka` : `${hm(cmp.me.duration_min)} vs ${hm(cmp.them.duration_min)}`;
      x.fillText(`ja vs ${cmp.friend}: ${mv}`, 80, 790);
    }
    x.fillStyle = '#c7ff21'; x.font = '900 56px system-ui';
    x.fillText('I danced this much.', 80, 1150);
    x.fillStyle = '#f4f3ee'; x.fillText("Let's try it out →", 80, 1220);
    x.fillStyle = '#8e9298'; x.font = '700 36px ui-monospace, monospace';
    x.fillText('AFTERBEFORE · afterbefore.rs', 80, 1290);

    const blob: Blob = await new Promise((res) => cv.toBlob((b) => res(b!), 'image/png'));
    const file = new File([blob], `afterbefore-noc-${card.night}.png`, { type: 'image/png' });
    if ((navigator as any).canShare?.({ files: [file] })) {
      try { await (navigator as any).share({ files: [file], title: 'AfterBefore — moja noć' }); return; } catch { /* korisnik odustao */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Slika sačuvana — spremna za story.');
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(5,5,7,.88)', animation: closing ? 'os-scrim-out .15s ease forwards' : 'os-scrim .25s ease' }} />
      <div className="os-scroll" style={{ position: 'fixed', inset: 0, zIndex: 81, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, animation: closing ? 'os-sheet-out .15s ease forwards' : 'os-sheet .45s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 24, background: AB.surface, border: `1px solid ${AB.line2}`, padding: 24, position: 'relative' }}>
          <button onClick={close} aria-label="Zatvori" className="os-press" style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: 0, background: AB.raised, color: AB.ink2, cursor: 'pointer' }}>✕</button>

          <div style={LABEL}>{NIGHT_FMT.format(new Date(card.night + 'T12:00:00')).toUpperCase()} · TVOJA NOĆ</div>

          {/* hero brojka: koraci ako postoje (native), inače trajanje */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 58, letterSpacing: '-.04em', color: AB.acid, lineHeight: 1 }}>
              {card.steps != null ? card.steps.toLocaleString('sr-Latn') : hm(card.duration_min)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, marginTop: 6 }}>
              {card.steps != null ? 'koraka na podijumu' : 'u noći'}
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 15, fontWeight: 700 }}>{card.venues.join(' → ')}</div>
          <div style={{ ...LABEL, marginTop: 6 }}>
            {card.from} → {card.to}
            {card.dance_s > 0 ? ` · ${Math.round(card.dance_s / 60)} MIN PLESA` : ''}
            {card.checkins > 1 ? ` · ${card.checkins} MESTA` : ''}
          </div>
          {card.steps == null && (
            <div style={{ ...LABEL, marginTop: 10, opacity: 0.6 }}>KORACI STIŽU SA NATIVE APLIKACIJOM</div>
          )}

          {/* poređenje */}
          <div style={{ marginTop: 20, padding: 14, borderRadius: 16, background: AB.raised, border: `1px solid ${AB.line}` }}>
            {cmp ? (
              <div>
                <div style={LABEL}>TI vs {cmp.friend.toUpperCase()}</div>
                <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
                  {[['TI', cmp.me], [cmp.friend, cmp.them]].map(([label, s]: any) => (
                    <div key={label} style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 24, color: AB.acid }}>{s.steps != null ? s.steps.toLocaleString('sr-Latn') : hm(s.duration_min)}</div>
                      <div style={{ ...LABEL, marginTop: 3 }}>{String(label).toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && compare()}
                  placeholder="Ime prijatelja iz app-a" style={{ flex: 1, minWidth: 0, background: AB.surface, border: `1px solid ${AB.line2}`, borderRadius: 12, padding: '11px 13px', color: AB.ink, fontSize: 14 }} />
                <button onClick={compare} disabled={busy || !name.trim()} className="os-press" style={{ flex: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, padding: '0 16px', borderRadius: 12, border: `1px solid ${AB.line2}`, background: 'transparent', color: AB.ink2 }}>{busy ? '…' : 'Uporedi'}</button>
              </div>
            )}
          </div>

          <button onClick={share} className="os-press" style={{ width: '100%', marginTop: 14, minHeight: 50, borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 15.5, fontWeight: 800, background: AB.acid, color: AB.acidInk }}>
            Podeli noć ↗
          </button>
        </div>
      </div>
    </>
  );
};
