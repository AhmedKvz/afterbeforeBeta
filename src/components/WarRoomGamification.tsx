import { useState } from 'react';
import { toast } from 'sonner';
import { useVenueDirectory } from '@/hooks/useHeatVenues';
import { useConvergences, useCreateConvergence, useCreateCipher } from '@/hooks/useGamification';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const lbl = { fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink6 } as const;
const inp = { width: '100%', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 10, padding: '9px 11px', fontSize: 13.5, color: OS.ink, outline: 'none' } as const;

const localIso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/**
 * War Room — kreiranje gamifikacije v2 (founder-only RPC-jevi):
 * ⚡ Konvergencija (drop na mestu) i 🔐 Gradska šifra (fragmenti po mestima).
 */
export const WarRoomGamification = () => {
  const { data: dir } = useVenueDirectory();
  const venues: any[] = dir?.venues || [];
  const { data: drops = [] } = useConvergences();
  const createDrop = useCreateConvergence();
  const createCipher = useCreateCipher();

  const now = new Date();
  const [c, setC] = useState({ venue: '', title: '', reward: '', fundedBy: '', capacity: 30, afc: 50, starts: localIso(now), ends: localIso(new Date(now.getTime() + 2 * 3600_000)) });
  const [ci, setCi] = useState({ night: new Date().toISOString().slice(0, 10), phrase: '', reward: 150 });
  const [frags, setFrags] = useState([{ venue_id: '', word: '' }, { venue_id: '', word: '' }, { venue_id: '', word: '' }]);

  const submitDrop = () => {
    if (!c.venue || !c.title.trim() || !c.reward.trim()) { toast('Mesto, naslov i nagrada su obavezni.'); return; }
    createDrop.mutate(
      { venue: c.venue, title: c.title, reward: c.reward, fundedBy: c.fundedBy.trim() || undefined, capacity: c.capacity, afc: c.afc, starts: new Date(c.starts).toISOString(), ends: new Date(c.ends).toISOString() },
      { onSuccess: () => { toast.success('Konvergencija zakazana ⚡'); setC({ ...c, title: '', reward: '', fundedBy: '' }); }, onError: (e: any) => toast.error(e?.message || 'Nije prošlo.') },
    );
  };

  const submitCipher = () => {
    const clean = frags.filter((f) => f.venue_id && f.word.trim());
    if (!ci.phrase.trim() || clean.length < 3) { toast('Fraza + najmanje 3 fragmenta (mesto + reč).'); return; }
    createCipher.mutate(
      { night: ci.night, phrase: ci.phrase, fragments: clean, reward: ci.reward },
      { onSuccess: (r: any) => { toast.success(`Šifra postavljena 🔐 (${r.fragments} fragmenta)`); setCi({ ...ci, phrase: '' }); setFrags([{ venue_id: '', word: '' }, { venue_id: '', word: '' }, { venue_id: '', word: '' }]); }, onError: (e: any) => toast.error(e?.message || 'Nije prošlo.') },
    );
  };

  const venueSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inp, appearance: 'auto' }}>
      <option value="">— mesto —</option>
      {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
    </select>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...lbl, lineHeight: 1.5 }}>
        TELO JE KONTROLER — OBE MEHANIKE TRAŽE FIZIČKO PRISUSTVO. NAGRADU PUNI MESTO ILI SPONZOR (ISPLATE ≤ FOND).
      </div>

      {/* ⚡ KONVERGENCIJA */}
      <div style={{ padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${hexA(G.festival, 0.4)}` }}>
        <div style={{ ...lbl, color: G.festival, marginBottom: 10 }}>⚡ KONVERGENCIJA · DROP NA MESTU</div>
        {venueSelect(c.venue, (v) => setC({ ...c, venue: v }))}
        <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder="Naslov (npr. Ponoćni drop)" style={{ ...inp, marginTop: 8 }} />
        <input value={c.reward} onChange={(e) => setC({ ...c, reward: e.target.value })} placeholder="Nagrada (npr. Shot na račun kuće)" style={{ ...inp, marginTop: 8 }} />
        <input value={c.fundedBy} onChange={(e) => setC({ ...c, fundedBy: e.target.value })} placeholder="Ko finansira? (prazno = kuća · OBAVEZNO za sponzora — §13)" style={{ ...inp, marginTop: 8 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <label style={{ flex: 1, ...lbl }}>KAPACITET<input type="number" min={1} value={c.capacity} onChange={(e) => setC({ ...c, capacity: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
          <label style={{ flex: 1, ...lbl }}>AFC BONUS<input type="number" min={0} step={10} value={c.afc} onChange={(e) => setC({ ...c, afc: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <label style={{ flex: 1, ...lbl }}>OD<input type="datetime-local" value={c.starts} onChange={(e) => setC({ ...c, starts: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
          <label style={{ flex: 1, ...lbl }}>DO<input type="datetime-local" value={c.ends} onChange={(e) => setC({ ...c, ends: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
        </div>
        <button onClick={submitDrop} disabled={createDrop.isPending} style={{ width: '100%', marginTop: 12, padding: 11, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: G.festival, color: '#0B0B0D' }}>
          {createDrop.isPending ? '…' : 'Zakaži konvergenciju'}
        </button>
        {drops.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${OS.line}`, paddingTop: 10 }}>
            {drops.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: OS.ink3 }}>
                <span>{d.is_live ? '🟢' : '🕓'} {d.venue_name} · {d.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 11 }}>{d.claimed}/{d.capacity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔐 GRADSKA ŠIFRA */}
      <div style={{ padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${hexA(G.underground, 0.4)}` }}>
        <div style={{ ...lbl, color: G.underground, marginBottom: 10 }}>🔐 GRADSKA ŠIFRA · JEDNA PO NOĆI</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, ...lbl }}>NOĆ<input type="date" value={ci.night} onChange={(e) => setCi({ ...ci, night: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
          <label style={{ flex: 1, ...lbl }}>NAGRADA AFC<input type="number" min={0} step={50} value={ci.reward} onChange={(e) => setCi({ ...ci, reward: +e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
        </div>
        <input value={ci.phrase} onChange={(e) => setCi({ ...ci, phrase: e.target.value })} placeholder="Cela fraza (npr. Ponoć nema krov)" style={{ ...inp, marginTop: 8 }} />
        <div style={{ ...lbl, marginTop: 10, marginBottom: 6 }}>FRAGMENTI · 3–5 (MESTO + REČ)</div>
        {frags.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
            <div style={{ flex: 2 }}>{venueSelect(f.venue_id, (v) => setFrags(frags.map((x, j) => (j === i ? { ...x, venue_id: v } : x))))}</div>
            <input value={f.word} onChange={(e) => setFrags(frags.map((x, j) => (j === i ? { ...x, word: e.target.value } : x)))} placeholder={`reč ${i + 1}`} style={{ ...inp, flex: 1 }} />
          </div>
        ))}
        {frags.length < 5 && (
          <button onClick={() => setFrags([...frags, { venue_id: '', word: '' }])} style={{ background: 'transparent', border: 0, cursor: 'pointer', ...lbl, padding: '4px 0' }}>＋ JOŠ FRAGMENT</button>
        )}
        <button onClick={submitCipher} disabled={createCipher.isPending} style={{ width: '100%', marginTop: 10, padding: 11, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: G.underground, color: '#fff' }}>
          {createCipher.isPending ? '…' : 'Postavi šifru za noć'}
        </button>
      </div>
    </div>
  );
};
