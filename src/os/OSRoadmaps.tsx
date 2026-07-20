import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { isFounder } from '@/lib/founder';
import { useVenueDirectory } from '@/hooks/useHeatVenues';
import { useRoadmaps, useSubmitRoadmap, useToggleRoadmapSave, useModerateRoadmap, RoadmapStop } from '@/hooks/useRoadmaps';
import { AB, G, hexA, MONO } from './osTheme';

/**
 * WEEKEND ROADMAP v0 (QUEST §6 petlja): RoadmapMaker živi u Quests hubu
 * (stvaranje), RoadmapRail na Home (distribucija). Founder moderira inline na
 * rail-u (✓/✕) — nagrada +100 AFC ide server-side POSLE odobrenja (§10.7).
 */
const DAYS: Array<'PET' | 'SUB' | 'NED'> = ['PET', 'SUB', 'NED'];
const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const MTAG = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em' } as const;

const ERR_SR: Record<string, string> = {
  PENDING_LIMIT: 'Već imaš 2 rute na proveri — sačekaj odluku.',
  STOPS_COUNT: 'Ruta ima 3 do 5 stanica.',
  STOP_INCOMPLETE: 'Svaka stanica traži mesto i vreme.',
  TITLE_SHORT: 'Daj ruti ime (bar 3 slova).',
};
const errMsg = (e: any) => {
  const m = String(e?.message || '');
  const k = Object.keys(ERR_SR).find((k) => m.includes(k));
  return k ? ERR_SR[k] : 'Nije prošlo — pokušaj ponovo.';
};

