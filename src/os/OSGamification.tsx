import { useState } from 'react';
import { toast } from 'sonner';
import { useConvergences, useClaimConvergence, useIrlStreaks, useCipher, useCipherSubmit } from '@/hooks/useGamification';
import { AB, G, hexA, MONO } from './osTheme';

const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const MTAG = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em' } as const;

const ERR: Record<string, string> = {
  CHECKIN_REQUIRED: 'Moraš biti tu — čekiraj se pa uzmi.',
  FULL: 'Popunjeno. Sledeći put brže. 🏃',
  ALREADY: 'Već si uzeo/la ovo.',
  DROP_NOT_LIVE: 'Nije aktivno u ovom trenutku.',
  TOO_MANY: 'Dosta pokušaja za večeras.',
  NO_CIPHER: 'Večeras nema šifre.',
  DISABLED: 'Isključeno.',
};
const errMsg = (e: any) => {
  const m = String(e?.message || '');
  const k = Object.keys(ERR).find((x) => m.includes(x));
  return k ? ERR[k] : 'Nije prošlo — pokušaj ponovo.';
};

const hhmm = (iso: string) => { try { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };

/* ══ M2 · KONVERGENCIJA — kartica na GRAD ekranu (najava) ══ */
export const ConvergenceRail = () => {
  const { data: drops = [] } = useConvergences();
  if (!drops.length) return null;
  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div style={{ ...LABEL, color: AB.hot, marginBottom: 12 }}>⚡ KONVERGENCIJA · DOĐI I UZMI</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {drops.map((d) => {
          const left = Math.max(0, d.capacity - d.claimed);
          return (
            <div key={d.id} style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${d.is_live ? hexA(G.festival, 0.55) : AB.line2}`, borderLeft: `3px solid ${G.festival}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ ...MTAG, fontSize: 10, letterSpacing: '.1em', color: G.festival }}>{d.venue_name.toUpperCase()} · {hhmm(d.starts_at)}</span>
                <span style={{ ...MTAG, fontSize: 10, color: d.is_live ? AB.acid : AB.ink3 }}>{d.is_live ? `LIVE · ${left} OSTALO` : `PRVIH ${d.capacity}`}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', color: AB.ink, marginTop: 5 }}>{d.title}</div>
              <div style={{ display: 'inline-block', ...MTAG, fontSize: 10, letterSpacing: '.1em', color: G.festival, background: hexA(G.festival, 0.1), borderRadius: 999, padding: '3px 9px', marginTop: 8 }}>→ {d.reward_label}</div>
              {d.my_claimed && <div style={{ ...MTAG, fontSize: 10, color: AB.acid, marginTop: 8 }}>✓ TVOJE JE</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══ M2 · claim — u HUBU VEČERI (samo drop na mestu gde si) ══ */
export const ConvergenceClaim = ({ venueId }: { venueId: string }) => {
  const { data: drops = [] } = useConvergences();
  const claim = useClaimConvergence();
  const mine = drops.filter((d) => d.venue_id === venueId && d.is_live);
  if (!mine.length) return null;
  return (
    <div style={{ padding: '12px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {mine.map((d) => {
        const left = Math.max(0, d.capacity - d.claimed);
        return (
          <div key={d.id} style={{ padding: 14, borderRadius: 16, background: hexA(G.festival, 0.1), border: `1px solid ${hexA(G.festival, 0.55)}` }}>
            <div style={{ ...LABEL, color: G.festival }}>⚡ SADA OVDE · {left} OD {d.capacity}</div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', color: AB.ink, marginTop: 5 }}>{d.title}</div>
            <div style={{ fontSize: 13, color: AB.ink2, marginTop: 3 }}>{d.reward_label}</div>
            <button
              onClick={() => claim.mutate(d.id, {
                onSuccess: (r: any) => toast.success(`Tvoje je! #${r.position} od ${r.capacity} · +${r.afc} AFC`),
                onError: (e) => toast.error(errMsg(e)),
              })}
              disabled={d.my_claimed || claim.isPending || left === 0}
              className="os-press"
              style={{ width: '100%', marginTop: 12, minHeight: 46, borderRadius: 999, border: 0, cursor: d.my_claimed ? 'default' : 'pointer', fontSize: 15, fontWeight: 700, background: d.my_claimed ? AB.raised : G.festival, color: d.my_claimed ? AB.ink3 : '#0B0B0D' }}
            >
              {d.my_claimed ? 'Uzeto ✓' : left === 0 ? 'Popunjeno' : 'PREUZMI'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ══ M1 · IRL STREAK — tvoji ljudi (hub + profil) ══ */
export const IrlStreaks = ({ compact }: { compact?: boolean }) => {
  const { data: streaks = [] } = useIrlStreaks();
  if (!streaks.length) return null;
  const list = compact ? streaks.slice(0, 3) : streaks;
  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div style={{ ...LABEL, marginBottom: 12 }}>🔥 TVOJI LJUDI · ZAJEDNIČKE NOĆI</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {list.map((s) => (
          <div key={s.partner_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 16, background: AB.surface, border: `1px solid ${s.together_tonight ? hexA(G.afterparty, 0.5) : AB.line}` }}>
            <span style={{ flex: 'none', width: 38, height: 38, borderRadius: '50%', background: s.partner_avatar ? `center/cover url(${s.partner_avatar})` : `linear-gradient(135deg,${G.afterparty},${G.underground})` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{s.partner_name}</div>
              <div style={{ ...MTAG, fontSize: 10, color: AB.ink3, marginTop: 2 }}>
                {s.last_venue ? `${s.last_venue.toUpperCase()} · ` : ''}{s.together_tonight ? 'VEČERAS ZAJEDNO ✓' : 'POSLEDNJI PUT'}
              </div>
            </div>
            <div style={{ flex: 'none', textAlign: 'right' }}>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, color: G.afterparty }}>🔥{s.streak_weeks}</div>
              <div style={{ ...MTAG, fontSize: 9, color: AB.ink3 }}>{s.streak_weeks === 1 ? 'NEDELJA' : 'NEDELJE'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══ M3 · GRADSKA ŠIFRA — kartica (GRAD) + rešavanje (hub) ══ */
export const CityCipherCard = ({ solvable }: { solvable?: boolean }) => {
  const { data: c } = useCipher();
  const submit = useCipherSubmit();
  const [guess, setGuess] = useState('');
  if (!c?.active) return null;

  const collected = c.collected || [];
  const total = c.total || 0;

  return (
    <div style={{ padding: '22px 18px 0' }}>
      <div style={{ padding: 16, borderRadius: 16, background: AB.surface, border: `1px solid ${c.completed ? AB.acidDim : AB.uvDim}` }}>
        <div style={{ ...LABEL, color: c.completed ? AB.acid : AB.uv }}>🔐 GRADSKA ŠIFRA · VEČERAS</div>
        {c.completed ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', color: AB.ink, marginTop: 6 }}>Sastavljena ✓</div>
            <div style={{ fontSize: 13, color: AB.ink2, marginTop: 4 }}>Grad je večeras rekao svoje. +{c.reward_afc} AFC.</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', color: AB.ink, marginTop: 6 }}>{collected.length} / {total} fragmenata</div>
            <div style={{ fontSize: 13, color: AB.ink2, marginTop: 4 }}>
              {collected.length === 0
                ? 'Reči čekaju po gradu. Ko se kreće — sastavlja. Ekipa deli fragmente.'
                : 'Fale ti reči sa mesta na kojima večeras nisi bio/la. Podeli se sa ekipom.'}
            </div>
            {collected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                {collected.map((f, i) => (
                  <span key={i} style={{ ...MTAG, fontSize: 12, color: AB.ink, background: AB.raised, border: `1px solid ${AB.line2}`, borderRadius: 999, padding: '6px 12px' }}>„{f.word}"</span>
                ))}
              </div>
            )}
            {solvable && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Cela fraza…" aria-label="Gradska šifra"
                  style={{ flex: 1, background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 999, padding: '11px 16px', fontSize: 14, color: AB.ink, outline: 'none' }}
                />
                <button
                  onClick={() => submit.mutate(guess, {
                    onSuccess: (r: any) => { if (r?.ok) { toast.success(`„${r.phrase}" ✓ +${r.afc} AFC`); setGuess(''); } else toast(`Nije to. Još ${r?.attempts_left ?? 0} pokušaja.`); },
                    onError: (e) => toast.error(errMsg(e)),
                  })}
                  disabled={!guess.trim() || submit.isPending}
                  className="os-press"
                  style={{ flex: 'none', minHeight: 44, padding: '0 20px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, background: AB.uv, color: '#fff' }}
                >Probaj</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
