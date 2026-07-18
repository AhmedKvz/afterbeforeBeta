import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const db = supabase as any;

const TYPES: [string, string][] = [
  ['club', 'Klub'], ['bar', 'Bar'], ['splav', 'Splav'], ['cafe', 'Kafić'],
  ['restaurant', 'Restoran'], ['festival', 'Festival'], ['gallery', 'Galerija'], ['afterplace', 'After spot'],
];
// HOOD_COORDS ključevi — da pin legne na pravi deo pulse mape
const HOODS = ['Savamala', 'Dorćol', 'Vračar', 'Stari grad', 'Savski venac', 'Novi Beograd', 'Zemun', 'Centar'];

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: OS.ink, outline: 'none' };
const lbl: React.CSSProperties = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: OS.ink6, display: 'block', marginBottom: 4 };
const Field = ({ label, children }: any) => <div style={{ marginBottom: 9 }}><span style={lbl}>{label}</span>{children}</div>;

const VenueForm = ({ item, onDone }: { item: any; onDone: () => void }) => {
  const [f, setF] = useState({
    name: item?.name || '', type: item?.type || 'club', neighborhood: item?.neighborhood || 'Stari grad',
    emoji: item?.emoji || '', lat: item?.latitude ?? '', lng: item?.longitude ?? '', is_partner: item?.is_partner ?? false,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim()) { toast('Ime je obavezno.'); return; }
    setBusy(true);
    const { error } = await db.rpc('admin_save_venue', {
      p_id: item?.id ?? null, p_name: f.name.trim(), p_type: f.type, p_neighborhood: f.neighborhood,
      p_emoji: f.emoji.trim() || null, p_lat: f.lat === '' ? null : Number(f.lat), p_lng: f.lng === '' ? null : Number(f.lng),
      p_partner: f.is_partner,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Greška'); return; }
    toast.success(item ? 'Mesto izmenjeno ✓' : 'Mesto dodato ✓'); onDone();
  };

  const del = async () => {
    if (!item?.id) return;
    if (!confirm(`Obrisati „${item.name}"? (Mesta sa check-in istorijom se ne mogu brisati.)`)) return;
    setBusy(true);
    const { error } = await db.rpc('admin_delete_venue', { p_id: item.id });
    setBusy(false);
    if (error) { toast.error(error.message || 'Greška'); return; }
    toast.success('Mesto obrisano'); onDone();
  };

  return (
    <div style={{ padding: 13, borderRadius: 12, background: OS.surface, border: `1px solid ${hexA(G.community, 0.4)}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 52 }}><Field label="EMOJI"><input value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} style={{ ...inp, textAlign: 'center' }} placeholder="🎵" /></Field></div>
        <div style={{ flex: 1 }}><Field label="IME"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={inp} placeholder="Drugstore" /></Field></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="TIP">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={inp}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field></div>
        <div style={{ flex: 1 }}><Field label="KVART (za mapu)">
          <select value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} style={inp}>
            {HOODS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </Field></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="LAT (opciono)"><input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} style={inp} placeholder="44.8165" /></Field></div>
        <div style={{ flex: 1 }}><Field label="LNG (opciono)"><input value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} style={inp} placeholder="20.4645" /></Field></div>
        <div style={{ flex: 'none', alignSelf: 'flex-end', paddingBottom: 9 }}>
          <button onClick={() => setF({ ...f, is_partner: !f.is_partner })} style={{ minHeight: 36, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, border: 0, background: f.is_partner ? hexA(G.house, 0.18) : 'rgba(255,255,255,.06)', color: f.is_partner ? G.house : OS.ink5 }}>{f.is_partner ? '★ PARTNER' : 'NIJE PARTNER'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onDone} style={{ flex: 'none', minHeight: 40, padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
        {item?.id && <button onClick={del} disabled={busy} style={{ flex: 'none', minHeight: 40, padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${hexA(G.afterparty, 0.5)}`, color: G.afterparty, fontSize: 13, cursor: 'pointer' }}>Obriši</button>}
        <button onClick={save} disabled={busy} style={{ flex: 1, minHeight: 40, padding: 10, borderRadius: 10, background: G.community, border: 0, color: '#0B0B0D', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{busy ? '…' : 'Sačuvaj'}</button>
      </div>
    </div>
  );
};

export const WarRoomVenues = () => {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(undefined); // undefined=none, null=new, obj=edit
  const [typeF, setTypeF] = useState<string>('all');

  const { data: venues = [] } = useQuery({
    queryKey: ['admin-venues-full'],
    queryFn: async () => { const { data } = await db.from('venues').select('id, name, type, neighborhood, emoji, latitude, longitude, is_partner, claim_status').order('type').order('name'); return data || []; },
  });

  const shown = venues.filter((v: any) => typeF === 'all' || v.type === typeF);
  const done = () => {
    setEdit(undefined);
    qc.invalidateQueries({ queryKey: ['admin-venues-full'] });
    qc.invalidateQueries({ queryKey: ['admin-venues'] });      // events form dropdown
    qc.invalidateQueries({ queryKey: ['venue-directory'] });   // heat mapa (staleTime ∞)
  };

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink6, marginBottom: 12, lineHeight: 1.5 }}>
        IMENIK MESTA — ODVOJENO OD DOGAĐAJA. KVART ODREĐUJE POZICIJU NA PULSE MAPI.
      </div>

      {edit === undefined && (
        <>
          <div className="os-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
            {[['all', `Sve · ${venues.length}`], ...TYPES.map(([v, l]) => [v, `${l} · ${venues.filter((x: any) => x.type === v).length}`] as [string, string])].map(([v, l]) => (
              <button key={v} onClick={() => setTypeF(v)} style={{ flex: 'none', minHeight: 36, cursor: 'pointer', padding: '7px 12px', borderRadius: 9, fontFamily: MONO, fontSize: 10.5, fontWeight: 600, border: `1px solid ${typeF === v ? 'transparent' : OS.line2}`, background: typeF === v ? hexA(G.community, 0.16) : 'transparent', color: typeF === v ? G.community : OS.ink5, whiteSpace: 'nowrap' }}>{l}</button>
            ))}
          </div>
          <button onClick={() => setEdit(null)} style={{ width: '100%', minHeight: 40, padding: '10px 12px', borderRadius: 10, border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 600, background: hexA(G.community, 0.16), color: G.community, marginBottom: 12 }}>+ NOVO MESTO</button>
        </>
      )}

      {edit !== undefined && <VenueForm item={edit} onDone={done} />}

      {edit === undefined && shown.map((v: any) => (
        <button key={v.id} onClick={() => setEdit(v)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: 11, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}`, marginBottom: 7, cursor: 'pointer' }}>
          <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{v.emoji || '🎵'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: OS.ink }}>{v.name}{v.is_partner ? ' ★' : ''}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{(v.type || '').toUpperCase()} · {(v.neighborhood || '—').toUpperCase()}{v.latitude == null ? ' · BEZ KOORDINATA' : ''}</div>
          </div>
          <span style={{ color: OS.ink6, fontSize: 13 }}>✎</span>
        </button>
      ))}
    </div>
  );
};
