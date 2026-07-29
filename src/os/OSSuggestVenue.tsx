import { useState } from 'react';
import { toast } from 'sonner';
import { useSuggestVenue, useMySuggestions } from '@/hooks/useHiddenScene';
import { AB, G, hexA, MONO } from './osTheme';

const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const inp = { width: '100%', background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 12, padding: '11px 14px', fontSize: 14.5, color: AB.ink, outline: 'none' } as const;

const STATUS_SR: Record<string, string> = { pending: 'NA ČEKANJU', approved: 'NA MAPI ✓', rejected: 'NIJE PROŠLO' };

/**
 * „Znaš mesto?" — ulaz skrivene scene (QUEST-DOKTRINA §6, zakon #3: oskudica
 * autorstva). Predlog ide founderu na kuraciju; odobreno mesto trajno nosi
 * „OTKRIO/LA {ime}". Bez otvorenog UGC kataloga — kapija JE proizvod.
 */
export const OSSuggestVenue = () => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', area: '', why: '' });
  const suggest = useSuggestVenue();
  const { data: mine = [] } = useMySuggestions();

  const submit = () => {
    if (!f.name.trim()) { toast('Ime mesta je obavezno.'); return; }
    suggest.mutate({ name: f.name, area: f.area, why: f.why }, {
      onSuccess: () => {
        toast.success('Predlog poslat 🗺 — ako uđe na mapu, nosi tvoje ime.');
        setF({ name: '', area: '', why: '' });
        setOpen(false);
      },
      onError: (e: any) => {
        const m = String(e?.message || '');
        toast.error(
          m.includes('TOO_MANY_PENDING') ? 'Već imaš 3 predloga na čekanju — sačekaj kuraciju.'
          : m.includes('ALREADY_EXISTS') ? 'To mesto je već na mapi.'
          : 'Nije prošlo — pokušaj ponovo.');
      },
    });
  };

  return (
    <div style={{ margin: '12px 18px 0' }}>
      {!open ? (
        <button onClick={() => setOpen(true)} className="os-press" style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 16, cursor: 'pointer', background: AB.surface, border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${G.community}` }}>
          <span style={{ fontSize: 20 }}>🗺</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>Znaš mesto koje fali?</span>
            <span style={{ display: 'block', fontSize: 12, color: AB.ink2, marginTop: 2 }}>Skrivena scena raste kuracijom — ako uđe, nosi tvoje ime.</span>
          </span>
          <span style={{ color: G.community, fontSize: 17 }}>›</span>
        </button>
      ) : (
        <div style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${hexA(G.community, 0.4)}` }}>
          <div style={{ ...LABEL, color: G.community, marginBottom: 10 }}>🗺 PREDLOŽI SKRIVENO MESTO</div>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ime mesta (npr. Galerija u dvorištu…)" maxLength={80} style={inp} />
          <input value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Kvart / kako se stiže" maxLength={80} style={{ ...inp, marginTop: 8 }} />
          <textarea value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="Zašto je posebno? (1–2 rečenice)" maxLength={240} rows={2} style={{ ...inp, resize: 'none', fontFamily: 'inherit', marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => setOpen(false)} className="os-press" style={{ flex: 'none', padding: '10px 15px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
            <button onClick={submit} disabled={suggest.isPending} className="os-press" style={{ flex: 1, minHeight: 44, borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: G.community, color: '#0B0B0D' }}>
              {suggest.isPending ? '…' : 'Pošalji predlog'}
            </button>
          </div>
          {mine.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${AB.line}`, paddingTop: 9 }}>
              {mine.slice(0, 3).map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}>
                  <span style={{ fontSize: 12.5, color: AB.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ ...LABEL, fontSize: 9.5, color: s.status === 'approved' ? AB.acid : AB.ink3 }}>{STATUS_SR[s.status] || s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