/* ── MAKER (Quests hub) — quest "Napravi Weekend Roadmap" ── */
export const RoadmapMaker = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<'PET' | 'SUB' | 'NED'>('PET');
  const [why, setWhy] = useState('');
  const [stops, setStops] = useState<RoadmapStop[]>([
    { venue: '', time: '' }, { venue: '', time: '' }, { venue: '', time: '' },
  ]);
  const submit = useSubmitRoadmap();
  const { data: dir } = useVenueDirectory();
  const venueNames: string[] = (dir?.venues || []).map((v: any) => v.name);

  const setStop = (i: number, patch: Partial<RoadmapStop>) =>
    setStops((s) => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));

  const send = () => {
    const filled = stops.filter((s) => s.venue.trim() && s.time.trim());
    submit.mutate({ title, day, why, stops: filled }, {
      onSuccess: () => {
        toast.success('Ruta poslata na proveru ✓ Kad prođe, ceo grad je vidi.');
        setOpen(false); setTitle(''); setWhy('');
        setStops([{ venue: '', time: '' }, { venue: '', time: '' }, { venue: '', time: '' }]);
      },
      onError: (e: any) => toast.error(errMsg(e)),
    });
  };

  const inp = { width: '100%', background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: AB.ink, outline: 'none' } as const;

  if (!open) return (
    <div style={{ padding: '16px 18px 0' }}>
      <button onClick={() => setOpen(true)} className="os-press" style={{ width: '100%', minHeight: 52, padding: '13px 15px', borderRadius: 16, border: `1px solid ${hexA(G.house, 0.5)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: hexA(G.house, 0.08), textAlign: 'left' }}>
        <span style={{ fontSize: 21 }}>🗺️</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: AB.ink }}>Napravi Weekend Roadmap</span>
          <span style={{ display: 'block', fontSize: 12.5, color: AB.ink2, marginTop: 1 }}>Vodi grad kroz svoju noć — 3 do 5 stanica</span>
        </span>
        <span style={{ ...MTAG, fontSize: 10, letterSpacing: '.12em', color: G.house }}>+100 AFC</span>
      </button>
    </div>
  );

  return (
    <div style={{ margin: '16px 18px 0', padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${hexA(G.house, 0.4)}` }}>
      <div style={{ ...LABEL, color: G.house, marginBottom: 10 }}>🗺️ TVOJA RUTA · NAGRADA POSLE ODOBRENJA</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ime rute (npr. Petak u Savamali)" style={inp} />
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        {DAYS.map((d) => (
          <button key={d} onClick={() => setDay(d)} className="os-press" style={{ flex: 1, padding: '8px 0', borderRadius: 999, ...MTAG, cursor: 'pointer', border: `1px solid ${day === d ? 'transparent' : AB.line}`, background: day === d ? G.house : AB.void, color: day === d ? '#0B0B0D' : AB.ink3 }}>{d}</button>
        ))}
      </div>
      <datalist id="rm-venues">{venueNames.map((n) => <option key={n} value={n} />)}</datalist>
      {stops.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
          <input list="rm-venues" value={s.venue} onChange={(e) => setStop(i, { venue: e.target.value })} placeholder={`Stanica ${i + 1}`} style={{ ...inp, flex: 2 }} />
          <input value={s.time} onChange={(e) => setStop(i, { time: e.target.value })} placeholder="23:00" style={{ ...inp, flex: 1 }} />
          <input value={s.note || ''} onChange={(e) => setStop(i, { note: e.target.value })} placeholder="zašto" style={{ ...inp, flex: 2 }} />
        </div>
      ))}
      {stops.length < 5 && (
        <button onClick={() => setStops((s) => [...s, { venue: '', time: '' }])} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', ...MTAG, fontSize: 10, letterSpacing: '.1em', color: AB.ink3, padding: '4px 0' }}>＋ JOŠ STANICA</button>
      )}
      <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={140} placeholder="Zašto baš ova ruta? (jedna rečenica)" style={{ ...inp, marginTop: 4 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => setOpen(false)} className="os-press" style={{ flex: 'none', padding: '10px 14px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
        <button onClick={send} disabled={submit.isPending} className="os-press" style={{ flex: 1, padding: '10px', borderRadius: 999, background: G.house, border: 0, color: '#0B0B0D', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{submit.isPending ? '…' : 'Pošalji na proveru'}</button>
      </div>
    </div>
  );
};

/* ── RAIL (Home) — distribucija odobrenih ruta + founder inline moderacija ── */
export const RoadmapRail = () => {
  const { user } = useAuth();
  const { data: maps = [] } = useRoadmaps();
  const save = useToggleRoadmapSave();
  const moderate = useModerateRoadmap();
  const founder = isFounder(user);
  if (!maps.length) return null;

  return (
    <div style={{ padding: '22px 0 0' }}>
      <div style={{ padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={LABEL}>🗺️ RUTE SCENE · VIKEND</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: AB.ink3 }}>{maps.filter((m) => m.status === 'approved').length}</span>
      </div>
      <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px' }}>
        {maps.map((m) => (
          <div key={m.id} style={{ minWidth: 250, maxWidth: 250, flex: 'none', borderRadius: 16, border: `1px solid ${m.status === 'pending' ? hexA(G.house, 0.5) : AB.line2}`, background: AB.surface, padding: 13, opacity: m.status === 'pending' && !founder && !m.mine ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ ...MTAG, fontSize: 10, letterSpacing: '.1em', color: G.house }}>{m.day} · {m.author.toUpperCase()}</span>
              {m.status === 'pending' && <span style={{ ...MTAG, fontSize: 9, letterSpacing: '.1em', color: AB.ink3 }}>{m.mine ? 'NA PROVERI' : 'PENDING'}</span>}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16.5, letterSpacing: '-.01em', lineHeight: '21px', color: AB.ink, marginTop: 5 }}>{m.title}</div>
            {m.why && <div style={{ fontSize: 12, color: AB.ink2, marginTop: 4, lineHeight: 1.4 }}>{m.why}</div>}
            <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(m.stops || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: AB.ink3, flex: 'none', width: 38 }}>{s.time}</span>
                  <span style={{ color: AB.ink, fontWeight: 600 }}>{s.venue}</span>
                  {s.note && <span style={{ color: AB.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {s.note}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
              {m.status === 'approved' && (
                <button onClick={() => save.mutate(m.id)} disabled={save.isPending} className="os-press" style={{ flex: 1, minHeight: 36, borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, border: m.my_saved ? '1px solid transparent' : `1px solid ${AB.line2}`, background: m.my_saved ? 'oklch(0.88 0.19 158 / 0.15)' : 'transparent', color: m.my_saved ? AB.acid : AB.ink2 }}>
                  {m.my_saved ? '✓ Sačuvana' : 'Sačuvaj rutu'}
                </button>
              )}
              {m.status === 'approved' && <span style={{ ...MTAG, fontSize: 10, color: AB.ink3 }}>{m.saves} 💾</span>}
              {founder && m.status === 'pending' && (
                <>
                  <button onClick={() => moderate.mutate({ id: m.id, status: 'approved' })} className="os-press" style={{ flex: 1, minHeight: 36, borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: AB.acid, color: AB.acidInk }}>✓ Odobri</button>
                  <button onClick={() => moderate.mutate({ id: m.id, status: 'rejected' })} className="os-press" style={{ flex: 'none', minHeight: 36, padding: '0 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, border: `1px solid ${AB.line2}`, background: 'transparent', color: AB.ink3 }}>✕</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
