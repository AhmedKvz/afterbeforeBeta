import { useState, useMemo } from 'react';
import { useQuests } from '@/hooks/useQuests';
import { useStreak, useRewards, useCustomQuests, useSponsoredQuests } from '@/hooks/useQuestSystem';
import { usePartyOfMonth, usePartyCandidates, usePartyOfMonthVote } from '@/hooks/usePartyOfMonth';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { OS, G, hexA, MONO, ROLE } from '../osTheme';

const TYPE_COL: Record<string, string> = {
  check_in: G.techno, explore: G.community, match: G.afterparty, social: G.afterparty,
  review: G.house, vibe: G.underground, signal: G.festival, vote_best_party: G.house,
  dance: G.afterparty, story: G.community,
};
const TYPE_LABEL: Record<string, string> = {
  check_in: 'Check-in', explore: 'Explore', match: '1:1', social: 'Social',
  review: 'Recenzija', vibe: 'Vibe', signal: 'Signal', vote_best_party: 'Glas',
  dance: 'Dance', story: 'Story',
};
// Quest = content brief (ECONOMY.md): every quest OUTPUTS something the scene uses.
const TYPE_OUTPUT: Record<string, string> = {
  review: 'VODIČ ZA SCENU', story: 'SCENA SE DOKUMENTUJE', vibe: 'MAPA GORI',
  dance: 'ENERGIJA PODA', check_in: 'GUSTINA NOĆI', explore: 'GUSTINA NOĆI',
  match: 'VEZE NA PODIJUMU', social: 'VEZE NA PODIJUMU', signal: 'EKIPA SE SKUPLJA',
  vote_best_party: 'GLAS ZAJEDNICE',
};
const colOf = (t?: string) => TYPE_COL[(t || '').toLowerCase()] || G.community;
const outputOf = (t?: string) => TYPE_OUTPUT[(t || '').toLowerCase()] || null;
const DAYS = ['PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB', 'NED'];
type Hub = 'quests' | 'rewards' | 'streak';

