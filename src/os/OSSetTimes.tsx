import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { nightDateStr } from '@/lib/nightState';
import { sortSlots, nowPlayingIndex, SetSlot } from '@/lib/setTimes';
import { OS, G, hexA, MONO } from './osTheme';

const db = supabase as any;

interface Props {
  event: { id: string; date?: string | null; start_time?: string | null; lineup?: string[] | null; set_times?: SetSlot[] | null };
  onSaved?: () => void;
}

/** Satnica — the #1 clubber ask. Shows who plays when + "sada svira";
 *  crowdsourced (first person inside enters it, earns AFC). */
export const OSSetTimes = ({ event, onSaved }: Props) => {
  const times: SetSlot[] = Array.isArray(event.set_times) ? event.set_times : [];
  const lineup = (event.lineup || []).filter(Boolean);
  const night = event.date ? nightDateStr(new Date(`${event.date}T12:00:00`)) : '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // nothing to show and nothing to enter
  if (times.length === 0 && lineup.length === 0) return null;

  const sorted = times.length ? sortSlots(times, night) : [];
  const playing = times.length ? nowPlayingIndex(sorted, night, new Date()) : -1;

  const save = async () => {
    const payload: SetSlot[] = lineup
      .map((artist) => ({ artist, time: (draft[artist] || '').trim() }))
      .filter((s) => /^\d{1,2}:\d{2}$/.test(s.time));
    if (payload.length === 0) { toast('Unesi bar jedno vreme (npr. 23:00).'); return; }
    setBusy(true);
    try {
      const { data, error } = await db.rpc('submit_set_times', { p_event: event.id, p_times: payload });
      if (error) throw error;
      if (data?.ok === false) { toast('Satnicu je već uneo neko drugi.'); }
      else { toast.success(data?.awarded ? `Satnica sačuvana ✓ · +${data.awarded} AFC` : 'Satnica ažurirana ✓'); setEditing(false); onSaved?.(); }
    } catch (e: any) {
      toast.error('Nije sačuvano — pokušaj ponovo.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ margin: '16px 16px 0', padding: 16, borderRadius: 18, background: OS.surface, border: `1px solid ${OS.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>SATNICA</span>
        {times.length > 0 && !editing && <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6 }}>OD ZAJEDNICE</span>}
      </div>

      {/* has times → timetable */}
      {times.length > 0 && !editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sorted.map((s, i) => {
            const live = i === playing;
            return (
              <div key={`${s.artist}-${s.time}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 10, background: live ? hexA(G.afterparty, 0.12) : 'transparent', border: `1px solid ${live ? hexA(G.afterparty, 0.35) : 'transparent'}` }}>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: live ? G.afterparty : OS.ink2, width: 46 }}>{s.time}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: live ? 700 : 500, color: live ? OS.ink : OS.ink2 }}>{s.artist}</span>
                {live && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, fontWeight: 600, color: G.afterparty }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: G.afterparty, animation: 'os-pulse 1.3s ease-in-out infinite' }} />SADA</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* no times yet but a lineup exists → crowdsource prompt / form */}
      {times.length === 0 && !editing && (
        <button onClick={() => setEditing(true)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 12, borderRadius: 12, background: hexA(G.house, 0.08), border: `1px dashed ${hexA(G.house, 0.4)}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: OS.ink }}>Znaš satnicu? Dodaj je.</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: G.house, marginTop: 3 }}>PRVI KO UNESE → +60 AFC · CELA SCENA TI ZAHVALJUJE</div>
        </button>
      )}

      {/* editing form */}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lineup.map((artist) => (
            <div key={artist} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontSize: 14, color: OS.ink2 }}>{artist}</span>
              <input value={draft[artist] || ''} onChange={(e) => setDraft((d) => ({ ...d, [artist]: e.target.value }))} placeholder="23:00" inputMode="numeric"
                style={{ width: 76, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 9, padding: '8px 10px', fontFamily: MONO, fontSize: 13, color: OS.ink, outline: 'none', textAlign: 'center' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => setEditing(false)} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
            <button onClick={save} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 10, background: G.house, border: 0, color: '#0B0B0D', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{busy ? '…' : 'Sačuvaj satnicu'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
