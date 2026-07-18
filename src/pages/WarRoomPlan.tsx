import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isFounder } from '@/lib/founder';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const db = supabase as any;
const REPO = 'https://github.com/AhmedKvz/afterbeforeBeta/blob/main';

const ST: Record<string, { label: string; col: string }> = {
  todo: { label: 'TODO', col: OS.ink6 },
  doing: { label: 'RADI SE', col: G.techno },
  done: { label: 'GOTOVO', col: G.festival },
  blocked: { label: 'BLOKIRANO', col: G.afterparty },
};
const CYCLE = ['todo', 'doing', 'done', 'blocked'];

/** War Room PLAN — timski task board (baza, ne localStorage): B1 pilot
 *  checklista + sve buduće. Founder + war_members (PM/mentor) rade zajedno. */
export const WarRoomPlan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const founder = isFounder(user);
  const [statusF, setStatusF] = useState<string>('all');
  const [q, setQ] = useState('');
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({});

  const { data: tasks = [] } = useQuery({
    queryKey: ['war-tasks'],
    queryFn: async () => {
      const { data } = await db.from('war_tasks').select('*').order('sort');
      return data || [];
    },
  });
  const { data: members = [] } = useQuery({
    queryKey: ['war-members'],
    queryFn: async () => { const { data } = await db.from('war_members').select('*').order('added_at'); return data || []; },
  });

  const setStatus = async (t: any) => {
    const next = CYCLE[(CYCLE.indexOf(t.status) + 1) % CYCLE.length];
    await db.from('war_tasks').update({ status: next, updated_at: new Date().toISOString() }).eq('id', t.id);
    qc.invalidateQueries({ queryKey: ['war-tasks'] });
  };
  const setOwner = async (t: any) => {
    const owner = prompt('Vlasnik taska (ime ili inicijali):', t.owner || '');
    if (owner === null) return;
    await db.from('war_tasks').update({ owner: owner.trim() || null }).eq('id', t.id);
    qc.invalidateQueries({ queryKey: ['war-tasks'] });
  };
  const addTask = async (section: string) => {
    const title = prompt(`Novi task u „${section}":`);
    if (!title?.trim()) return;
    await db.from('war_tasks').insert({ section, title: title.trim(), sort: 9000 + Math.floor(Math.random() * 999) });
    qc.invalidateQueries({ queryKey: ['war-tasks'] });
  };
  const addMember = async () => {
    const email = prompt('Email osobe (mora imati nalog u appu):');
    if (!email?.trim()) return;
    const role = prompt('Uloga (pm / mentor / member):', 'pm') || 'member';
    const { error } = await db.rpc('war_add_member', { p_email: email.trim(), p_role: role.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success('Dodat u War Room ✓');
    qc.invalidateQueries({ queryKey: ['war-members'] });
  };

  const filtered = useMemo(() => tasks.filter((t: any) => {
    if (statusF !== 'all' && t.status !== statusF) return false;
    if (q && !(`${t.title} ${t.section} ${t.owner || ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [tasks, statusF, q]);

  const sections = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach((t: any) => { if (!map.has(t.section)) map.set(t.section, []); map.get(t.section)!.push(t); });
    return Array.from(map.entries());
  }, [filtered]);

  const total = tasks.length;
  const done = tasks.filter((t: any) => t.status === 'done').length;
  const doing = tasks.filter((t: any) => t.status === 'doing').length;
  const blocked = tasks.filter((t: any) => t.status === 'blocked').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const secProgress = (list: any[]) => {
    const d = list.filter((t) => t.status === 'done').length;
    return `${d}/${list.length}`;
  };

  return (
    <div>
      {/* START OVDE — onboarding za PM/mentora */}
      <div style={{ borderRadius: 16, border: `1px solid ${hexA(G.techno, 0.35)}`, background: `linear-gradient(140deg,${hexA(G.techno, 0.08)},transparent)`, padding: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: G.techno, marginBottom: 8 }}>▶ START OVDE — ZA PM / MENTORA</div>
        <div style={{ fontSize: 13, color: OS.ink2, lineHeight: 1.6 }}>
          <strong>Šta gradimo:</strong> operativni sistem noćnog života — scena stvara vrednost, vrednost ostaje u sceni.{' '}
          <strong>Trenutna misija:</strong> B1 Founding Night pilot (30 korisnika, dokaz pune petlje).{' '}
          <strong>Kako radiš ovde:</strong> ovaj board je izvor istine — klik na status menja stanje, dodeli sebi taskove, blokere označi odmah.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[['📖 Filozofija', `${REPO}/AfterBefore-Istina-i-Zakoni.md`], ['🏛 Ekonomija', `${REPO}/ECONOMY.md`], ['📋 Backlog', `${REPO}/TODO.md`], ['🔒 Odluke', `${REPO}/SECTION-LOCKS.md`]].map(([t, u]) => (
            <a key={t} href={u} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 10, color: OS.ink4, border: `1px solid ${OS.line2}`, borderRadius: 999, padding: '6px 12px' }}>{t}</a>
          ))}
        </div>
      </div>

      {/* progres + tim */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, padding: 13, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, marginBottom: 8 }}>
            <span style={{ color: OS.ink4 }}>B1 PILOT · {done}/{total}</span>
            <span style={{ color: pct > 50 ? G.festival : G.house }}>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${G.techno},${G.festival})` }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: OS.ink5, marginTop: 7 }}>{doing} u radu · {blocked} blokirano</div>
        </div>
        <div style={{ flex: 'none', padding: 13, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}` }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', color: OS.ink6, marginBottom: 6 }}>TIM · {members.length + 1}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: G.afterparty }}>KAVAZ · FOUNDER</span>
            {members.map((m: any) => (
              <span key={m.user_id} style={{ fontFamily: MONO, fontSize: 10, color: OS.ink4 }}>
                {m.email.split('@')[0].toUpperCase()} · {m.role.toUpperCase()}
                {founder && <button onClick={async () => { await db.rpc('war_remove_member', { p_user: m.user_id }); qc.invalidateQueries({ queryKey: ['war-members'] }); }} style={{ marginLeft: 4, background: 'transparent', border: 0, color: OS.ink6, cursor: 'pointer' }}>✕</button>}
              </span>
            ))}
            {founder && <button onClick={addMember} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: G.techno, background: hexA(G.techno, 0.12), border: 0, borderRadius: 7, padding: '4px 9px', cursor: 'pointer' }}>+ ČLAN</button>}
          </div>
        </div>
      </div>

      {/* filteri */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all', `Sve · ${total}`], ['todo', `Todo · ${total - done - doing - blocked}`], ['doing', `Radi se · ${doing}`], ['blocked', `Blokirano · ${blocked}`], ['done', `Gotovo · ${done}`]].map(([v, l]) => (
          <button key={v} onClick={() => setStatusF(v)} style={{ minHeight: 34, cursor: 'pointer', padding: '6px 12px', borderRadius: 9, fontFamily: MONO, fontSize: 10.5, fontWeight: 600, border: `1px solid ${statusF === v ? 'transparent' : OS.line2}`, background: statusF === v ? hexA(G.techno, 0.16) : 'transparent', color: statusF === v ? G.techno : OS.ink5 }}>{l}</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pretraga…" style={{ flex: 1, minWidth: 140, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 9, padding: '8px 11px', fontSize: 12.5, color: OS.ink, outline: 'none' }} />
      </div>

      {/* sekcije */}
      {sections.map(([sec, list]) => {
        const open = openSec[sec] ?? (statusF !== 'all' || q !== '');
        return (
          <div key={sec} style={{ marginBottom: 8 }}>
            <button onClick={() => setOpenSec((p) => ({ ...p, [sec]: !open }))} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '11px 13px', borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}`, cursor: 'pointer' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6 }}>{open ? '▾' : '▸'}</span>
              <span style={{ flex: 1, fontFamily: MONO, fontSize: 11, letterSpacing: '.04em', color: OS.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: list.every((t: any) => t.status === 'done') ? G.festival : OS.ink5 }}>{secProgress(list)}</span>
            </button>
            {open && (
              <div style={{ padding: '6px 4px 2px 12px' }}>
                {list.map((t: any) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 6px', borderBottom: `1px solid ${OS.line}` }}>
                    <button onClick={() => setStatus(t)} title={ST[t.status].label} style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, border: `1px solid ${hexA(ST[t.status].col, 0.5)}`, background: t.status === 'done' ? hexA(G.festival, 0.15) : 'transparent', color: ST[t.status].col, cursor: 'pointer', fontFamily: MONO, fontSize: 12 }}>
                      {t.status === 'done' ? '✓' : t.status === 'doing' ? '◐' : t.status === 'blocked' ? '✕' : '○'}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: t.status === 'done' ? OS.ink6 : OS.ink2, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                    <button onClick={() => setOwner(t)} style={{ flex: 'none', fontFamily: MONO, fontSize: 9.5, color: t.owner ? G.house : OS.ink7, background: t.owner ? hexA(G.house, 0.1) : 'transparent', border: t.owner ? 0 : `1px dashed ${OS.line2}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>{t.owner || '+'}</button>
                  </div>
                ))}
                <button onClick={() => addTask(sec)} style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, fontWeight: 600, color: G.techno, background: 'transparent', border: 0, cursor: 'pointer' }}>+ TASK</button>
              </div>
            )}
          </div>
        );
      })}
      {sections.length === 0 && <div style={{ fontFamily: MONO, fontSize: 12, color: OS.ink5, textAlign: 'center', padding: '30px 0' }}>Nema taskova za ovaj filter.</div>}
    </div>
  );
};