/* ── Party of the Month — current leader + vote among candidates ── */
const OSPartyOfMonth = () => {
  const { data: pom } = usePartyOfMonth();
  const { data: candidates = [] } = usePartyCandidates();
  const vote = usePartyOfMonthVote();
  const [open, setOpen] = useState(false);
  if (!pom?.event && candidates.length === 0) return null;
  const leader = pom?.event;
  return (
    <div style={{ margin: '14px 16px 0', borderRadius: 18, overflow: 'hidden', background: OS.surface, border: `1px solid ${hexA(G.house, 0.3)}` }}>
      <div style={{ position: 'relative', height: 122, background: leader?.image_url ? `center/cover url(${leader.image_url})` : 'linear-gradient(135deg,#2a1c00,#0e0f12)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#131417 4%,transparent 70%)' }} />
        <div style={{ position: 'absolute', top: 11, left: 13, fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: '#f5c97a' }}>👑 ŽURKA MESECA</div>
        <div style={{ position: 'absolute', bottom: 12, left: 13, right: 13 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: OS.ink }}>{leader?.title || 'Glasanje u toku'}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink4, marginTop: 3 }}>{(leader?.venue_name || 'BEOGRAD')} · {pom?.vote_count ?? 0} glasova{pom?.avg_rating ? ` · ★ ${pom.avg_rating.toFixed(1)}` : ''}</div>
        </div>
      </div>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', padding: 12, background: 'transparent', border: 0, borderTop: `1px solid ${OS.line}`, cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: G.house }}>{open ? 'ZATVORI ↑' : '🗳️ GLASAJ ZA ŽURKU MESECA ↓'}</button>
      {open && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidates.map((c) => (
            <div key={c.event_id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 8, borderRadius: 12, background: OS.bg, border: `1px solid ${c.user_voted ? hexA(G.house, 0.5) : OS.line}` }}>
              <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 9, background: c.image_url ? `center/cover url(${c.image_url})` : 'linear-gradient(135deg,#1b1c20,#0e0f12)', border: `1px solid ${OS.line2}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ROLE.name }}>{c.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{(c.venue_name || '').toUpperCase()} · {c.vote_count} glasova</div>
              </div>
              <button onClick={() => vote.mutate(c.event_id)} disabled={vote.isPending} style={{ flex: 'none', padding: '7px 12px', borderRadius: 10, border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, background: c.user_voted ? hexA(G.house, 0.2) : G.house, color: c.user_voted ? G.house : '#0B0B0D' }}>{c.user_voted ? '✓ GLAS' : 'GLASAJ'}</button>
            </div>
          ))}
          {candidates.length === 0 && <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, textAlign: 'center', padding: '10px 0' }}>NEMA KANDIDATA OVOG MESECA.</div>}
        </div>
      )}
    </div>
  );
};

export const OSQuests = () => {
  const { quests = [], claimReward } = useQuests() as any;
  const { profile } = useAuth();
  const { streak, claimedToday, shieldAvailable, claimedDates, claim: claimStreak, isClaiming } = useStreak();
  const { rewards, redeem, isRedeeming } = useRewards();
  const { sponsored, accept, isAccepting } = useSponsoredQuests() as any;
  const { customQuests, create } = useCustomQuests() as any;

  const [hub, setHub] = useState<Hub>('quests');
  const [cat, setCat] = useState('all');
  const [xp, setXp] = useState<{ show: boolean; val: number }>({ show: false, val: 0 });
  const [maker, setMaker] = useState(false);
  const [form, setForm] = useState({ title: '', target: 2, xp: 150, crew: false });

  const balance = (profile as any)?.spendable_xp ?? profile?.xp ?? 0;

  const cats = useMemo(() => {
    const types = Array.from(new Set(quests.map((q: any) => (q.quest_type || '').toLowerCase()).filter(Boolean)));
    return ['all', ...(types as string[])];
  }, [quests]);
  const visible = cat === 'all' ? quests : quests.filter((q: any) => (q.quest_type || '').toLowerCase() === cat);
  const done = quests.filter((q: any) => q.is_completed).length;
  const totalXP = quests.reduce((s: number, q: any) => s + (q.xp_reward || 0), 0);
  const earnedXP = quests.filter((q: any) => q.xp_claimed).reduce((s: number, q: any) => s + (q.xp_reward || 0), 0);

  const claim = (q: any) => {
    if (q.xp_claimed || !q.is_completed) return;
    claimReward({ questId: q.id, xpReward: q.xp_reward });
    track('quest_done', { quest_id: q.id, xp_reward: q.xp_reward });
    setXp({ show: true, val: q.xp_reward });
    setTimeout(() => setXp({ show: false, val: 0 }), 1400);
    toast.success(`+${q.xp_reward} XP 🎯`);
  };

  const submitQuest = () => {
    if (!form.title.trim()) { toast('Upiši naziv questa.'); return; }
    create({ icon: '🎯', title: form.title.trim(), description: '', kind: 'custom', target: form.target, xp: form.xp, timeframe: 'week', isCrew: form.crew });
    setMaker(false); setForm({ title: '', target: 2, xp: 150, crew: false });
  };

  // week grid for streak
  const weekDates = useMemo(() => {
    const now = new Date(); const dow = (now.getDay() + 6) % 7; // Mon=0
    return DAYS.map((_, i) => { const d = new Date(now); d.setDate(now.getDate() - dow + i); return d.toISOString().split('T')[0]; });
  }, []);

  const HUBS: { id: Hub; label: string }[] = [{ id: 'quests', label: '🎯 QUESTOVI' }, { id: 'rewards', label: '🎁 NAGRADE' }, { id: 'streak', label: '🔥 STREAK' }];

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', position: 'relative', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      <div style={{ padding: '8px 18px 0' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.22em', color: OS.ink6 }}>NEDELJNI · 🔥 {streak.current_streak} ZAREDOM</div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', color: OS.ink, marginTop: 2 }}>Questovi</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 4 }}>SVAKI QUEST GRADI SCENU — TVOJ DOPRINOS SE RAČUNA</div>
      </div>

      {/* hub toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '14px 16px 0' }}>
        {HUBS.map((h) => {
          const on = hub === h.id;
          return <button key={h.id} onClick={() => setHub(h.id)} style={{ padding: '9px 0', borderRadius: 12, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', cursor: 'pointer', border: `1px solid ${on ? hexA(G.underground, 0.5) : OS.line}`, background: on ? hexA(G.underground, 0.16) : OS.surface, color: on ? OS.ink : OS.ink5 }}>{h.label}</button>;
        })}
      </div>

      {/* ── QUESTS ── */}
      {hub === 'quests' && (
        <>
          <div style={{ margin: '14px 16px 0', padding: 16, borderRadius: 18, background: `linear-gradient(140deg,${hexA(G.underground, 0.16)},${hexA(G.afterparty, 0.06)})`, border: `1px solid ${hexA(G.underground, 0.25)}`, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: OS.ink4 }}>ZAVRŠENO OVE NEDELJE</div>
            <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 36, color: OS.ink, marginTop: 4 }}>{done}<span style={{ fontSize: 18, color: OS.ink6 }}>/{quests.length || 0}</span></div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: G.underground, marginTop: 2 }}>{earnedXP} / {totalXP} XP OSVOJENO</div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: OS.ink6, marginTop: 8, borderTop: `1px solid ${OS.line}`, paddingTop: 8 }}>DOPRINOS → AFC → NAGRADE OD PARTNERA</div>
          </div>

          {/* sponsored — real partners fund the rewards (ECONOMY §1 / PARTNERS ring 1) */}
          {(sponsored || []).length > 0 && (
            <div style={{ padding: '18px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: G.house }}>★ PARTNERI ČASTE</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6 }}>NAGRADA SE UZIMA NA LICU MESTA</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sponsored.map((s: any) => {
                  const doneS = s.accepted && s.progress >= s.target_count;
                  return (
                    <div key={s.id} style={{ padding: 14, borderRadius: 16, background: OS.surface, border: `1px solid ${hexA(G.house, doneS ? 0.5 : 0.28)}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: hexA(G.house, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{s.logo || '⭐'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', color: G.house }}>PARTNER · {(s.venue_name || '').toUpperCase()}</div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: OS.ink, marginTop: 3 }}>{s.title}</div>
                          <div style={{ fontSize: 11.5, color: OS.ink5, marginTop: 3, lineHeight: 1.35 }}>{s.description}</div>
                          <div style={{ display: 'inline-block', fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: ROLE.energy, background: hexA(ROLE.energy, 0.1), border: `1px solid ${hexA(ROLE.energy, 0.22)}`, borderRadius: 6, padding: '2px 7px', marginTop: 7 }}>→ {s.reward_label}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <span style={{ flex: 1, fontFamily: MONO, fontSize: 9, color: OS.ink6 }}>{s.spots_label || ''}</span>
                        {s.accepted
                          ? <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: doneS ? ROLE.energy : OS.ink5 }}>{doneS ? '✓ ZAVRŠENO' : `${s.progress}/${s.target_count} · U TOKU`}</span>
                          : <button onClick={() => accept(s.id)} disabled={isAccepting} style={{ flex: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: '7px 13px', borderRadius: 9, border: 0, background: G.house, color: '#0B0B0D' }}>PRIHVATI</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* party of the month — vote */}
          <OSPartyOfMonth />

          {/* make a quest */}
          <div style={{ padding: '14px 16px 0' }}>
            {!maker ? (
              <button onClick={() => setMaker(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: hexA(G.house, 0.08), border: `1px solid ${hexA(G.house, 0.4)}` }}>
                <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 11, background: hexA(G.house, 0.16), color: G.house, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>＋</span>
                <div><div style={{ fontWeight: 600, fontSize: 14, color: OS.ink }}>Napravi Quest</div><div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5 }}>SOLO ILI CREW IZAZOV</div></div>
              </button>
            ) : (
              <div style={{ padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${hexA(G.house, 0.4)}` }}>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Naziv questa…" style={{ width: '100%', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: OS.ink, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <label style={{ flex: 1, fontFamily: MONO, fontSize: 10, color: OS.ink5 }}>CILJ<input type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: +e.target.value })} style={{ width: '100%', marginTop: 4, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 8, padding: '8px', fontSize: 14, color: OS.ink, outline: 'none' }} /></label>
                  <label style={{ flex: 1, fontFamily: MONO, fontSize: 10, color: OS.ink5 }}>XP<input type="number" min={0} step={50} value={form.xp} onChange={(e) => setForm({ ...form, xp: +e.target.value })} style={{ width: '100%', marginTop: 4, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 8, padding: '8px', fontSize: 14, color: OS.ink, outline: 'none' }} /></label>
                  <button onClick={() => setForm({ ...form, crew: !form.crew })} style={{ alignSelf: 'flex-end', padding: '9px 12px', borderRadius: 8, fontFamily: MONO, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${form.crew ? hexA(G.afterparty, 0.5) : OS.line2}`, background: form.crew ? hexA(G.afterparty, 0.16) : OS.bg, color: form.crew ? G.afterparty : OS.ink5 }}>CREW</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setMaker(false)} style={{ flex: 'none', padding: '10px 14px', borderRadius: 10, background: 'transparent', border: `1px solid ${OS.line2}`, color: OS.ink5, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
                  <button onClick={submitQuest} style={{ flex: 1, padding: '10px', borderRadius: 10, background: G.house, border: 0, color: '#0B0B0D', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Kreiraj</button>
                </div>
              </div>
            )}
          </div>

          {/* categories */}
          <div className="os-scroll" style={{ overflowX: 'auto', padding: '14px 16px 0' }}>
            <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
              {cats.map((k) => {
                const on = cat === k; const label = k === 'all' ? 'All' : (TYPE_LABEL[k] || k);
                return <button key={k} onClick={() => setCat(k)} style={{ flex: 'none', cursor: 'pointer', padding: '7px 13px', borderRadius: 999, fontFamily: MONO, fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${on ? G.underground : 'rgba(255,255,255,.07)'}`, background: on ? G.underground : OS.surface, color: on ? '#fff' : OS.ink5 }}>{label}</button>;
              })}
            </div>
          </div>

          {/* quest cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 16 }}>
            {visible.map((q: any) => {
              const col = colOf(q.quest_type);
              const completed = q.is_completed; const claimed = q.xp_claimed;
              const pct = Math.min(100, Math.round((q.progress / Math.max(q.target_count, 1)) * 100));
              let btnLabel = 'ZAKLJUČANO'; let btnBg = 'rgba(255,255,255,.05)'; let btnFg: string = OS.ink7; let cursor = 'default';
              if (claimed) { btnLabel = '✓'; btnBg = hexA(G.festival, 0.15); btnFg = G.festival; }
              else if (completed) { btnLabel = 'UZMI ' + q.xp_reward; btnBg = col; btnFg = '#0B0B0D'; cursor = 'pointer'; }
              return (
                <div key={q.id} style={{ padding: 14, borderRadius: 16, background: OS.surface, border: `1px solid ${completed ? hexA(col, 0.3) : OS.line}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: hexA(col, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: col }}>{q.icon || '🎯'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: OS.ink }}>{q.title}</div>
                      <div style={{ fontSize: 11.5, color: OS.ink5, marginTop: 3, lineHeight: 1.35 }}>{q.description}</div>
                      {outputOf(q.quest_type) && (
                        <div style={{ display: 'inline-block', fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: hexA(col, 0.9), background: hexA(col, 0.1), border: `1px solid ${hexA(col, 0.22)}`, borderRadius: 6, padding: '2px 7px', marginTop: 7 }}>→ {outputOf(q.quest_type)}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3 }} /></div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5 }}>{q.progress}/{q.target_count}</span>
                    <button onClick={() => claim(q)} style={{ flex: 'none', cursor, fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: '6px 11px', borderRadius: 9, border: 0, background: btnBg, color: btnFg }}>{btnLabel}</button>
                  </div>
                </div>
              );
            })}
            {/* custom quests */}
            {(customQuests || []).length > 0 && cat === 'all' && (
              <>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginTop: 4 }}>[ TVOJI ]</div>
                {customQuests.map((q: any) => (
                  <div key={q.id} style={{ padding: 14, borderRadius: 16, background: OS.surface, border: `1px solid ${hexA(G.house, 0.25)}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: hexA(G.house, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{q.icon || '🎯'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: OS.ink }}>{q.title}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 3 }}>{q.is_crew ? `CREW · ${q.memberCount} ČLANOVA` : 'SOLO'} · {q.xp} XP</div>
                      </div>
                      {q.moderation_status === 'pending' && <span style={{ fontFamily: MONO, fontSize: 9, color: G.house }}>🕓</span>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ── REWARDS ── */}
      {hub === 'rewards' && (
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>🪙 AFC BALANS</span>
              <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: G.festival }}>{balance.toLocaleString()}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: OS.ink6, marginTop: 8, borderTop: `1px solid ${OS.line}`, paddingTop: 8 }}>FOND PUNE PARTNERI · NAGRADE SU STVARNE · UZIMAŠ NA LICU MESTA</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rewards.map((r: any) => {
              const afford = balance >= r.cost_xp && !r.is_locked;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}` }}>
                  <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: hexA(G.house, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{r.icon || '🎁'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: OS.ink }}>{r.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: G.house, marginTop: 2 }}>{r.cost_xp?.toLocaleString()} AFC</div>
                  </div>
                  <button onClick={() => afford && redeem(r.id)} disabled={!afford || isRedeeming} style={{ flex: 'none', cursor: afford ? 'pointer' : 'default', fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: '8px 13px', borderRadius: 10, border: 0, background: afford ? G.festival : 'rgba(255,255,255,.05)', color: afford ? '#0B0B0D' : OS.ink7 }}>{r.is_locked ? '🔒' : afford ? 'UZMI' : 'MALO AFC'}</button>
                </div>
              );
            })}
            {rewards.length === 0 && <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, textAlign: 'center', padding: '24px 0' }}>NEMA NAGRADA ZA SAD.</div>}
          </div>
        </div>
      )}

      {/* ── STREAK ── */}
      {hub === 'streak' && (
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ padding: 18, borderRadius: 18, background: `linear-gradient(140deg,${hexA(G.afterparty, 0.16)},${hexA(G.house, 0.05)})`, border: `1px solid ${hexA(G.afterparty, 0.25)}`, textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🔥</div>
            <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 30, color: OS.ink }}>{streak.current_streak} <span style={{ fontSize: 14, color: OS.ink5 }}>ZAREDOM</span></div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>NAJDUŽE: {streak.longest_streak}</div>
          </div>

          {/* week grid */}
          <div style={{ display: 'flex', gap: 6, margin: '16px 0' }}>
            {weekDates.map((d, i) => {
              const claimed = claimedDates.has(d);
              return (
                <div key={d} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: claimed ? hexA(G.afterparty, 0.2) : OS.surface, border: `1px solid ${claimed ? hexA(G.afterparty, 0.5) : OS.line}`, color: claimed ? G.afterparty : OS.ink6, fontSize: 15 }}>{claimed ? '🔥' : '·'}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: OS.ink6, marginTop: 4 }}>{DAYS[i]}</div>
                </div>
              );
            })}
          </div>

          {/* weekend shield */}
          <div style={{ padding: 14, borderRadius: 14, background: `linear-gradient(140deg,${hexA(G.techno, 0.12)},transparent)`, border: `1px solid ${hexA(G.techno, 0.3)}`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>🛡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: OS.ink }}>Weekend Shield</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{shieldAvailable ? 'Spreman — preskoči 1 vikend bez gubitka streaka' : 'Iskorišćen ovog meseca'}</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: shieldAvailable ? hexA(G.techno, 0.2) : 'rgba(255,255,255,.05)', color: shieldAvailable ? G.techno : OS.ink6 }}>{shieldAvailable ? '1' : '0'}</span>
          </div>

          <button onClick={() => claimStreak()} disabled={claimedToday || isClaiming} style={{ width: '100%', padding: 16, borderRadius: 15, border: 0, fontWeight: 640, fontSize: 15, cursor: claimedToday ? 'default' : 'pointer', background: claimedToday ? 'rgba(255,255,255,.05)' : G.afterparty, color: claimedToday ? OS.ink5 : '#0B0B0D' }}>{claimedToday ? 'Danas uzeto ✓' : isClaiming ? '…' : 'Uzmi dnevni XP 🔥'}</button>
        </div>
      )}

      {xp.show && <div style={{ position: 'fixed', left: '50%', bottom: 150, zIndex: 30, fontFamily: MONO, fontWeight: 600, fontSize: 18, color: G.underground, animation: 'os-xp 1.4s ease forwards', pointerEvents: 'none' }}>+{xp.val} XP</div>}
    </div>
  );
};
