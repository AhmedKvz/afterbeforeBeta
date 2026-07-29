import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminSuggestions, useDecideSuggestion, VenueSuggestion } from '@/hooks/useHiddenScene';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const lbl = { fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink6 } as const;
const inp = { width: '100%', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 10, padding: '9px 11px', fontSize: 13.5, color: OS.ink, outline: 'none' } as const;

const TYPES = ['gallery', 'market', 'river', 'bar', 'club', 'cafe', 'afterplace'];

/**
 * War Room — SKRIVENA SCENA kuracija (QUEST-DOKTRINA §6): predlozi korisnika
 * → founder odobrava sa koordinatama + rank gate-om → mesto trajno nosi
 * "OTKRIO/LA {ime}". Kapija JE proizvod — bez otvorenog UGC-a.
 */
export const WarRoomSuggestions = () => {
  const { data: suggestions = [] } = useAdminSuggestions();
  const decide = useDecideSuggestion();
  const [openId, setOpenId] = useState<string | null>(null);
  const [f, setF] = useState({ type: 'gallery', neighborhood: '', emoji: '✨', lat: '', lng: '', minLevel: 2, repMult: 2, radius: 150 });

  if (!suggestions.length) return null;

  const approve = (s: VenueSuggestion) => {
    decide.mutate({
      id: s.id, approve: true, type: f.type, neighborhood: f.neighborhood || s.area || undefined, emoji: f.emoji,
      lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null,
      minLevel: f.minLevel, repMult: f.repMult, radius: f.radius,
    }, {
      onSuccess: () => { toast.success(`„${s.name}" je na mapi 🗺 — OTKRIO/LA ${s.suggested_by || '—'}`); setOpenId(null); },
      onError: (e: any) => toast.error(e?.message || 'Nije prošlo.'),
    });
  };
  const reject = (s: VenueSuggestion) =>
    decide.mutate({ id: s.id, approve: false }, { onSuccess: () => toast('Odbijeno.') });

  return (
    <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${hexA(G.community, 0.4)}` }}>
      <div style={{ ...lbl, color: G.community, marginBottom: 10 }}>🗺 PREDLOZI SKRIVENIH MESTA · {suggestions.length} NA ČEKANJU</div>
      {suggestions.map((s) => (
        <div key={s.id} style={{ borderTop: `1px solid ${OS.line}`, padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: OS.ink }}>{s.name}</div>
              <div style={{ ...lbl, marginTop: 3 }}>{(s.area || '—').toUpperCase()} · PREDLOŽIO/LA {(s.suggested_by || '—').toUpperCase()}</div>
              {s.why && <div style={{ fontSize: 12.5, color: OS.ink3, marginTop: 4 }}>{s.why}</div>}
            </div>
            <div style={{ flex: 'none', display: 'flex', gap: 6 }}>
              <button onClick={() => setOpenId(openId === s.id ? null : s.id)} style={{ cursor: 'pointer', padding: '7px 12px', borderRadius: 999, border: 0, fontWeight: 700, fontSize: 12.5, background: G.community, color: '#0B0B0D' }}>Odobri…</button>
              <button onClick={() => reject(s)} disabled={decide.isPending} style={{ cursor: 'pointer', padding: '7px 12px', borderRadius: 999, border: `1px solid ${OS.line2}`, background: 'transparent', color: OS.ink3, fontSize: 12.5 }}>✕</button>
            </div>
          </div>
          {openId === s.id && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: OS.bg, border: `1px solid ${OS.line2}` }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1, ...lbl }}>TIP
                  <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={{ ...inp, marginTop: 4, appearance: 'auto' }}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1, ...lbl }}>KVART<input value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} placeholder={s.area || 'kvart'} style={{ ...inp, marginTop: 4 }} /></label>
                <label style={{ width: 64, ...lbl }}>EMOJI<input value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <label style={{ flex: 1, ...lbl }}>LAT<input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} placeholder="44.81…" style={{ ...inp, marginTop: 4 }} /></label>
                <label style={{ flex: 1, ...lbl }}>LNG<input value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} placeholder="20.46…" style={{ ...inp, marginTop: 4 }} /></label>
                <label style={{ width: 74, ...lbl }}>RADIUS m<input type="number" min={50} value={f.radius} onChange={(e) => setF({ ...f, radius: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <label style={{ flex: 1, ...lbl }}>MIN RANK (gate)<input type="number" min={0} max={10} value={f.minLevel} onChange={(e) => setF({ ...f, minLevel: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
                <label style={{ flex: 1, ...lbl }}>REP ×<input type="number" min={1} max={5} step={0.5} value={f.repMult} onChange={(e) => setF({ ...f, repMult: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
              </div>
              <button onClick={() => approve(s)} disabled={decide.isPending} style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, background: G.community, color: '#0B0B0D' }}>
                {decide.isPending ? '…' : `Odobri — na mapu sa OTKRIO/LA ${s.suggested_by || ''}`}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
