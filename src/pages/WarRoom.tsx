import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OS, G, hexA, MONO, ROLE } from '@/os/osTheme';

const db = supabase as any;
const REPO = 'https://github.com/AhmedKvz/afterbeforeBeta/blob/main';

/* localStorage-backed store (per-device MVP; Supabase sync is a follow-up) */
function useStore<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV];
}

type Tab = 'pulse' | 'goals' | 'meetings' | 'manifest' | 'docs';
const TABS: [Tab, string][] = [['pulse', 'PULSE'], ['goals', 'CILJEVI'], ['meetings', 'MEETINGS'], ['manifest', 'MANIFEST'], ['docs', 'DOCS']];

interface Goal { id: string; label: string; current: number | null; target: number; unit: string }
interface Action { id: string; text: string; done: boolean }
interface Meeting { id: string; date: string; title: string; notes: string; actions: Action[] }

const DEFAULT_MANIFEST = [
  { id: 'm1', t: 'VIZIJA', b: 'Nightlife Operating System — mapiramo, dokumentujemo i povezujemo rejv/klub kulturu Beograda, pa sveta.' },
  { id: 'm2', t: 'STUB 1 · DISCOVERY', b: 'Najistinitija slika grada večeras — live energija, ne lista događaja.' },
  { id: 'm3', t: 'STUB 2 · CONNECTION', b: 'Veze nastale na podijumu, ne u feed-u. Spark > swipe.' },
  { id: 'm4', t: 'STUB 3 · CULTURE', b: 'Scena dokumentuje samu sebe — recenzije, story, Dance Floor, Crowd-DNA.' },
  { id: 'm5', t: 'MOAT', b: 'Verifikovan fizički prisustvo + energija (check-in + Dance) = podatak koji niko nema.' },
];

const uid = () => Math.random().toString(36).slice(2, 9);

