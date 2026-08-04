import { useState } from 'react';
import { toast } from 'sonner';
import { useMyPair, usePairCandidates, usePairDeck, usePairActions, PairCard } from '@/hooks/useMeet';
import { OSCrew } from './OSCrew';
import { track } from '@/lib/analytics';
import { AB, G, hexA, MONO, genreCol } from './osTheme';

const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;

const ERR: Record<string, string> = {
  ALREADY_PAIRED: 'Već si u paru — prvo izađi iz njega.',
  TARGET_PAIRED: 'Ta osoba je već u paru.',
  NO_THREAD: 'Par praviš sa nekim s kim već pričaš.',
  NO_PAIR: 'Prvo napravi par.',
  DISABLED: 'Trenutno nedostupno.',
};
const errMsg = (e: any) => {
  const m = String(e?.message || '');
  const k = Object.keys(ERR).find((x) => m.includes(x));
  return k ? ERR[k] : 'Nije prošlo — pokušaj ponovo.';
};

const Avatar = ({ url, size = 44 }: { url?: string | null; size?: number }) => (
  <span style={{ flex: 'none', width: size, height: size, borderRadius: '50%', background: url ? `center/cover url(${url})` : `linear-gradient(135deg,${G.underground},${G.techno})` }} />
);

/**
 * PAR ZA PAR — treći mod. Ti i tvoj čovek činite par, deck pokazuje DRUGE
 * parove, uzajamna iskra pravi grupu od 4 sa grupnim chatom (bezbednije i
 * prirodnije od četiri odvojene niti). Par se pravi samo sa nekim s kim već
 * pričaš — bez hladnih poziva.
 */
