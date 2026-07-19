import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { incrementQuestProgress } from '@/services/questProgress';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from './osTheme';
import { useExit, prefersReducedMotion } from './useExit';

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

const db = supabase as any;

/* ── ŠIFRA — uparivanje sa nekim iz mesta, identitet tek posle obe potvrde ── */
const SifraTab = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [st, setSt] = useState<any>({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await db.rpc('dare_status');
    if (data) setSt(data);
  };
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  const join = async () => {
    setBusy(true);
    const { data, error } = await db.rpc('dare_join');
    setBusy(false);
    if (error) { toast.error(error.message || 'Ne može sad.'); return; }
    if (data?.status === 'no_checkin') { toast('Prvo se čekiraj gde si — igra se igra u mestu. 📍'); return; }
    track('sifra_join', { matched: data?.status === 'matched' });
    refresh();
  };
  const confirm = async () => {
    setBusy(true);
    const { data, error } = await db.rpc('dare_confirm', { p_pair: st.pair_id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data?.completed && user) {
      track('sifra_completed', {});
      incrementQuestProgress(user.id, 'social').catch(() => {});
      incrementQuestProgress(user.id, 'match').catch(() => {});
    }
    refresh();
  };

  const card = (children: any, col: string) => (
    <div style={{ borderRadius: 20, border: `1px solid ${hexA(col, 0.5)}`, background: `radial-gradient(120% 100% at 50% 0%, ${hexA(col, 0.13)}, transparent 60%), ${OS.surface}`, padding: '28px 22px' }}>{children}</div>
  );

  if (st.status === 'loading') return <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, padding: '40px 0' }}>UČITAVAM…</div>;

  if (st.status === 'idle') return card(<>
    <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: OS.ink }}>Igra velikih</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 10, lineHeight: 1.6 }}>
      Uđeš u igru → algoritam te upari sa nekim iz <strong style={{ color: OS.ink2 }}>istog mesta, večeras</strong>, po ukusu.
      Oboje dobijete po <strong style={{ color: OS.ink2 }}>pola šifre</strong>. Chill zona. Sastavite je.
      Ime saznaš tek kad se <strong style={{ color: OS.ink2 }}>oboje potvrdite</strong>. Izlaz — kad god hoćeš.
    </div>
    <button onClick={join} disabled={busy} className="os-press" style={{ marginTop: 20, width: '100%', minHeight: 50, borderRadius: 14, border: 0, cursor: 'pointer', fontSize: 15, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg,${G.underground},${G.techno})` }}>{busy ? '…' : 'UĐI U IGRU VEČERAS'}</button>
  </>, G.underground);

  if (st.status === 'waiting') return card(<>
    <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
    <div style={{ fontSize: 19, fontWeight: 800, color: OS.ink }}>U igri si.</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8, lineHeight: 1.55 }}>Čekaš polovinu — čim još neko iz mesta uđe u igru, šifra stiže. Drži app blizu.</div>
    <button onClick={async () => { await db.rpc('dare_leave'); refresh(); }} style={{ marginTop: 16, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, color: OS.ink5 }}>IZAĐI IZ IGRE</button>
  </>, G.underground);

  // matched
  if (st.completed) return card(<>
    <div style={{ fontSize: 40, marginBottom: 10, animation: 'os-stamp .5s cubic-bezier(.16,1,.3,1)' }}>🖤</div>
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: G.festival }}>ŠIFRA SASTAVLJENA</div>
    <div style={{ fontSize: 21, fontWeight: 800, color: OS.ink, marginTop: 8 }}>{st.other_name || 'Tvoja polovina'}</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8 }}>Upoznali ste se kako se u ovom gradu upoznaje — uživo. Quest progres upisan.</div>
    <button onClick={onClose} className="os-press" style={{ marginTop: 18, width: '100%', minHeight: 46, borderRadius: 13, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: G.festival, color: '#0B0B0D' }}>Nazad u noć →</button>
  </>, G.festival);

  return card(<>
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', color: OS.ink5 }}>{st.venue?.toUpperCase()} · MISIJA</div>
    <div style={{ fontSize: 14, color: OS.ink3, marginTop: 8, lineHeight: 1.5 }}>{st.mission}</div>
    <div style={{ margin: '18px 0 6px', fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: G.underground }}>TVOJA POLOVINA ŠIFRE</div>
    <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, letterSpacing: '.06em', color: OS.ink, textShadow: `0 0 30px ${hexA(G.underground, 0.6)}` }}>„{st.my_code}"</div>
    {st.me_confirmed
      ? <div style={{ fontFamily: MONO, fontSize: 11, color: G.house, marginTop: 18 }}>ČEKA SE POTVRDA DRUGE STRANE…</div>
      : <button onClick={confirm} disabled={busy} className="os-press" style={{ marginTop: 18, width: '100%', minHeight: 48, borderRadius: 13, border: 0, cursor: 'pointer', fontWeight: 800, fontSize: 14.5, background: G.underground, color: '#fff' }}>{busy ? '…' : 'NAŠLI SMO SE — POTVRDI ✓'}</button>}
    <div style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6, marginTop: 12 }}>JAVNA ZONA · IZLAZ KAD GOD HOĆEŠ · 🚩 PRIJAVA U CHATU RADI I OVDE</div>
  </>, G.underground);
};

/* ── CREW ŠIFRA — ekipa traži ekipu (dva čina: sastavi se, pa nađi drugu) ── */
const CrewSifraTab = ({ onClose }: { onClose: () => void }) => {
  const [st, setSt] = useState<any>({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await db.rpc('crew_dare_status');
    if (data) setSt(data);
  };
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  const join = async () => {
    setBusy(true);
    const { data, error } = await db.rpc('crew_dare_join');
    setBusy(false);
    if (error) { toast.error(error.message || 'Ne može sad.'); return; }
    if (data?.status === 'no_checkin') { toast('Prvo se čekiraj gde si. 📍'); return; }
    if (data?.status === 'no_crew') { toast('Prvo ti treba ekipa — „Nađi ekipu" na kartici mesta. 🧑\u200d🤝\u200d🧑'); return; }
    track('crew_sifra_join', { status: data?.status });
    refresh();
  };
  const confirm = async () => {
    setBusy(true);
    const { data, error } = await db.rpc('crew_dare_confirm', { p_pair: st.pair_id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data?.completed) track('crew_sifra_completed', {});
    refresh();
  };

  const card = (children: any, col: string) => (
    <div style={{ borderRadius: 20, border: `1px solid ${hexA(col, 0.5)}`, background: `radial-gradient(120% 100% at 50% 0%, ${hexA(col, 0.13)}, transparent 60%), ${OS.surface}`, padding: '28px 22px' }}>{children}</div>
  );

  if (st.status === 'loading') return <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, padding: '40px 0' }}>UČITAVAM…</div>;

  if (st.status === 'no_crew') return card(<>
    <div style={{ fontSize: 40, marginBottom: 10 }}>🧑‍🤝‍🧑</div>
    <div style={{ fontSize: 19, fontWeight: 800, color: OS.ink }}>Prvo ekipa, pa igra.</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8, lineHeight: 1.55 }}>Crew Šifru igraju EKIPE. Otvori mesto na kom si → „Nađi ekipu za večeras" → pa se vrati ovde.</div>
  </>, G.community);

  if (st.status === 'idle' || st.status === 'need_more') return card(<>
    <div style={{ fontSize: 40, marginBottom: 10 }}>🔐🔐</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: OS.ink }}>Ekipa traži ekipu</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 10, lineHeight: 1.6 }}>
      <strong style={{ color: OS.ink2 }}>Čin 1:</strong> svako iz ekipe dobija PO REČ vaše polovine — skupite se i složite je uživo.{' '}
      <strong style={{ color: OS.ink2 }}>Čin 2:</strong> negde u mestu je ekipa sa drugom polovinom. Nađite ih.
      Imena tek kad obe ekipe potvrde.
    </div>
    {st.status === 'need_more' && <div style={{ fontFamily: MONO, fontSize: 11, color: G.house, marginTop: 12 }}>U IGRI: {st.opted} — TREBA JOŠ {Math.max(0, 2 - (st.opted || 0))} IZ EKIPE DA UĐE</div>}
    <button onClick={join} disabled={busy} className="os-press" style={{ marginTop: 18, width: '100%', minHeight: 50, borderRadius: 14, border: 0, cursor: 'pointer', fontSize: 15, fontWeight: 800, color: '#0B0B0D', background: `linear-gradient(135deg,${G.community},${G.festival})` }}>{busy ? '…' : st.status === 'need_more' ? 'U IGRI SI — ZOVI OSTALE' : 'ULAZIM SA EKIPOM'}</button>
  </>, G.community);

  if (st.status === 'waiting') return card(<>
    <div style={{ fontSize: 40, marginBottom: 10 }}>🔐🔐</div>
    <div style={{ fontSize: 19, fontWeight: 800, color: OS.ink }}>Ekipa je u igri.</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8, lineHeight: 1.55 }}>Čekate protivničku polovinu — čim još jedna ekipa iz mesta uđe, reči stižu svima.</div>
    <button onClick={async () => { await db.rpc('crew_dare_leave'); refresh(); }} style={{ marginTop: 16, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, color: OS.ink5 }}>IZAĐI IZ IGRE</button>
  </>, G.community);

  if (st.completed) return card(<>
    <div style={{ fontSize: 40, marginBottom: 10, animation: 'os-stamp .5s cubic-bezier(.16,1,.3,1)' }}>🖤🖤</div>
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: G.festival }}>ŠIFRA SASTAVLJENA · EKIPE SPOJENE</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: OS.ink, marginTop: 10, lineHeight: 1.5 }}>{st.other_members || 'Druga ekipa'}</div>
    <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8 }}>Večeras ste jedna scena. Poruka je u oba crew chata.</div>
    <button onClick={onClose} className="os-press" style={{ marginTop: 18, width: '100%', minHeight: 46, borderRadius: 13, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: G.festival, color: '#0B0B0D' }}>Nazad u noć →</button>
  </>, G.festival);

  // matched — moje reči
  return card(<>
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.18em', color: OS.ink5 }}>ČIN 1 · SLOŽITE POLOVINU ({st.word_count} REČI, {st.crew_size} VAS) — PA NAĐITE DRUGU EKIPU</div>
    <div style={{ margin: '18px 0 6px', fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: G.community }}>TVOJE REČI</div>
    <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, letterSpacing: '.05em', color: OS.ink, textShadow: `0 0 30px ${hexA(G.community, 0.6)}` }}>„{st.my_words}"</div>
    {st.me_confirmed
      ? <div style={{ fontFamily: MONO, fontSize: 11, color: G.house, marginTop: 18 }}>ČEKA SE POTVRDA DRUGE EKIPE…</div>
      : <button onClick={confirm} disabled={busy} className="os-press" style={{ marginTop: 18, width: '100%', minHeight: 48, borderRadius: 13, border: 0, cursor: 'pointer', fontWeight: 800, fontSize: 14.5, background: G.community, color: '#0B0B0D' }}>{busy ? '…' : 'NAŠLI SMO IH — POTVRDI ✓'}</button>}
    <div style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6, marginTop: 12 }}>PO JEDNA POTVRDA IZ SVAKE EKIPE · JAVNA ZONA · IZLAZ KAD GOD</div>
  </>, G.community);
};

export const OSDareWheel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { closing, close } = useExit(onClose);
  const [mode, setMode] = useState<'tocak' | 'sifra' | 'ekipe'>('tocak');
  const [phase, setPhase] = useState<'idle' | 'spin' | 'landed'>('idle');
  const [idx, setIdx] = useState(0);
  const [respins, setRespins] = useState(2);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const spin = () => {
    if (phase === 'spin') return;
    track('dare_spin', {});
    // reduced-motion: bez 90ms flash-ciklusa — sleti odmah (motion audit 🔴3)
    if (prefersReducedMotion()) {
      setIdx(Math.floor(Math.random() * DARES.length));
      setPhase('landed');
      return;
    }
    setPhase('spin');
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
    close();
  };

  const d = DARES[idx];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(5,5,7,.88)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, animation: closing ? 'os-overlay-out .15s ease forwards' : 'os-overlay-in .2s cubic-bezier(.16,1,.3,1)' }} onClick={phase !== 'spin' ? close : undefined}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {([['tocak', '🎲 TOČAK'], ['sifra', '🔐 ŠIFRA'], ['ekipe', '🔐🔐 EKIPE']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} className="os-press" style={{ minHeight: 36, cursor: 'pointer', padding: '7px 16px', borderRadius: 999, fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', border: `1px solid ${mode === v ? 'transparent' : OS.line2}`, background: mode === v ? hexA(G.afterparty, 0.18) : 'transparent', color: mode === v ? G.afterparty : OS.ink5 }}>{l}</button>
          ))}
        </div>

        {/* key={mode} → os-swap crossfade na promenu taba (motion audit 🟡6) */}
        <div key={mode} style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
        {mode === 'sifra' && <SifraTab onClose={close} />}
        {mode === 'ekipe' && <CrewSifraTab onClose={close} />}

        {mode === 'tocak' && phase === 'idle' && (
          <>
            <div style={{ fontSize: 46, marginBottom: 10 }}>🎲</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: OS.ink, letterSpacing: '-.02em' }}>Smeš li?</div>
            <div style={{ fontSize: 13.5, color: OS.ink4, marginTop: 8, lineHeight: 1.55 }}>Jedna smela misija za večeras. Točak bira — ti izvodiš. Bez snimanja, bez izgovora.</div>
            <button onClick={spin} className="os-press" style={{ marginTop: 22, minHeight: 52, padding: '14px 40px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 16, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg,${G.afterparty},${G.underground})`, boxShadow: `0 14px 40px -10px ${hexA(G.afterparty, 0.6)}` }}>ZAVRTI</button>
          </>
        )}

        {mode === 'tocak' && phase !== 'idle' && (
          <div style={{ borderRadius: 20, border: `1px solid ${hexA(d.col, phase === 'landed' ? 0.55 : 0.25)}`, background: `radial-gradient(120% 100% at 50% 0%, ${hexA(d.col, 0.14)}, transparent 60%), ${OS.surface}`, padding: '30px 22px', transition: 'border-color .2s', boxShadow: phase === 'landed' ? `0 0 60px -20px ${hexA(d.col, 0.7)}` : 'none', animation: phase === 'landed' ? 'os-stamp .5s cubic-bezier(.16,1,.3,1)' : undefined }}>
            <div style={{ fontSize: 40, marginBottom: 12, filter: phase === 'spin' ? 'blur(1px)' : 'none' }}>{d.emoji}</div>
            <div style={{ fontSize: 17.5, fontWeight: 700, color: OS.ink, lineHeight: 1.45, minHeight: 76, opacity: phase === 'spin' ? 0.55 : 1 }}>{d.text}</div>
            {phase === 'landed' && (
              <>
                <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
                  <button onClick={done} className="os-press" style={{ flex: 1, minHeight: 46, borderRadius: 13, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14.5, background: d.col, color: '#0B0B0D' }}>ODRAĐENO ✓</button>
                  {respins > 0 && (
                    <button onClick={() => { setRespins((r) => r - 1); spin(); }} className="os-press" style={{ flex: 'none', minHeight: 46, padding: '0 16px', borderRadius: 13, border: `1px solid ${OS.line2}`, cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: OS.ink4, background: 'transparent' }}>PREJAKO · {respins}</button>
                  )}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: OS.ink6, marginTop: 12 }}>ODRAĐENO GURA TVOJ QUEST PROGRES · NA REČ — SCENA VERUJE SVOJIMA</div>
              </>
            )}
          </div>
        )}
        </div>

        <button onClick={close} className="os-press" style={{ marginTop: 18, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', color: OS.ink5 }}>MOŽDA SLEDEĆI VIKEND</button>
      </div>
    </div>
  );
};
