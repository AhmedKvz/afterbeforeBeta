import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useMeetDeck, useMeetSwipe, useMeetOptIn, MeetMode, MeetCard } from '@/hooks/useMeet';
import { useMyReferral } from '@/hooks/useReferral';
import { useMyNight } from '@/hooks/useMyNight';
import { track } from '@/lib/analytics';
import { OSMatchCelebration } from './OSMatchCelebration';
import { OSCrew } from './OSCrew';
import { OSGroups } from './OSGroups';
import { AB, G, hexA, MONO, genreCol, CONIC } from './osTheme';

const APP_URL = 'https://ahmedkvz.github.io/afterbeforeBeta/app/';
const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];

const ERR: Record<string, string> = {
  LIMIT_REACHED: 'Dosta za danas — nastavi sutra.',
  TARGET_CLOSED: 'Ta osoba se u međuvremenu isključila.',
  BLOCKED: 'Nije moguće.',
  DISABLED: 'Trenutno nedostupno.',
};
const errMsg = (e: any) => {
  const m = String(e?.message || '');
  const k = Object.keys(ERR).find((x) => m.includes(x));
  return k ? ERR[k] : 'Nije prošlo — pokušaj ponovo.';
};

const nightLabel = (iso: string) => {
  try { const d = new Date(iso); return `${d.getDate()}. ${MON[d.getMonth()]}`; } catch { return ''; }
};

/**
 * LJUDI (HANDOFF-LJUDI): upoznavanje odvojeno od check-ina — radi cele nedelje.
 * Kartica je PASOŠ, ne selfie: prava mesta, prave noći, i co-presence signal
 * („bili ste iste noći u X") koji nijedna dating aplikacija ne može da ima.
 * Sve besplatno — nema boost/premium/„ko te lajkovao".
 */
