import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const db = supabase as any;

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: OS.ink, outline: 'none' };
const lbl: React.CSSProperties = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: OS.ink6, display: 'block', marginBottom: 4 };
const Field = ({ label, children }: any) => <div style={{ marginBottom: 9 }}><span style={lbl}>{label}</span>{children}</div>;

const csv = (arr?: string[] | null) => (arr || []).join(', ');
const parseCsv = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);

interface Venue { id: string; name: string; type: string | null; }

/* ── Single-event editor ── */
const EventForm = ({ item, venues, onDone }: { item: any; venues: Venue[]; onDone: () => void }) => {
  // events link the venue by name (no venue_id column) — resolve the dropdown
  // selection back to a uuid when editing an existing event.
  const initialVenueId = item?.venue_name ? (venues.find((v) => v.name === item.venue_name)?.id || '') : '';
  const [f, setF] = useState({
    title: item?.title || '',
    venue_id: initialVenueId,
    date: item?.date || today(),
    start_time: (item?.start_time || '23:00').slice(0, 5),
    end_time: (item?.end_time || '').slice(0, 5),
    genres: csv(item?.music_genres),
    lineup: csv(item?.lineup),
    image_url: item?.image_url || '',
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.title.trim()) { toast('Naziv je obavezan.'); return; }
    if (!f.venue_id) { toast('Izaberi klub.'); return; }
    setBusy(true);
    const { error } = await db.rpc('admin_save_event', {
      p_id: item?.id ?? null,
      p_title: f.title.trim(),
      p_venue_id: f.venue_id,
      p_date: f.date,
      p_start: f.start_time || '23:00',
      p_end: f.end_time || null,
      p_genres: parseCsv(f.genres),
      p_lineup: parseCsv(f.lineup),
      p_image_url: f.image_url.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Greška'); return; }
    toast.success(item ? 'Događaj izmenjen ✓' : 'Događaj kreiran ✓'); onDone();
  };

  const del = async () => {
    if (!item?.id) return;
    if (!confirm(`Obrisati „${item.title}"? Ovo se ne može vratiti.`)) return;
    setBusy(true);
    const { error } = await db.rpc('admin_delete_event', { p_id: item.id });
    setBusy(false);
    if (error) { toast.error(error.message || 'Greška'); return; }
    toast.success('Događaj obrisan'); onDone();
  };

  return (
    <div style={{ padding: 13, borderRadius: 12, background: OS.surface, border: `1px solid ${hexA(G.techno, 0.4)}`, marginBottom: 8 }}>
      <Field label="NAZIV"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={inp} placeholder="MAGLA Showcase" /></Field>
      <Field label="KLUB / MESTO">
        <select value={f.venue_id} onChange={(e) => setF({ ...f, venue_id: e.target.value })} style={inp}>
          <option value="">— izaberi —</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.type ? ` · ${v.type}` : ''}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1.2 }}><Field label="DATUM"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={inp} /></Field></div>
        <div style={{ flex: 1 }}><Field label="OD"><input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} style={inp} /></Field></div>
        <div style={{ flex: 1 }}><Field label="DO"><input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} style={inp} /></Field></div>
      </div>
      <Field label="ŽANROVI (zarezom)"><input value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} style={inp} placeholder="techno, hard techno" /></Field>
      <Field label="LINEUP (zarezom)"><input value={f.lineup} onChange={(e) => setF({ ...f, lineup: e.target.value })} style={inp} placeholder="MAGLA, BLR" /></Field>
      <Field label="SLIKA URL (opciono)"><input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} style={inp} placeholder="https://…" /></Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onDone} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
        {item?.id && <button onClick={del} disabled={busy} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${hexA(G.afterparty, 0.5)}`, color: G.afterparty, fontSize: 13, cursor: 'pointer' }}>Obriši</button>}
        <button onClick={save} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 10, background: G.techno, border: 0, color: '#0B0B0D', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{busy ? '…' : 'Sačuvaj'}</button>
      </div>
    </div>
  );
};

/* ── Bulk "paste the weekend" ── one line per event:
   datum | klub | vreme | naslov | žanrovi | lineup            */
interface ParsedRow { ok: boolean; err?: string; date?: string; venue?: Venue; start?: string; title?: string; genres?: string[]; lineup?: string[]; raw: string; }

const parseDate = (s: string): string | null => {
  const t = s.trim();
  // DD.MM. or DD.MM.YYYY  (also tolerate DD/MM)
  const m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/]?(\d{4})?\.?$/);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = m[3] ? +m[3] : new Date().getFullYear();
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const parseTime = (s: string): string => {
  const m = s.trim().match(/^(\d{1,2})[:h.]?(\d{2})?$/);
  if (!m) return '23:00';
  return `${String(+m[1]).padStart(2, '0')}:${m[2] || '00'}`;
};

const BulkPaste = ({ venues, onDone }: { venues: Venue[]; onDone: () => void }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const byName = useMemo(() => { const m = new Map<string, Venue>(); venues.forEach((v) => m.set(v.name.toLowerCase(), v)); return m; }, [venues]);

  const rows: ParsedRow[] = useMemo(() => text.split('\n').map((line) => line.trim()).filter(Boolean).map((raw) => {
    const parts = raw.split('|').map((p) => p.trim());
    if (parts.length < 4) return { ok: false, err: 'premalo polja (treba: datum | klub | vreme | naslov | …)', raw };
    const [dRaw, vRaw, tRaw, title, gRaw, lRaw] = parts;
    const date = parseDate(dRaw);
    if (!date) return { ok: false, err: `datum „${dRaw}"`, raw };
    const venue = byName.get(vRaw.toLowerCase());
    if (!venue) return { ok: false, err: `nepoznat klub „${vRaw}"`, raw };
    if (!title) return { ok: false, err: 'nema naziva', raw };
    return { ok: true, date, venue, start: parseTime(tRaw), title, genres: parseCsv(gRaw || ''), lineup: parseCsv(lRaw || ''), raw };
  }), [text, byName]);

  const good = rows.filter((r) => r.ok);
  const bad = rows.filter((r) => !r.ok);

  const saveAll = async () => {
    if (good.length === 0) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const r of good) {
      const { error } = await db.rpc('admin_save_event', {
        p_id: null, p_title: r.title, p_venue_id: r.venue!.id, p_date: r.date,
        p_start: r.start, p_end: null, p_genres: r.genres, p_lineup: r.lineup, p_image_url: null,
      });
      if (error) fail++; else ok++;
    }
    setBusy(false);
    toast.success(`Uneto ${ok}${fail ? ` · ${fail} palo` : ''}${bad.length ? ` · ${bad.length} odbačeno` : ''}`);
    setText('');
    onDone();
  };

  return (
    <div style={{ padding: 13, borderRadius: 12, background: OS.surface, border: `1px solid ${hexA(G.festival, 0.4)}`, marginBottom: 8 }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', color: OS.ink5, lineHeight: 1.6, marginBottom: 8 }}>
        JEDAN RED = JEDAN DOGAĐAJ<br />
        <span style={{ color: OS.ink6 }}>datum | klub | vreme | naslov | žanrovi | lineup</span><br />
        <span style={{ color: OS.ink6 }}>12.07. | Drugstore | 23:00 | MAGLA Showcase | techno | MAGLA, BLR</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} style={{ ...inp, resize: 'vertical', fontFamily: MONO, fontSize: 12 }} placeholder="Nalepi vikend ovde…" />
      {rows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: OS.ink6, marginBottom: 6 }}>PREGLED · {good.length} OK{bad.length ? ` · ${bad.length} GREŠKA` : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 9px', borderRadius: 8, background: r.ok ? hexA(G.festival, 0.08) : hexA(G.afterparty, 0.1), border: `1px solid ${r.ok ? hexA(G.festival, 0.25) : hexA(G.afterparty, 0.35)}` }}>
                <span style={{ flex: 'none', fontSize: 11 }}>{r.ok ? '✓' : '✕'}</span>
                {r.ok
                  ? <span style={{ color: OS.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ fontFamily: MONO, color: G.techno }}>{r.date} {r.start}</span> · {r.venue!.name} · {r.title}</span>
                  : <span style={{ color: OS.ink4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: G.afterparty }}>{r.err}</span> — <span style={{ fontFamily: MONO, color: OS.ink6 }}>{r.raw}</span></span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={onDone} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
        <button onClick={saveAll} disabled={busy || good.length === 0} style={{ flex: 1, padding: 10, borderRadius: 10, background: good.length ? G.festival : 'rgba(255,255,255,.06)', border: 0, color: good.length ? '#0B0B0D' : OS.ink6, fontWeight: 600, fontSize: 14, cursor: good.length ? 'pointer' : 'default' }}>{busy ? '…' : `Unesi ${good.length}`}</button>
      </div>
    </div>
  );
};