export default function WarRoom() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('pulse');

  const { data: m, isLoading } = useQuery({
    queryKey: ['war-metrics'],
    enabled: !!profile?.is_founding_raver,
    queryFn: async () => { const { data } = await db.rpc('get_beta_metrics'); return data; },
    retry: false,
  });
  const { data: dance } = useQuery({
    queryKey: ['war-dance'],
    enabled: !!profile?.is_founding_raver,
    queryFn: async () => {
      const [{ count }, lb] = await Promise.all([
        db.from('dance_sessions').select('*', { count: 'exact', head: true }),
        db.rpc('get_dance_leaderboard', { p_scope: 'all' }),
      ]);
      return { sessions: count ?? 0, top: (lb.data || [])[0] || null };
    },
  });

  const [customGoals, setCustomGoals] = useStore<Goal[]>('wr_goals', []);
  const [meetings, setMeetings] = useStore<Meeting[]>('wr_meetings', []);
  const [manifest, setManifest] = useStore('wr_manifest', DEFAULT_MANIFEST);

  if (!profile?.is_founding_raver) {
    return (
      <div style={{ minHeight: '100vh', background: OS.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: OS.ink5 }}>
        <div style={{ textAlign: 'center', fontFamily: MONO }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🔒</div>
          <div>War Room je samo za foundere.</div>
        </div>
      </div>
    );
  }

  // ── auto KPIs from real metrics ──
  const autoGoals: Goal[] = m ? [
    { id: 'g_ret', label: 'WEEKEND RETENCIJA (grant)', current: m.weekend_retention, target: 40, unit: '%' },
    { id: 'g_act', label: 'AKTIVACIJA', current: m.activation_pct, target: 50, unit: '%' },
    { id: 'g_nps', label: 'NPS (preporuka)', current: m.nps_pct, target: 60, unit: '%' },
    { id: 'g_usr', label: 'KORISNICI', current: m.total_users, target: 500, unit: '' },
    { id: 'g_fr', label: 'FOUNDING RAVERS', current: m.founding_ravers, target: 100, unit: '' },
  ] : [];

  // ── derived Action Center ──
  const openActions = meetings.flatMap((mt) => mt.actions.filter((a) => !a.done).map((a) => ({ ...a, from: mt.title })));
  const alerts: { sev: 'hi' | 'mid'; text: string }[] = [];
  if (m) {
    if (m.weekend_retention < 40) alerts.push({ sev: 'hi', text: `Weekend retencija ${m.weekend_retention}% < grant cilj 40% — fokus na retention loop (push, streak, weekend shield).` });
    if (m.activation_pct < 50) alerts.push({ sev: 'mid', text: `Aktivacija ${m.activation_pct}% — friction u prvom check-in-u; pojednostavi onboarding.` });
    if (m.nps_total < 10) alerts.push({ sev: 'mid', text: `Samo ${m.nps_total} NPS odgovora — gurni feedback prompt da imaš signal.` });
    if (m.signups_7d === 0) alerts.push({ sev: 'hi', text: '0 novih korisnika ove nedelje — kanal akvizicije stoji.' });
  }
  if (!dance?.sessions) alerts.push({ sev: 'mid', text: 'Dance Floor još nema sesija — promoviši ga na lokaciji / kroz quest.' });

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', background: OS.bgDeep, color: OS.ink, fontFamily: "'Inter',system-ui,sans-serif", overflowY: 'auto' }}>
      {/* header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(7,7,8,.92)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${OS.line}`, padding: 'calc(env(safe-area-inset-top) + 12px) 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.24em', color: G.afterparty }}>FOUNDER · WAR ROOM</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>AfterBefore</div>
          </div>
          <button onClick={() => navigate('/')} style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, background: 'transparent', border: `1px solid ${OS.line2}`, borderRadius: 999, padding: '7px 13px', cursor: 'pointer' }}>← APP</button>
        </div>
        <div className="os-scroll" style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '12px 0 0' }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 'none', padding: '9px 14px', borderRadius: '10px 10px 0 0', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', background: tab === k ? OS.surface : 'transparent', color: tab === k ? OS.ink : OS.ink5, borderBottom: tab === k ? `2px solid ${G.afterparty}` : '2px solid transparent' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px', maxWidth: 720, margin: '0 auto' }}>
        {/* ALWAYS-ON: Action Center */}
        <div style={{ borderRadius: 16, background: `linear-gradient(140deg,${hexA(G.afterparty, 0.1)},transparent)`, border: `1px solid ${hexA(G.afterparty, 0.3)}`, padding: 14, marginBottom: 18 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: G.afterparty, marginBottom: 10 }}>⚡ ACTION CENTER · ŠTA TREBA DA GLEDAŠ</div>
          {alerts.length === 0 && openActions.length === 0 ? (
            <div style={{ fontSize: 13, color: OS.ink5 }}>Sve čisto. Nema crvenih signala. 🟢</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13, color: OS.ink2 }}>
                  <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', marginTop: 6, background: a.sev === 'hi' ? G.afterparty : G.house }} />
                  <span>{a.text}</span>
                </div>
              ))}
              {openActions.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 9, fontSize: 13, color: OS.ink2 }}>
                  <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', marginTop: 6, background: G.techno }} />
                  <span>☐ {a.text} <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6 }}>· {a.from}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── PULSE ── */}
        {tab === 'pulse' && (
          isLoading ? <Mut>UČITAVAM METRIKE…</Mut> : !m ? <Mut>Greška pri učitavanju (proveri get_beta_metrics).</Mut> : (
            <>
              <Section label="GRANT METRIKA">
                <Big value={`${m.weekend_retention}%`} sub={`Weekend retencija · ${m.weekend_retained}/${m.weekend_cohort} · cilj ≥40%`} color={m.weekend_retention >= 40 ? ROLE.energy : G.house} />
              </Section>
              <Section label="KORISNICI">
                <Grid>
                  <Stat n={m.total_users} l="UKUPNO" sub={`+${m.signups_7d} ove nedelje`} />
                  <Stat n={`${m.activation_pct}%`} l="AKTIVIRANI" color={m.activation_pct >= 50 ? ROLE.energy : undefined} />
                  <Stat n={m.founding_ravers} l="FOUNDING 🏴" />
                  <Stat n={m.active_streaks} l="AKTIVNI STREAK" sub={`prosek ${m.avg_streak}d`} />
                </Grid>
              </Section>
              <Section label="AKTIVNOST">
                <Grid>
                  <Stat n={m.checkins_total} l="CHECK-INI" />
                  <Stat n={m.checkins_7d} l="OVE NEDELJE" color={m.checkins_7d > 0 ? ROLE.energy : undefined} />
                  <Stat n={dance?.sessions ?? '…'} l="DANCE SESIJE" color={G.afterparty} />
                  <Stat n={dance?.top?.display_name || '—'} l="DANCE MVP 🕺" />
                </Grid>
              </Section>
              <Section label='NPS · "PREPORUČIO BI?"'>
                <Big value={m.nps_total === 0 ? '—' : `${m.nps_pct}%`} sub={m.nps_total === 0 ? 'nema odgovora još' : `bi preporučilo · ${m.nps_total} odgovora`} color={ROLE.energy} />
              </Section>
            </>
          )
        )}

        {/* ── GOALS ── */}
        {tab === 'goals' && (
          <>
            <Section label="AUTO · IZ ŽIVIH METRIKA">
              {autoGoals.map((g) => <GoalBar key={g.id} g={g} />)}
              {autoGoals.length === 0 && <Mut>Metrike se učitavaju…</Mut>}
            </Section>
            <Section label="TVOJI CILJEVI" right={<AddBtn onClick={() => {
              const label = prompt('Naziv cilja?'); if (!label) return;
              const target = Number(prompt('Cilj (broj)?', '100')) || 100;
              setCustomGoals((p) => [...p, { id: uid(), label, current: 0, target, unit: '' }]);
            }} />}>
              {customGoals.map((g) => (
                <div key={g.id}>
                  <GoalBar g={g} editable onCurrent={(v) => setCustomGoals((p) => p.map((x) => x.id === g.id ? { ...x, current: v } : x))} onDelete={() => setCustomGoals((p) => p.filter((x) => x.id !== g.id))} />
                </div>
              ))}
              {customGoals.length === 0 && <Mut>Dodaj svoj cilj (npr. „2 sponzor pilota", „3 nova kluba").</Mut>}
            </Section>
          </>
        )}

        {/* ── MEETINGS ── */}
        {tab === 'meetings' && (
          <Section label="MEETING LOG" right={<AddBtn onClick={() => {
            const title = prompt('Naslov sastanka?'); if (!title) return;
            setMeetings((p) => [{ id: uid(), date: new Date().toISOString().slice(0, 10), title, notes: '', actions: [] }, ...p]);
          }} />}>
            {meetings.length === 0 && <Mut>Nema sastanaka. Dodaj prvi — agenda, beleške, akcije.</Mut>}
            {meetings.map((mt) => (
              <div key={mt.id} style={{ borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}`, padding: 13, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><div style={{ fontWeight: 700, fontSize: 15 }}>{mt.title}</div><div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6 }}>{mt.date}</div></div>
                  <button onClick={() => setMeetings((p) => p.filter((x) => x.id !== mt.id))} style={{ background: 'transparent', border: 0, color: OS.ink6, cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
                <textarea value={mt.notes} onChange={(e) => setMeetings((p) => p.map((x) => x.id === mt.id ? { ...x, notes: e.target.value } : x))} placeholder="Beleške…" rows={2}
                  style={{ width: '100%', marginTop: 8, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 8, padding: 8, fontSize: 13, color: OS.ink, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {mt.actions.map((a) => (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: a.done ? OS.ink6 : OS.ink2, textDecoration: a.done ? 'line-through' : 'none', cursor: 'pointer' }}>
                      <input type="checkbox" checked={a.done} onChange={() => setMeetings((p) => p.map((x) => x.id === mt.id ? { ...x, actions: x.actions.map((y) => y.id === a.id ? { ...y, done: !y.done } : y) } : x))} />
                      {a.text}
                    </label>
                  ))}
                  <button onClick={() => { const text = prompt('Akcija / zadatak?'); if (!text) return; setMeetings((p) => p.map((x) => x.id === mt.id ? { ...x, actions: [...x.actions, { id: uid(), text, done: false }] } : x)); }}
                    style={{ alignSelf: 'flex-start', marginTop: 4, fontFamily: MONO, fontSize: 10, fontWeight: 600, color: G.techno, background: 'transparent', border: 0, cursor: 'pointer' }}>+ AKCIJA</button>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* ── MANIFEST ── */}
        {tab === 'manifest' && (
          <Section label="MANIFEST BOARD">
            {manifest.map((b: any) => (
              <div key={b.id} style={{ borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}`, padding: 14, marginBottom: 10 }}>
                <input value={b.t} onChange={(e) => setManifest((p: any) => p.map((x: any) => x.id === b.id ? { ...x, t: e.target.value } : x))}
                  style={{ width: '100%', background: 'transparent', border: 0, outline: 'none', fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', color: G.afterparty, marginBottom: 6 }} />
                <textarea value={b.b} onChange={(e) => setManifest((p: any) => p.map((x: any) => x.id === b.id ? { ...x, b: e.target.value } : x))} rows={2}
                  style={{ width: '100%', background: 'transparent', border: 0, outline: 'none', fontSize: 14, lineHeight: 1.5, color: OS.ink2, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            ))}
            <button onClick={() => setManifest((p: any) => [...p, { id: uid(), t: 'NASLOV', b: 'Tekst…' }])} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: G.afterparty, background: 'transparent', border: `1px dashed ${hexA(G.afterparty, 0.4)}`, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', width: '100%' }}>+ DODAJ BLOK</button>
          </Section>
        )}

        {/* ── DOCS ── */}
        {tab === 'docs' && (
          <Section label="DOKUMENTI · RESURSI">
            {[
              { t: '🎨 Design System', u: `${REPO}/AFTERBEFORE_DESIGN.md`, d: 'Vizuelni jezik, tokeni, komponente' },
              { t: '🕺 Dance Floor Strategy', u: `${REPO}/DANCE_FLOOR_STRATEGY.md`, d: 'System design + komercijalizacija' },
              { t: '📊 Live Metrics', u: '#/metrics', d: 'Beta metrics dashboard (grant)' },
              { t: '🟢 Live Beta', u: 'https://ahmedkvz.github.io/afterbeforeBeta/app/', d: 'Produkcioni app' },
              { t: '🗄️ Supabase', u: 'https://supabase.com/dashboard/project/aptahdctlvrhmrhpaccs', d: 'Baza · RPC · auth' },
              { t: '💻 GitHub repo', u: 'https://github.com/AhmedKvz/afterbeforeBeta', d: 'Kod · migracije · CI' },
            ].map((r) => (
              <a key={r.t} href={r.u} target={r.u.startsWith('#') ? undefined : '_blank'} rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}`, marginBottom: 8, textDecoration: 'none' }}>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14, color: OS.ink }}>{r.t}</div><div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{r.d}</div></div>
                <span style={{ color: OS.ink6 }}>↗</span>
              </a>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

/* ── small UI atoms ── */
const Mut = ({ children }: any) => <div style={{ fontFamily: MONO, fontSize: 12, color: OS.ink5, textAlign: 'center', padding: '24px 0' }}>{children}</div>;
const Section = ({ label, right, children }: any) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>{label}</span>{right}
    </div>
    {children}
  </div>
);
const Grid = ({ children }: any) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>{children}</div>;
const Stat = ({ n, l, sub, color }: any) => (
  <div style={{ padding: 13, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}` }}>
    <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 22, color: color || OS.ink, lineHeight: 1.1, wordBreak: 'break-word' }}>{n}</div>
    <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', color: OS.ink6, marginTop: 5 }}>{l}</div>
    {sub && <div style={{ fontSize: 11, color: OS.ink5, marginTop: 2 }}>{sub}</div>}
  </div>
);
const Big = ({ value, sub, color }: any) => (
  <div style={{ padding: 18, borderRadius: 16, background: OS.surface, border: `1px solid ${OS.line}`, textAlign: 'center' }}>
    <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 48, color: color || OS.ink, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, color: OS.ink5, marginTop: 6 }}>{sub}</div>
  </div>
);
const GoalBar = ({ g, editable, onCurrent, onDelete }: { g: Goal; editable?: boolean; onCurrent?: (v: number) => void; onDelete?: () => void }) => {
  const cur = g.current ?? 0;
  const pct = Math.min(100, Math.round((cur / g.target) * 100));
  const hit = cur >= g.target;
  return (
    <div style={{ padding: 12, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: OS.ink3 }}>{g.label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editable && onCurrent && <input type="number" value={cur} onChange={(e) => onCurrent(Number(e.target.value))} style={{ width: 54, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 6, padding: '3px 6px', fontFamily: MONO, fontSize: 12, color: OS.ink, outline: 'none' }} />}
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: hit ? ROLE.energy : OS.ink }}>{cur}{g.unit} / {g.target}{g.unit}</span>
          {onDelete && <button onClick={onDelete} style={{ background: 'transparent', border: 0, color: OS.ink6, cursor: 'pointer' }}>✕</button>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: hit ? ROLE.energy : `linear-gradient(90deg,${G.afterparty},${G.house})`, borderRadius: 3 }} />
      </div>
    </div>
  );
};
const AddBtn = ({ onClick }: any) => <button onClick={onClick} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: G.afterparty, background: hexA(G.afterparty, 0.12), border: 0, borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>+ DODAJ</button>;