export const OSMeet = () => {
  const [mode, setMode] = useState<MeetMode | 'grupe'>('grupe');
  const [i, setI] = useState(0);
  const [match, setMatch] = useState<{ name?: string; avatar?: string } | null>(null);
  const [crewOpen, setCrewOpen] = useState(false);
  const opt = useMeetOptIn();
  const optedIn = mode === 'dates' ? opt.dates : mode === 'crew' ? opt.crew : true;
  const { data: deck = [], isLoading, error } = useMeetDeck(mode === 'grupe' ? 'dates' : mode, optedIn && mode !== 'grupe');
  const swipe = useMeetSwipe();
  const { data: referral } = useMyReferral();
  const { data: night } = useMyNight();

  useEffect(() => { setI(0); }, [mode]);

  const disabled = String((error as any)?.message || '').includes('DISABLED');
  const card: MeetCard | undefined = deck[i];

  const act = (like: boolean) => {
    if (!card || swipe.isPending) return;
    track('meet_swipe', { mode, like });
    swipe.mutate({ to: card.user_id, mode: mode as MeetMode, like }, {
      onSuccess: (res) => {
        if (res?.matched) setMatch({ name: res.partner?.name, avatar: res.partner?.avatar || undefined });
        setI((n) => n + 1);
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  const share = async () => {
    const code = referral?.code;
    const url = code ? `${APP_URL}#/?ref=${code}` : APP_URL;
    const text = 'Uđi u AfterBefore — Nightlife OS za Beograd.';
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: 'AfterBefore', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast.success('Link kopiran ✓'); }
    } catch { /* otkazano */ }
  };

  const modePill = (m: MeetMode | 'grupe', label: string) => {
    const on = mode === m;
    return (
      <button key={m} onClick={() => setMode(m)} className="os-press" style={{ flex: '1 0 auto', minWidth: 96, padding: '0 14px', minHeight: 42, borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: on ? 700 : 500, border: `1px solid ${on ? AB.uv : AB.line}`, background: on ? 'oklch(0.62 0.25 300 / 0.16)' : AB.surface, color: on ? AB.ink : AB.ink3 }}>{label}</button>
    );
  };

  if (disabled) {
    return (
      <div style={{ padding: '40px 18px', textAlign: 'center' }}>
        <div style={LABEL}>USKORO</div>
        <div style={{ fontSize: 14, color: AB.ink2, marginTop: 8 }}>Upoznavanje se sprema. Vidimo se napolju.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0 0' }}>
      <div className="os-scroll" style={{ display: 'flex', gap: 8, padding: '0 18px 14px', overflowX: 'auto' }}>
        {modePill('grupe', 'Grupe')}
        {modePill('dates', '1 na 1')}
      </div>

      {mode === 'grupe' && <OSGroups />}

      {/* opt-in — default OFF, gasi se jednim tapom */}
      {mode !== 'grupe' && (!optedIn ? (
        <div style={{ padding: '0 18px' }}>
          <div style={{ padding: 16, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}` }}>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', color: AB.ink }}>
              {mode === 'dates' ? 'Upoznaj nekoga sa scene' : 'Nađi s kim se izlazi'}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: AB.ink2, marginTop: 6 }}>
              {mode === 'dates'
                ? 'Ne piše ko si po selfiju — piše po tome gde si bio/la. Vidiš ljude sa iste scene, i ko je bio na istim noćima kao ti.'
                : 'Ekipa se pravi pre izlaska. Nađi ljude koji izlaze kad i ti, pa se dogovorite za petak.'}
            </div>
            <div style={{ ...LABEL, marginTop: 12, lineHeight: 1.6 }}>
              VIDLJIV/A SI SAMO ONIMA KOJI SU SE ISTO UKLJUČILI.<br />ISKLJUČI KAD HOĆEŠ.
            </div>
            <button
              onClick={() => opt.set({ mode: mode as MeetMode, on: true })}
              disabled={opt.isPending}
              className="os-press"
              style={{ width: '100%', marginTop: 14, minHeight: 48, borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 15, fontWeight: 700, background: AB.acid, color: AB.acidInk }}
            >
              {opt.isPending ? '…' : 'Uključi me'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ekipa: tihi ulaz u postojeći „Nađi ekipu" kad si napolju */}
          {mode === 'crew' && night && (
            <div style={{ padding: '0 18px 12px' }}>
              <button onClick={() => setCrewOpen(true)} className="os-press" style={{ width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 14, cursor: 'pointer', background: hexA(G.community, 0.09), border: `1px solid ${hexA(G.community, 0.4)}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🧑‍🤝‍🧑</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: AB.ink }}>Večeras si u {night.venueName} — nađi ekipu odmah</span>
                <span style={{ color: G.community }}>›</span>
              </button>
            </div>
          )}

          {isLoading && <div style={{ ...LABEL, textAlign: 'center', padding: '40px 0' }}>UČITAVA…</div>}

          {!isLoading && !card && (
            <div style={{ padding: '30px 18px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: AB.ink }}>To je cela scena za sada.</div>
              <div style={{ fontSize: 13.5, color: AB.ink2, marginTop: 6 }}>Pozovi ekipu — deck raste sa scenom.</div>
              <button onClick={share} className="os-press" style={{ marginTop: 14, minHeight: 46, padding: '12px 22px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 14.5, fontWeight: 700, background: G.afterparty, color: '#0B0B0D' }}>Pozovi ekipu</button>
            </div>
          )}

          {card && (
            <div key={card.user_id} style={{ padding: '0 18px', animation: 'os-swap .18s cubic-bezier(.22,1,.36,1) both' }}>
              <div style={{ borderRadius: 22, overflow: 'hidden', background: AB.surface, border: `1px solid ${AB.line2}` }}>
                {/* hero — cover ili žanr gradijent (nikad prazna rupa) */}
                <div style={{ position: 'relative', height: 260, background: card.cover_url ? `center/cover url(${card.cover_url})` : card.avatar_url ? `center/cover url(${card.avatar_url})` : `linear-gradient(160deg, ${hexA(card.music_preferences?.[0] ? genreCol(card.music_preferences[0]) : G.underground, 0.3)}, #0e0f12 76%)` }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.175 0.015 285) 4%, oklch(0.175 0.015 285 / 0.25) 42%, transparent 68%)' }} />
                  {!card.cover_url && !card.avatar_url && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 76, height: 76, borderRadius: '50%', background: CONIC, opacity: 0.5 }} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: AB.ink, textShadow: '0 2px 14px rgba(0,0,0,.6)' }}>{card.display_name}</div>
                    <div style={{ ...LABEL, marginTop: 3 }}>{(card.city || 'BEOGRAD').toUpperCase()}{card.nights > 0 ? ` · ${card.nights} ${card.nights === 1 ? 'NOĆ' : card.nights < 5 ? 'NOĆI' : 'NOĆI'}` : ''}</div>
                  </div>
                </div>

                <div style={{ padding: 15 }}>
                  {/* co-presence — signal koji samo mi imamo */}
                  {card.together > 0 && card.together_last && (
                    <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--ab-acid-soft)', border: `1px solid ${AB.acidDim}`, marginBottom: 12 }}>
                      <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: AB.acid }}>
                        BILI STE ISTE NOĆI U {card.together_last.venue.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: AB.ink3, marginTop: 3 }}>
                        {nightLabel(card.together_last.night)}{card.together > 1 ? ` · ${card.together} puta zajedno` : ''}
                      </div>
                    </div>
                  )}

                  {card.bio && <div style={{ fontSize: 14, lineHeight: 1.55, color: AB.ink2, marginBottom: 12 }}>{card.bio}</div>}

                  {card.music_preferences?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                      {card.music_preferences.slice(0, 5).map((m) => { const c = genreCol(m); return <span key={m} style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: c, border: `1px solid ${hexA(c, 0.4)}`, borderRadius: 999, padding: '5px 11px' }}>{m.toUpperCase()}</span>; })}
                    </div>
                  )}

                  {card.top_venues?.length > 0 && (
                    <>
                      <div style={LABEL}>NAJČEŠĆE</div>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, color: AB.ink2, marginTop: 5 }}>
                        {card.top_venues.join(' · ')}
                      </div>
                    </>
                  )}
                  {card.shared_venues > 0 && card.together === 0 && (
                    <div style={{ ...LABEL, marginTop: 10, color: AB.ink2 }}>
                      {card.shared_venues} {card.shared_venues === 1 ? 'ZAJEDNIČKO MESTO' : 'ZAJEDNIČKA MESTA'}
                    </div>
                  )}
                </div>
              </div>

              {/* akcije — velike mete, bez gestova */}
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button onClick={() => act(false)} disabled={swipe.isPending} aria-label="Preskoči" className="os-press" style={{ flex: 'none', width: 64, minHeight: 56, borderRadius: 999, cursor: 'pointer', border: `1px solid ${AB.line2}`, background: 'transparent', color: AB.ink3, fontSize: 20 }}>✕</button>
                <button onClick={() => act(true)} disabled={swipe.isPending} className="os-press" style={{ flex: 1, minHeight: 56, borderRadius: 999, cursor: 'pointer', border: 0, background: AB.acid, color: AB.acidInk, fontSize: 16, fontWeight: 700 }}>
                  {swipe.isPending ? '…' : '✦ Iskra'}
                </button>
              </div>
              <div style={{ ...LABEL, textAlign: 'center', marginTop: 12 }}>
                {deck.length - i} {deck.length - i === 1 ? 'OSOBA' : 'LJUDI'} U DECKU
              </div>
            </div>
          )}
        </>
      ))}

      {/* isključi me — uvek dostupno kad si uključen */}
      {optedIn && mode !== 'grupe' && (
        <div style={{ padding: '22px 18px 0', textAlign: 'center' }}>
          <button onClick={() => opt.set({ mode: mode as MeetMode, on: false })} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', ...LABEL, padding: '8px 0' }}>
            ISKLJUČI ME IZ {mode === 'dates' ? '1 NA 1' : 'EKIPE'}
          </button>
        </div>
      )}

      {match && (
        <OSMatchCelebration
          otherName={match.name}
          otherAvatar={match.avatar}
          onClose={() => setMatch(null)}
          onOpenChat={() => { setMatch(null); window.dispatchEvent(new CustomEvent('os-go', { detail: 'matches' })); }}
        />
      )}
      {crewOpen && night && (
        <OSCrew eventId={null} venueId={night.venueId} title={night.venueName} onClose={() => setCrewOpen(false)} />
      )}
    </div>
  );
};