const Row = ({ item, onEdit }: { item: any; onEdit: () => void }) => (
  <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: 11, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}`, marginBottom: 7, cursor: 'pointer' }}>
    <div style={{ flex: 'none', width: 46, textAlign: 'center' }}>
      <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: G.techno, lineHeight: 1 }}>{(item.date || '').slice(8, 10)}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: OS.ink6, marginTop: 2 }}>{(item.date || '').slice(5, 7)}.</div>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: OS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{(item.venue_name || '—')} · {(item.start_time || '').slice(0, 5)}</div>
    </div>
    <span style={{ color: OS.ink6, fontSize: 13 }}>✎</span>
  </button>
);

export const WarRoomEvents = () => {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(undefined); // undefined=none, null=new, obj=edit
  const [bulk, setBulk] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ['admin-venues'],
    queryFn: async () => { const { data } = await db.from('venues').select('id, name, type').order('name'); return data || []; },
  });
  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => { const { data } = await db.from('events').select('id, title, date, start_time, end_time, venue_name, music_genres, lineup, image_url').order('date', { ascending: true }); return data || []; },
  });

  const t = today();
  const upcoming = events.filter((e: any) => (e.date || '') >= t);
  const past = events.filter((e: any) => (e.date || '') < t).reverse();

  const done = () => {
    setEdit(undefined); setBulk(false);
    qc.invalidateQueries({ queryKey: ['admin-events'] });
    qc.invalidateQueries({ queryKey: ['os-events'] });        // Home
    qc.invalidateQueries({ queryKey: ['venue-directory'] });  // heat radius map (staleTime ∞)
  };

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink6, marginBottom: 14, lineHeight: 1.5 }}>
        TI PUNIŠ PROGRAM. KLUB SE BIRA IZ LISTE — IME, LOKACIJA I GEOFENCE SE POVLAČE AUTOMATSKI.
      </div>

      {edit === undefined && !bulk && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setEdit(null)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 600, background: hexA(G.techno, 0.16), color: G.techno }}>+ NOVI DOGAĐAJ</button>
          <button onClick={() => setBulk(true)} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 600, background: hexA(G.festival, 0.16), color: G.festival }}>⚡ ZALEPI VIKEND</button>
        </div>
      )}

      {bulk && <BulkPaste venues={venues} onDone={done} />}
      {edit !== undefined && <EventForm item={edit} venues={venues} onDone={done} />}

      {edit === undefined && !bulk && (
        <>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 10 }}>NADOLAZEĆI · {upcoming.length}</div>
          {upcoming.length === 0
            ? <div style={{ fontFamily: MONO, fontSize: 12, color: OS.ink5, textAlign: 'center', padding: '20px 0' }}>Nema nadolazećih. Dodaj vikend ↑</div>
            : upcoming.map((e: any) => <Row key={e.id} item={e} onEdit={() => setEdit(e)} />)}

          {past.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button onClick={() => setShowPast((v) => !v)} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginBottom: 10 }}>PROŠLI · {past.length} {showPast ? '▾' : '▸'}</button>
              {showPast && <div style={{ opacity: 0.6 }}>{past.slice(0, 15).map((e: any) => <Row key={e.id} item={e} onEdit={() => setEdit(e)} />)}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
};
