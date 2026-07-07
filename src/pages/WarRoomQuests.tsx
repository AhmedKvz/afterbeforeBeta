import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const db = supabase as any;

// Only tracked types (each has an OS action that measures progress — QUEST lock rule).
const QUEST_TYPES: [string, string][] = [
  ['check_in', 'Check-in · gustina'], ['explore', 'Novi teren'], ['review', 'Recenzija · vodič'],
  ['story', 'Story · dokument'], ['dance', 'Dance · energija'], ['signal', 'Idem · najava'],
  ['match', 'Spark · veza'], ['social', 'Uzvrati · veza'], ['vote_best_party', 'Glas'],
];

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 9, padding: '9px 11px', fontSize: 13, color: OS.ink, outline: 'none' };
const lbl: React.CSSProperties = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: OS.ink6, display: 'block', marginBottom: 4 };

const Field = ({ label, children }: any) => <div style={{ marginBottom: 9 }}><span style={lbl}>{label}</span>{children}</div>;

/* ── Weekly quest editor ── */
const QuestForm = ({ item, onDone }: { item: any; onDone: () => void }) => {
  const [f, setF] = useState({
    title: item?.title || '', description: item?.description || '', quest_type: item?.quest_type || 'check_in',
    target_count: item?.target_count || 2, xp_reward: item?.xp_reward ?? 150, icon: item?.icon || '🎯', is_active: item?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.title.trim()) { toast('Naziv je obavezan.'); return; }
    setBusy(true);
    const { error } = await db.rpc('admin_save_quest', {
      p_id: item?.id ?? null, p_title: f.title, p_description: f.description, p_quest_type: f.quest_type,
      p_target: Number(f.target_count), p_xp: Number(f.xp_reward), p_icon: f.icon, p_active: f.is_active,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Greška'); return; }
    toast.success(item ? 'Quest izmenjen ✓' : 'Quest kreiran ✓'); onDone();
  };
  return (
    <div style={{ padding: 13, borderRadius: 12, background: OS.surface, border: `1px solid ${hexA(G.underground, 0.4)}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 52 }}><Field label="IKONA"><input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} style={{ ...inp, textAlign: 'center' }} /></Field></div>
        <div style={{ flex: 1 }}><Field label="NAZIV"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={inp} placeholder="Vikend ritual" /></Field></div>
      </div>
      <Field label="OPIS"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Scene-voice, ne domaći zadatak…" /></Field>
      <Field label="TIP (mora imati akciju u appu)">
        <select value={f.quest_type} onChange={(e) => setF({ ...f, quest_type: e.target.value })} style={inp}>
          {QUEST_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="CILJ"><input type="number" min={1} value={f.target_count} onChange={(e) => setF({ ...f, target_count: +e.target.value })} style={inp} /></Field></div>
        <div style={{ flex: 1 }}><Field label="XP / AFC"><input type="number" min={0} step={25} value={f.xp_reward} onChange={(e) => setF({ ...f, xp_reward: +e.target.value })} style={inp} /></Field></div>
        <div style={{ flex: 'none', alignSelf: 'flex-end', paddingBottom: 9 }}>
          <button onClick={() => setF({ ...f, is_active: !f.is_active })} style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, border: 0, background: f.is_active ? hexA(G.festival, 0.18) : 'rgba(255,255,255,.06)', color: f.is_active ? G.festival : OS.ink5 }}>{f.is_active ? 'AKTIVAN' : 'UGAŠEN'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onDone} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
        <button onClick={save} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 10, background: G.underground, border: 0, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{busy ? '…' : 'Sačuvaj'}</button>
      </div>
    </div>
  );
};

/* ── Sponsored quest editor ── */
const SponsoredForm = ({ item, onDone }: { item: any; onDone: () => void }) => {
  const [f, setF] = useState({
    venue_name: item?.venue_name || '', logo: item?.logo || '⭐', title: item?.title || '', description: item?.description || '',
    reward_label: item?.reward_label || '', target_count: item?.target_count || 1, xp_reward: item?.xp_reward ?? 100, spots_label: item?.spots_label || '', is_active: item?.is_active ?? true,
    kind: item?.kind || 'perk', media: item?.media || 'photo', rule: item?.rule || 'checkin',
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.title.trim()) { toast('Naziv je obavezan.'); return; }
    setBusy(true);
    const { error } = await db.rpc('admin_save_sponsored', {
      p_id: item?.id ?? null, p_venue_name: f.venue_name, p_logo: f.logo, p_title: f.title, p_description: f.description,
      p_reward_label: f.reward_label, p_target: Number(f.target_count), p_xp: Number(f.xp_reward), p_spots_label: f.spots_label, p_active: f.is_active,
      p_kind: f.kind, p_media: f.media, p_rule: f.rule,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Greška'); return; }
    toast.success(item ? 'Sponsored izmenjen ✓' : 'Sponsored kreiran ✓'); onDone();
  };
  return (
    <div style={{ padding: 13, borderRadius: 12, background: OS.surface, border: `1px solid ${hexA(G.house, 0.4)}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 52 }}><Field label="LOGO"><input value={f.logo} onChange={(e) => setF({ ...f, logo: e.target.value })} style={{ ...inp, textAlign: 'center' }} /></Field></div>
        <div style={{ flex: 1 }}><Field label="PARTNER"><input value={f.venue_name} onChange={(e) => setF({ ...f, venue_name: e.target.value })} style={inp} placeholder="Kult" /></Field></div>
      </div>
      <Field label="NAZIV"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={inp} placeholder="Open frame — tema, ne skripta" /></Field>
      <Field label="OPIS"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="TIP"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={inp}><option value="perk">Perk (nagrada na licu mesta)</option><option value="content">Content (foto/video + glasanje)</option></select></Field></div>
        {f.kind === 'content' && <div style={{ flex: 1 }}><Field label="FORMAT"><select value={f.media} onChange={(e) => setF({ ...f, media: e.target.value })} style={inp}><option value="photo">Foto</option><option value="video">Video</option><option value="both">Foto + video</option></select></Field></div>}
        {f.kind === 'perk' && <div style={{ flex: 1 }}><Field label="ZAVRŠAVA SE"><select value={f.rule} onChange={(e) => setF({ ...f, rule: e.target.value })} style={inp}><option value="checkin">Check-in (broji dolaske)</option><option value="checkin_early">Rani dolazak</option><option value="checkin_crew">Dovedeš ekipu</option></select></Field></div>}
      </div>
      <Field label="NAGRADA"><input value={f.reward_label} onChange={(e) => setF({ ...f, reward_label: e.target.value })} style={inp} placeholder="Karte / putovanje / roba / gajba" /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><Field label="MESTA"><input value={f.spots_label} onChange={(e) => setF({ ...f, spots_label: e.target.value })} style={inp} placeholder="50 mesta" /></Field></div>
        <div style={{ flex: 'none', alignSelf: 'flex-end', paddingBottom: 9 }}>
          <button onClick={() => setF({ ...f, is_active: !f.is_active })} style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, border: 0, background: f.is_active ? hexA(G.festival, 0.18) : 'rgba(255,255,255,.06)', color: f.is_active ? G.festival : OS.ink5 }}>{f.is_active ? 'AKTIVAN' : 'UGAŠEN'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onDone} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
        <button onClick={save} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 10, background: G.house, border: 0, color: '#0B0B0D', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{busy ? '…' : 'Sačuvaj'}</button>
      </div>
    </div>
  );
};

