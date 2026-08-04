import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVenueDirectory } from '@/hooks/useHeatVenues';
import { track } from '@/lib/analytics';
import { OSCrew } from './OSCrew';
import { AB, G, hexA, MONO } from './osTheme';

const db = supabase as any;
const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const DOW = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'];
const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];

/** Vrste su samo etikete iste stvari — grupe sa mestima (founder 2026-08-03). */
const KINDS = [
  { id: 'predzurka', label: 'Predžurka', emoji: '🏠', col: G.house },
  { id: 'izlazak', label: 'Izlazak', emoji: '🌃', col: G.techno },
  { id: 'par', label: 'Par za par', emoji: '👥', col: G.afterparty },
  { id: 'after', label: 'After', emoji: '🌅', col: G.underground },
  { id: 'putovanje', label: 'Putovanje', emoji: '🚐', col: G.community },
] as const;
const kindOf = (k: string) => KINDS.find((x) => x.id === k) || KINDS[1];

const ERR: Record<string, string> = {
  FULL: 'Popunjeno — probaj drugu grupu.',
  PASSED: 'Ta noć je prošla.',
  TOO_MANY_GROUPS: 'Imaš već 3 otvorene grupe.',
  TITLE_REQUIRED: 'Napiši naziv grupe.',
  DISABLED: 'Trenutno nedostupno.',
};
const errMsg = (e: any) => {
  const m = String(e?.message || '');
  const k = Object.keys(ERR).find((x) => m.includes(x));
  return k ? ERR[k] : 'Nije prošlo — pokušaj ponovo.';
};

const nightLabel = (d: string) => {
  try {
    const dt = new Date(d + 'T12:00:00');
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'VEČERAS';
    if (diff === 1) return 'SUTRA';
    return `${DOW[dt.getDay()]} ${dt.getDate()}. ${MON[dt.getMonth()]}`;
  } catch { return ''; }
};

interface Group {
  id: string; kind: string; title: string; note: string | null; night: string;
  cap: number; taken: number; im_in: boolean; venue_name: string | null; together: number;
  members: { user_id: string; name: string; avatar: string | null }[];
}

/**
 * GRUPE — jedna mehanika: otvorena grupa sa mestima, do 6 (founder: „u osnovi
 * samo neka imaju join in 6 — predžurka, par, itd."). Predžurka / par / izlazak
 * / after su VRSTE iste stvari. Popuni se → grupni chat. Sve besplatno.
 */