export const OSPairMode = () => {
  const { data: pair } = useMyPair();
  const act = usePairActions();
  const hasActive = pair?.has_pair && pair.status === 'active';
  const matched = hasActive && !!pair?.crew_id;
  const { data: cands = [] } = usePairCandidates(!pair?.has_pair);
  const { data: deck = [], error: deckErr } = usePairDeck(!!hasActive && !matched);
  const [i, setI] = useState(0);
  const [crewOpen, setCrewOpen] = useState(false);

  const card: PairCard | undefined = deck[i];

  const swipe = (like: boolean) => {
    if (!card || act.swipe.isPending) return;
    track('pair_swipe', { like });
    act.swipe.mutate({ to: card.id, like }, {
      onSuccess: (r) => {
        if (r?.matched) toast.success('Par našao par ✦ Vas četvoro ste u ekipi.');
        setI((n) => n + 1);
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  /* ── 1 · nemaš par → pozovi nekog s kim već pričaš ── */
  if (!pair?.has_pair) {
    return (
      <div style={{ padding: '0 18px' }}>
        <div style={{ padding: 16, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}` }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', color: AB.ink }}>Izađite udvoje, nađite udvoje</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: AB.ink2, marginTop: 6 }}>
            Ti i tvoj čovek činite par. Vidite druge parove, i kad se dopadnete —
            vas četvoro dobijate zajednički chat. Niko ne izlazi sam.
          </div>
          <div style={{ ...LABEL, marginTop: 12 }}>POZOVI NEKOG S KIM VEĆ PRIČAŠ</div>
        </div>

        <div style={{ marginTop: 10 }}>
          {cands.length === 0 && (
            <div style={{ ...LABEL, textAlign: 'center', padding: '26px 0', lineHeight: 1.8 }}>
              NEMAŠ JOŠ NIKOGA U PORUKAMA.<br />UPOZNAJ NEKOGA U 1 NA 1, PA SE VRATI.
            </div>
          )}
          {cands.map((c) => (
            <button
              key={c.user_id}
              onClick={() => act.invite.mutate(c.user_id, {
                onSuccess: () => toast.success('Poziv poslat — čeka se potvrda.'),
                onError: (e) => toast.error(errMsg(e)),
              })}
              disabled={act.invite.isPending}
              className="os-press"
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 0', background: 'transparent', border: 0, borderTop: `1px solid ${AB.line}`, cursor: 'pointer' }}
            >
              <Avatar url={c.avatar_url} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: AB.ink }}>{c.display_name}</span>
              <span style={{ ...LABEL, color: AB.acid }}>POZOVI</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── 2 · poziv na čekanju ── */
  if (pair.status === 'pending') {
    return (
      <div style={{ padding: '0 18px' }}>
        <div style={{ padding: 16, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.uvDim}` }}>
          {pair.i_invited ? (
            <>
              <div style={LABEL}>ČEKA SE POTVRDA</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <Avatar url={pair.partner?.avatar} />
                <div style={{ flex: 1, fontWeight: 700, fontSize: 16, color: AB.ink }}>{pair.partner?.name}</div>
              </div>
              <div style={{ fontSize: 13, color: AB.ink2, marginTop: 9 }}>Poslali smo mu/joj poziv. Čim prihvati, krećete u potragu za drugim parom.</div>
            </>
          ) : (
            <>
              <div style={{ ...LABEL, color: AB.uv }}>POZIV ZA PAR</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <Avatar url={pair.partner?.avatar} />
                <div style={{ flex: 1, fontWeight: 700, fontSize: 16, color: AB.ink }}>{pair.partner?.name}</div>
              </div>
              <div style={{ fontSize: 13, color: AB.ink2, marginTop: 9 }}>zove te da budete par — tražite drugi par zajedno.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                <button onClick={() => act.respond.mutate({ id: pair.id!, accept: false })} className="os-press"
                  style={{ flex: 'none', padding: '11px 16px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 13.5, cursor: 'pointer' }}>Ne sad</button>
                <button onClick={() => act.respond.mutate({ id: pair.id!, accept: true }, { onSuccess: () => toast.success('Par je spreman ✦') })} className="os-press"
                  style={{ flex: 1, minHeight: 46, borderRadius: 999, border: 0, background: AB.acid, color: AB.acidInk, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Prihvati</button>
              </div>
            </>
          )}
          <button onClick={() => act.leave.mutate()} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', ...LABEL, padding: '12px 0 0' }}>OTKAŽI</button>
        </div>
      </div>
    );
  }

  /* ── 4 · par našao par → grupa od 4 ── */
  if (matched) {
    return (
      <div style={{ padding: '0 18px' }}>
        <div style={{ padding: 16, borderRadius: 16, background: hexA(G.community, 0.09), border: `1px solid ${hexA(G.community, 0.45)}` }}>
          <div style={{ ...LABEL, color: G.community }}>PAR NAŠAO PAR ✦</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: AB.ink, marginTop: 6 }}>Vas četvoro ste u ekipi</div>
          <div style={{ fontSize: 13.5, color: AB.ink2, marginTop: 5 }}>Dogovorite gde i kad — grupni chat je otvoren.</div>
          <button onClick={() => setCrewOpen(true)} className="os-press"
            style={{ width: '100%', marginTop: 13, minHeight: 48, borderRadius: 999, border: 0, background: G.community, color: '#0B0B0D', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Otvori grupu
          </button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => act.leave.mutate()} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', ...LABEL, padding: '16px 0' }}>RASTURI PAR</button>
        </div>
        {crewOpen && <OSCrew eventId={null} venueId={null} title="Vaša četvorka" onClose={() => setCrewOpen(false)} />}
      </div>
    );
  }

  /* ── 3 · aktivan par → deck parova ── */
  return (
    <div style={{ padding: '0 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 0 12px' }}>
        <Avatar url={pair.partner?.avatar} size={28} />
        <span style={{ ...LABEL }}>U PARU SA {(pair.partner?.name || '').toUpperCase()}</span>
      </div>

      {String((deckErr as any)?.message || '').includes('DISABLED') && (
        <div style={{ ...LABEL, textAlign: 'center', padding: '30px 0' }}>USKORO.</div>
      )}

      {!card && !deckErr && (
        <div style={{ textAlign: 'center', padding: '26px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: AB.ink }}>Nema drugih parova još.</div>
          <div style={{ fontSize: 13.5, color: AB.ink2, marginTop: 6 }}>Recite drugarima da naprave svoj par — tako se scena puni.</div>
        </div>
      )}

      {card && (
        <div key={card.id} style={{ animation: 'os-swap .18s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ borderRadius: 22, overflow: 'hidden', background: AB.surface, border: `1px solid ${AB.line2}`, padding: 15 }}>
            {/* dva lica — par je jedna kartica */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar url={card.person_a.avatar} size={64} />
              <Avatar url={card.person_b.avatar} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.01em', color: AB.ink }}>
                  {card.person_a.name} <span style={{ color: AB.ink3, fontWeight: 400 }}>+</span> {card.person_b.name}
                </div>
                <div style={{ ...LABEL, marginTop: 3 }}>PAR</div>
              </div>
            </div>

            {card.together > 0 && card.together_venue && (
              <div style={{ marginTop: 12, padding: '9px 11px', borderRadius: 12, border: `1px solid ${AB.acidDim}`, background: 'var(--ab-acid-soft)' }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', color: AB.acid }}>
                  BILI STE ISTE NOĆI U {card.together_venue.toUpperCase()}
                </div>
                {card.together > 1 && <div style={{ fontFamily: MONO, fontSize: 9.5, color: AB.ink3, marginTop: 3 }}>{card.together} puta zajedno</div>}
              </div>
            )}

            {(() => {
              const gs = Array.from(new Set([...(card.person_a.genres || []), ...(card.person_b.genres || [])])).slice(0, 5);
              return gs.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {gs.map((m) => { const c = genreCol(m); return <span key={m} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: c, border: `1px solid ${hexA(c, 0.4)}`, borderRadius: 999, padding: '5px 10px' }}>{m.toUpperCase()}</span>; })}
                </div>
              ) : null;
            })()}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <button onClick={() => swipe(false)} disabled={act.swipe.isPending} aria-label="Preskoči" className="os-press"
              style={{ flex: 'none', width: 64, minHeight: 56, borderRadius: 999, cursor: 'pointer', border: `1px solid ${AB.line2}`, background: 'transparent', color: AB.ink3, fontSize: 20 }}>✕</button>
            <button onClick={() => swipe(true)} disabled={act.swipe.isPending} className="os-press"
              style={{ flex: 1, minHeight: 56, borderRadius: 999, cursor: 'pointer', border: 0, background: AB.acid, color: AB.acidInk, fontSize: 16, fontWeight: 700 }}>
              {act.swipe.isPending ? '…' : '✦ Iskra za par'}
            </button>
          </div>
          <div style={{ ...LABEL, textAlign: 'center', marginTop: 12 }}>{deck.length - i} {deck.length - i === 1 ? 'PAR' : 'PAROVA'} U DECKU</div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <button onClick={() => act.leave.mutate()} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', ...LABEL, padding: '20px 0 0' }}>IZAĐI IZ PARA</button>
      </div>
    </div>
  );
};