const Row = ({ icon, title, sub, active, onEdit }: any) => (
  <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: 11, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}`, marginBottom: 7, cursor: 'pointer', opacity: active ? 1 : 0.5 }}>
    <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: OS.ink }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{sub}</div>
    </div>
    {!active && <span style={{ fontFamily: MONO, fontSize: 8, color: OS.ink6 }}>UGAŠEN</span>}
    <span style={{ color: OS.ink6, fontSize: 13 }}>✎</span>
  </button>
);

export const WarRoomQuests = () => {
  const qc = useQueryClient();
  const [editQ, setEditQ] = useState<any>(undefined); // undefined=none, null=new, obj=edit
  const [editS, setEditS] = useState<any>(undefined);

  const { data: quests = [] } = useQuery({
    queryKey: ['admin-quests'],
    queryFn: async () => { const { data } = await db.from('quests').select('*').order('is_active', { ascending: false }).order('title'); return data || []; },
  });
  const { data: sponsored = [] } = useQuery({
    queryKey: ['admin-sponsored'],
    queryFn: async () => { const { data } = await db.from('sponsored_quests').select('*').order('is_active', { ascending: false }).order('sort'); return data || []; },
  });

  const doneQ = () => { setEditQ(undefined); qc.invalidateQueries({ queryKey: ['admin-quests'] }); qc.invalidateQueries({ queryKey: ['quests'] }); };
  const doneS = () => { setEditS(undefined); qc.invalidateQueries({ queryKey: ['admin-sponsored'] }); qc.invalidateQueries({ queryKey: ['sponsored-quests'] }); };

  return (
    <div>
      {/* Weekly */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>NEDELJNI QUESTOVI · {quests.length}</span>
        {editQ === undefined && <button onClick={() => setEditQ(null)} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: G.underground, background: hexA(G.underground, 0.14), border: 0, borderRadius: 8, padding: '5px 11px', cursor: 'pointer' }}>+ NOVI</button>}
      </div>
      {editQ !== undefined && <QuestForm item={editQ} onDone={doneQ} />}
      {editQ === undefined && quests.map((q: any) => (
        <Row key={q.id} icon={q.icon || '🎯'} title={q.title} sub={`${(q.quest_type || '').toUpperCase()} · ${q.target_count} · ${q.xp_reward} XP`} active={q.is_active} onEdit={() => setEditQ(q)} />
      ))}

      {/* Sponsored */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 10px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: G.house }}>★ SPONSORED · {sponsored.length}</span>
        {editS === undefined && <button onClick={() => setEditS(null)} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: G.house, background: hexA(G.house, 0.14), border: 0, borderRadius: 8, padding: '5px 11px', cursor: 'pointer' }}>+ NOVI</button>}
      </div>
      {editS !== undefined && <SponsoredForm item={editS} onDone={doneS} />}
      {editS === undefined && sponsored.map((s: any) => (
        <Row key={s.id} icon={s.logo || '⭐'} title={s.title} sub={`${(s.venue_name || '').toUpperCase()} · ${s.reward_label || ''}`} active={s.is_active} onEdit={() => setEditS(s)} />
      ))}
    </div>
  );
};
