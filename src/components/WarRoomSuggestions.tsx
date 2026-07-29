import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminSuggestions, useDecideSuggestion, useActivePopups, useCreatePopup, useEndPopup, VenueSuggestion } from '@/hooks/useHiddenScene';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const lbl = { fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink6 } as const;
const inp = { width: '100%', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 10, padding: '9px 11px', fontSize: 13.5, color: OS.ink, outline: 'none' } as const;

const TYPES = ['gallery', 'market', 'river', 'bar', 'club', 'cafe', 'afterplace'];

const localIso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/**
 * War Room — POP-UP eventi (§6): događaj sa SOPSTVENIM koordinatama i rokom,
 * bez stalnog mesta. Efemeralni venue → check-in/prisustvo/konvergencija rade
 * automatski; istekao nestaje iz imenika i odbija check-in (POPUP_ENDED).
 */
export const WarRoomPopup = () => {
  const { data: popups = [] } = useActivePopups();
  const create = useCreatePopup();
  const end = useEndPopup();
  const [p, setP] = useState({ name: '', neighborhood: '', emoji: '⚡', lat: '', lng: '', radius: 150, until: localIso(new Date(Date.now() + 8 * 3600_000)), hidden: false, minLevel: 0, repMult: 1.5 });

  const submit = () => {
    if (!p.name.trim() || !p.lat || !p.lng) { toast('Ime + koordinate su obavezni.'); return; }
    create.mutate({
      name: p.name, neighborhood: p.neighborhood, emoji: p.emoji,
      lat: Number(p.lat), lng: Number(p.lng), until: new Date(p.until).toISOString(),
      radius: p.radius, hidden: p.hidden, minLevel: p.hidden ? p.minLevel : 0, repMult: p.repMult,
    }, {
      onSuccess: () => { toast.success('Pop-up je živ ⚡ — na mapi do isteka.'); setP({ ...p, name: '', lat: '', lng: '' }); },
      onError: (e: any) => toast.error(e?.message || 'Nije prošlo.'),
    });
  };

  return (
    <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${hexA(G.festival, 0.4)}` }}>
      <div style={{ ...lbl, color: G.festival, marginBottom: 10 }}>⚡ POP-UP EVENT · SOPSTVENE KOORDINATE + ROK</div>
      <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Ime (npr. Rejv na keju)" style={inp} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={p.neighborhood} onChange={(e) => setP({ ...p, neighborhood: e.target.value })} placeholder="Kvart" style={{ ...inp, flex: 1 }} />
        <input value={p.emoji} onChange={(e) => setP({ ...p, emoji: e.target.value })} style={{ ...inp, width: 58 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <label style={{ flex: 1, ...lbl }}>LAT<input value={p.lat} onChange={(e) => setP({ ...p, lat: e.target.value })} placeholder="44.81…" style={{ ...inp, marginTop: 4 }} /></label>
        <label style={{ flex: 1, ...lbl }}>LNG<input value={p.lng} onChange={(e) => setP({ ...p, lng: e.target.value })} placeholder="20.46…" style={{ ...inp, marginTop: 4 }} /></label>
        <label style={{ width: 76, ...lbl }}>RADIUS m<input type="number" min={50} value={p.radius} onChange={(e) => setP({ ...p, radius: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
        <label style={{ flex: 1, ...lbl }}>TRAJE DO<input type="datetime-local" value={p.until} onChange={(e) => setP({ ...p, until: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={p.hidden} onChange={(e) => setP({ ...p, hidden: e.target.checked })} /> SKRIVEN (rank gate)
        </label>
        {p.hidden && <label style={{ width: 70, ...lbl }}>MIN RANK<input type="number" min={0} max={10} value={p.minLevel} onChange={(e) => setP({ ...p, minLevel: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>}
      </div>
      <button onClick={submit} disabled={create.isPending} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: G.festival, color: '#0B0B0D' }}>
        {create.isPending ? '…' : 'Pokreni pop-up'}
      </button>
      {popups.length > 0 && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${OS.line}`, paddingTop: 8 }}>
          {popups.map((v: any) => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '5px 0' }}>
              <span style={{ fontSize: 12.5, color: OS.ink3 }}>{v.emoji} {v.name} · do {new Date(v.active_until).toLocaleString('sr-RS', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}{v.is_hidden ? ` · 🔒${v.min_level}` : ''}</span>
              <button onClick={() => end.mutate(v.id, { onSuccess: () => toast('Pop-up završen.') })} style={{ cursor: 'pointer', padding: '5px 11px', borderRadius: 999, border: `1px solid ${OS.line2}`, background: 'transparent', color: OS.ink3, fontSize: 11.5 }}>Završi</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