export const OSGroups = () => {
  const qc = useQueryClient();
  const [make, setMake] = useState(false);
  const [openCrew, setOpenCrew] = useState<Group | null>(null);
  const [f, setF] = useState({ kind: 'predzurka', title: '', note: '', cap: 6, venue: '', night: '' });
  const { data: dir } = useVenueDirectory();
  const venues: any[] = (dir?.venues || []).filter((v: any) => !v.active_until);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['open-groups'],
    staleTime: 30_000,
    refetchInterval: 90_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_open_groups');
      if (error) throw error;
      return data || [];
    },
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['open-groups'] });
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc('create_group', {
        p_kind: f.kind, p_title: f.title, p_note: f.note || null,
        p_night: f.night || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        p_cap: f.cap, p_venue: f.venue || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { track('group_create', { kind: f.kind }); toast.success('Grupa je otvorena ✦'); setMake(false); setF({ ...f, title: '', note: '' }); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const join = useMutation({
    mutationFn: async (id: string) => { const { data, error } = await db.rpc('join_group', { p_crew: id }); if (error) throw error; return data; },
    onSuccess: (r: any) => { track('group_join', {}); toast.success(r?.already ? 'Već si unutra.' : `Ušao/la si — ${r.taken}/${r.cap}`); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const leave = useMutation({
    mutationFn: async (id: string) => { const { data, error } = await db.rpc('leave_group', { p_crew: id }); if (error) throw error; return data; },
    onSuccess: () => { toast('Izašao/la si iz grupe.'); inv(); },
  });

  const inp = { width: '100%', background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: AB.ink, outline: 'none' } as const;
  const minNight = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: '0 18px' }}>
      {/* napravi grupu */}
      {!make ? (
        <button onClick={() => setMake(true)} className="os-press"
          style={{ width: '100%', padding: 15, borderRadius: 16, cursor: 'pointer', textAlign: 'left', background: 'var(--ab-acid-soft)', border: `1px solid ${AB.acidDim}` }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.01em', color: AB.ink }}>Otvori svoju grupu</div>
          <div style={{ fontSize: 13, color: AB.ink2, marginTop: 4 }}>Predžurka, izlazak, par za par, after — do 6 ljudi. Ostali se prijave.</div>
        </button>
      ) : (
        <div style={{ padding: 15, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.acidDim}` }}>
          <div style={{ ...LABEL, color: AB.acid, marginBottom: 10 }}>NOVA GRUPA</div>
          <div className="os-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 10 }}>
            {KINDS.map((k) => {
              const on = f.kind === k.id;
              return (
                <button key={k.id} onClick={() => setF({ ...f, kind: k.id })} className="os-press" type="button"
                  style={{ flex: 'none', cursor: 'pointer', padding: '8px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${on ? 'transparent' : AB.line}`, background: on ? hexA(k.col, 0.22) : 'transparent', color: on ? AB.ink : AB.ink3 }}>
                  {k.emoji} {k.label}
                </button>
              );
            })}
          </div>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Naziv (npr. Predžurka kod mene)" style={inp} maxLength={60} />
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Kratko — šta, gde otprilike" style={{ ...inp, marginTop: 8 }} maxLength={120} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <label style={{ flex: 1, ...LABEL }}>NOĆ
              <input type="date" value={f.night || minNight} min={minNight} onChange={(e) => setF({ ...f, night: e.target.value })} style={{ ...inp, marginTop: 4 }} />
            </label>
            <label style={{ flex: 'none', width: 92, ...LABEL }}>MESTA
              <input type="number" min={2} max={6} value={f.cap} onChange={(e) => setF({ ...f, cap: Math.min(6, Math.max(2, +e.target.value)) })} style={{ ...inp, marginTop: 4 }} />
            </label>
          </div>
          <select value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} style={{ ...inp, marginTop: 8, appearance: 'auto' }}>
            <option value="">— mesto (opciono) —</option>
            {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setMake(false)} className="os-press" style={{ flex: 'none', padding: '11px 16px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 13.5, cursor: 'pointer' }}>Otkaži</button>
            <button onClick={() => create.mutate()} disabled={create.isPending} className="os-press" style={{ flex: 1, minHeight: 46, borderRadius: 999, border: 0, background: AB.acid, color: AB.acidInk, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {create.isPending ? '…' : 'Otvori grupu'}
            </button>
          </div>
        </div>
      )}

      {/* spisak */}
      <div style={{ ...LABEL, margin: '22px 0 11px' }}>OTVORENE GRUPE</div>
      {isLoading && <div style={{ ...LABEL, textAlign: 'center', padding: '26px 0' }}>UČITAVA…</div>}
      {!isLoading && groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '26px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: AB.ink }}>Još nema otvorenih grupa.</div>
          <div style={{ fontSize: 13.5, color: AB.ink2, marginTop: 6 }}>Otvori prvu — ostali se prijavljuju u jedan tap.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map((g) => {
          const k = kindOf(g.kind);
          const free = Math.max(0, g.cap - g.taken);
          return (
            <div key={g.id} style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${g.im_in ? AB.acidDim : AB.line}`, borderLeft: `3px solid ${k.col}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: k.col }}>{k.emoji} {k.label.toUpperCase()}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: AB.ink3 }}>{nightLabel(g.night)}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', color: AB.ink, marginTop: 5 }}>{g.title}</div>
              {g.note && <div style={{ fontSize: 13, color: AB.ink2, marginTop: 3 }}>{g.note}</div>}
              {g.venue_name && <div style={{ fontFamily: MONO, fontSize: 10.5, color: AB.ink3, marginTop: 4 }}>📍 {g.venue_name.toUpperCase()}</div>}

              {g.together > 0 && (
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.05em', color: AB.acid, marginTop: 7 }}>
                  ✦ BILI STE NA ISTIM NOĆIMA
                </div>
              )}

              {/* mesta — vizuelno, kao u mockupu */}
              <div style={{ display: 'flex', gap: 6, marginTop: 11 }}>
                {Array.from({ length: g.cap }).map((_, i) => {
                  const m = g.members[i];
                  return m ? (
                    <span key={i} title={m.name} style={{ flex: 1, aspectRatio: '1', maxWidth: 40, borderRadius: '50%', background: m.avatar ? `center/cover url(${m.avatar})` : `linear-gradient(140deg,${G.underground},${G.techno})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                      {!m.avatar && (m.name || '?').charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <span key={i} style={{ flex: 1, aspectRatio: '1', maxWidth: 40, borderRadius: '50%', border: `1.5px dashed ${AB.line2}` }} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 11 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: free === 0 ? AB.ink3 : AB.ink2 }}>
                  {g.taken}/{g.cap} · {free === 0 ? 'POPUNJENO' : `${free} ${free === 1 ? 'MESTO' : 'MESTA'}`}
                </span>
                {g.im_in ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => leave.mutate(g.id)} className="os-press" style={{ padding: '9px 14px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 12.5, cursor: 'pointer' }}>Izađi</button>
                    <button onClick={() => setOpenCrew(g)} className="os-press" style={{ padding: '9px 16px', borderRadius: 999, border: 0, background: AB.acid, color: AB.acidInk, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Chat</button>
                  </div>
                ) : (
                  <button onClick={() => join.mutate(g.id)} disabled={free === 0 || join.isPending} className="os-press"
                    style={{ minHeight: 42, padding: '0 20px', borderRadius: 999, border: 0, cursor: free === 0 ? 'default' : 'pointer', fontSize: 14, fontWeight: 700, background: free === 0 ? AB.raised : AB.acid, color: free === 0 ? AB.ink3 : AB.acidInk }}>
                    {free === 0 ? 'Popunjeno' : 'Uđi'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openCrew && <OSCrew eventId={null} venueId={null} title={openCrew.title} onClose={() => setOpenCrew(null)} crewId={openCrew.id} />}
    </div>
  );
};
