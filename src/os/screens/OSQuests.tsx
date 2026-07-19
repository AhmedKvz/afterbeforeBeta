import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQuests } from '@/hooks/useQuests';
import { useStreak, useRewards, useCustomQuests, useSponsoredQuests } from '@/hooks/useQuestSystem';
import { usePartyOfMonth, usePartyCandidates, usePartyOfMonthVote } from '@/hooks/usePartyOfMonth';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { OSCampaign } from '../OSCampaign';
import { OSDareWheel } from '../OSDareWheel';
import { AB, G, hexA, MONO, ROLE } from '../osTheme';

/**
 * QUESTS — prvi ekran na AFTERBEFORE_DESIGN.md kanonu (§9: "PlayStation trophy
 * board"). Frame boje idu kroz --ab-* tokene; žanr/kultura i dalje kroz G.*.
 * Pravila: jedan acid hero po viewport-u, solid UV okviri (nikad dashed),
 * mono samo kao začin (kodovi, brojke, satnice), gutter 18px, radius 16/10/999.
 */
const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const MTAG = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em' } as const;
const reveal = (i: number) => ({ animation: `ab-reveal .22s cubic-bezier(.16,1,.3,1) ${i * 40}ms both` });

const LEDGER_LABEL: Record<string, string> = { checkin: '📍 Check-in', quest: '🎯 Quest', set_times: '🕒 Satnica', early: '⚡ Rani dolazak' };

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

/* ── Debela acid progress traka (kanon §6.5) — glow samo kad je "hero". ── */
const AcidBar = ({ pct, hero }: { pct: number; hero?: boolean }) => (
  <div style={{ flex: 1, height: hero ? 12 : 8, borderRadius: 999, background: 'oklch(1 0 0 / 0.07)', overflow: 'hidden' }}>
    <div className={hero ? 'ab-acid-fill' : undefined} style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: hero ? undefined : (pct >= 100 ? AB.acid : AB.acidDim), transition: 'width .22s cubic-bezier(.16,1,.3,1)' }} />
  </div>
);

/* ── Party of the Month — current leader + vote among candidates ── */
const OSPartyOfMonth = () => {
  const { data: pom } = usePartyOfMonth();
  const { data: candidates = [] } = usePartyCandidates();
  const vote = usePartyOfMonthVote();
  const [open, setOpen] = useState(false);
  if (!pom?.event && candidates.length === 0) return null;
  const leader = pom?.event;
  return (
    <div style={{ margin: '20px 18px 0', borderRadius: 16, overflow: 'hidden', background: AB.surface, border: `1px solid ${AB.line2}` }}>
      <div style={{ position: 'relative', height: 128, background: leader?.image_url ? `center/cover url(${leader.image_url})` : 'linear-gradient(135deg,#2a1c00,#0e0f12)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.135 0.012 285) 4%, transparent 70%)' }} />
        <div style={{ ...LABEL, position: 'absolute', top: 12, left: 14, color: '#f5c97a' }}>👑 ŽURKA MESECA</div>
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{leader?.title || 'Glasanje u toku'}</div>
          <div style={{ ...MTAG, color: AB.ink2, marginTop: 3 }}>{(leader?.venue_name || 'BEOGRAD')} · {pom?.vote_count ?? 0} glasova{pom?.avg_rating ? ` · ★ ${pom.avg_rating.toFixed(1)}` : ''}</div>
        </div>
      </div>
      <button onClick={() => setOpen((o) => !o)} className="os-press" style={{ width: '100%', padding: 13, background: 'transparent', border: 0, borderTop: `1px solid ${AB.line}`, cursor: 'pointer', ...MTAG, color: G.house }}>{open ? 'ZATVORI ↑' : '🗳️ GLASAJ ZA ŽURKU MESECA ↓'}</button>
      {open && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidates.map((c) => (
            <div key={c.event_id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 8, borderRadius: 10, background: AB.void, border: `1px solid ${c.user_voted ? hexA(G.house, 0.5) : AB.line}` }}>
              <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: c.image_url ? `center/cover url(${c.image_url})` : 'linear-gradient(135deg,#1b1c20,#0e0f12)', border: `1px solid ${AB.line2}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ROLE.name }}>{c.title}</div>
                <div style={{ ...MTAG, fontSize: 10, color: AB.ink3, marginTop: 2 }}>{(c.venue_name || '').toUpperCase()} · {c.vote_count} glasova</div>
              </div>
              <button onClick={() => vote.mutate(c.event_id)} disabled={vote.isPending} className="os-press" style={{ flex: 'none', padding: '7px 12px', borderRadius: 999, border: 0, cursor: 'pointer', ...MTAG, fontSize: 10, background: c.user_voted ? hexA(G.house, 0.2) : G.house, color: c.user_voted ? G.house : '#0B0B0D' }}>{c.user_voted ? '✓ GLAS' : 'GLASAJ'}</button>
            </div>
          ))}
          {candidates.length === 0 && <div style={{ ...MTAG, color: AB.ink3, textAlign: 'center', padding: '10px 0' }}>NEMA KANDIDATA OVOG MESECA.</div>}
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
  const { data: ledger = [] } = useQuery({
    queryKey: ['afc-ledger'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('afc_ledger').select('delta, reason, created_at').order('created_at', { ascending: false }).limit(6);
      return data || [];
    },
  });

  const [hub, setHub] = useState<Hub>('quests');
  const [cat, setCat] = useState('all');
  const [xp, setXp] = useState<{ show: boolean; val: number }>({ show: false, val: 0 });
  const [ignited, setIgnited] = useState<string | null>(null);
  const [maker, setMaker] = useState(false);
  const [campaign, setCampaign] = useState<string | null>(null);
  const [dare, setDare] = useState(false);
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

  // Kanon §9: jedan featured "Vikend Quest" dominira — najveći još neuzet.
  const featured = useMemo(() => {
    const open = visible.filter((q: any) => !q.xp_claimed);
    return [...open].sort((a: any, b: any) => (b.xp_reward || 0) - (a.xp_reward || 0))[0] || null;
  }, [visible]);
  const side = visible.filter((q: any) => q.id !== featured?.id);

  const claim = (q: any) => {
    if (q.xp_claimed || !q.is_completed) return;
    claimReward({ questId: q.id, xpReward: q.xp_reward });
    track('quest_done', { quest_id: q.id, xp_reward: q.xp_reward });
    setXp({ show: true, val: q.xp_reward });
    setIgnited(q.id);
    setTimeout(() => setXp({ show: false, val: 0 }), 1400);
    setTimeout(() => setIgnited(null), 900);
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

  const HUBS: { id: Hub; label: string }[] = [{ id: 'quests', label: 'Questovi' }, { id: 'rewards', label: 'Nagrade' }, { id: 'streak', label: 'Streak' }];

  /* Kartica sporednog questa (kanon §6.5 stanja: complete=acid · active=UV · claimed=dim). */
  const QuestCard = ({ q, i }: { q: any; i: number }) => {
    const col = colOf(q.quest_type);
    const completed = q.is_completed; const claimed = q.xp_claimed;
    const pct = Math.min(100, Math.round((q.progress / Math.max(q.target_count, 1)) * 100));
    return (
      <div className={ignited === q.id ? 'ab-ignite' : undefined} style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${claimed ? AB.line : completed ? AB.acidDim : AB.uvDim}`, opacity: claimed ? 0.62 : 1, ...reveal(i) }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: hexA(col, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{q.icon || '🎯'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{q.title}</div>
            {q.description && <div style={{ fontSize: 13, color: AB.ink2, marginTop: 3, lineHeight: 1.4 }}>{q.description}</div>}
            {outputOf(q.quest_type) && (
              <div style={{ display: 'inline-block', ...MTAG, fontSize: 10, letterSpacing: '.1em', color: hexA(col, 0.9), background: hexA(col, 0.1), borderRadius: 999, padding: '3px 9px', marginTop: 7 }}>→ {outputOf(q.quest_type)}</div>
            )}
          </div>
          <span style={{ ...MTAG, color: claimed ? AB.ink3 : AB.ink2 }}>+{q.xp_reward}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <AcidBar pct={pct} />
          <span style={{ ...MTAG, fontSize: 10, color: AB.ink3 }}>{q.progress}/{q.target_count}</span>
          {claimed
            ? <span style={{ ...MTAG, color: AB.acidDim }}>✓</span>
            : completed && <button onClick={() => claim(q)} className="os-press" style={{ flex: 'none', cursor: 'pointer', ...MTAG, minHeight: 40, padding: '10px 16px', borderRadius: 999, border: 0, background: AB.acid, color: AB.acidInk }}>UZMI +{q.xp_reward}</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', position: 'relative', background: AB.void, paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      {/* editorial header — veliki naslov, label kao vezivno tkivo */}
      <div style={{ padding: '10px 18px 0' }}>
        <div style={LABEL}>NEDELJNI · 🔥 {streak.current_streak} ZAREDOM</div>
        <div style={{ fontWeight: 800, fontSize: 30, lineHeight: '34px', letterSpacing: '-.02em', color: AB.ink, marginTop: 4 }}>Questovi</div>
        <div style={{ fontSize: 14, color: AB.ink2, marginTop: 4 }}>Svaki quest gradi scenu — tvoj doprinos se računa.</div>
      </div>

      {/* Zavrti noć — solid UV okvir (kanon: dashed = disabled, zabranjeno) */}
      <div style={{ padding: '16px 18px 0' }}>
        <button onClick={() => setDare(true)} className="os-press" style={{ width: '100%', minHeight: 52, padding: '13px 15px', borderRadius: 16, border: `1px solid ${AB.uv}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'oklch(0.62 0.25 300 / 0.08)', textAlign: 'left' }}>
          <span style={{ fontSize: 21 }}>🎲</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: AB.ink }}>Zavrti noć — smela misija</span>
          <span style={{ ...MTAG, fontSize: 10, letterSpacing: '.12em', color: AB.uv }}>SMEŠ LI?</span>
        </button>
      </div>

      {/* hub toggle — UV je okvir gejmifikacije; acid ostaje za progres */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '16px 18px 0' }}>
        {HUBS.map((h) => {
          const on = hub === h.id;
          return <button key={h.id} onClick={() => setHub(h.id)} className="os-press" style={{ padding: '11px 0', borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer', border: `1px solid ${on ? AB.uv : AB.line}`, background: on ? 'oklch(0.62 0.25 300 / 0.16)' : AB.surface, color: on ? AB.ink : AB.ink3 }}>{h.label}</button>;
        })}
      </div>

      {/* ── QUESTS ── */}
      {hub === 'quests' && (
        <div key="quests" style={{ animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
          {/* nedeljni skor — display brojka, jedina "wrapped" numerika na vrhu */}
          <div style={{ margin: '20px 18px 0', padding: '18px 16px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, textAlign: 'center' }}>
            <div style={LABEL}>ZAVRŠENO OVE NEDELJE</div>
            <div style={{ fontWeight: 800, fontSize: 40, lineHeight: '42px', letterSpacing: '-.02em', color: AB.ink, marginTop: 6 }}>{done}<span style={{ fontSize: 20, color: AB.ink3 }}> / {quests.length || 0}</span></div>
            <div style={{ ...MTAG, color: AB.acidDim, marginTop: 4 }}>{earnedXP} / {totalXP} XP</div>
            <div style={{ ...LABEL, fontSize: 10, marginTop: 12, borderTop: `1px solid ${AB.line}`, paddingTop: 10 }}>DOPRINOS → AFC → NAGRADE OD PARTNERA</div>
          </div>

          {/* categories */}
          {cats.length > 2 && (
            <div className="os-scroll" style={{ overflowX: 'auto', padding: '16px 18px 0' }}>
              <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
                {cats.map((k) => {
                  const on = cat === k; const label = k === 'all' ? 'Sve' : (TYPE_LABEL[k] || k);
                  return <button key={k} onClick={() => setCat(k)} className="os-press" style={{ flex: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap', border: `1px solid ${on ? 'transparent' : AB.line}`, background: on ? AB.raised : 'transparent', color: on ? AB.ink : AB.ink3 }}>{label}</button>;
                })}
              </div>
            </div>
          )}

          {/* featured — jedan quest dominira (kanon §9) */}
          {featured && (
            <div style={{ padding: '16px 18px 0' }}>
              <div className={ignited === featured.id ? 'ab-ignite' : undefined} style={{ padding: 18, borderRadius: 22, background: AB.surface, border: `1.5px solid ${AB.uv}`, ...reveal(0) }}>
                <div style={{ ...LABEL, color: AB.uv }}>★ VIKEND QUEST</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 10 }}>
                  <span style={{ flex: 'none', width: 48, height: 48, borderRadius: 12, background: hexA(colOf(featured.quest_type), 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{featured.icon || '🎯'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.015em', lineHeight: '26px', color: AB.ink }}>{featured.title}</div>
                    {featured.description && <div style={{ fontSize: 14, color: AB.ink2, marginTop: 4, lineHeight: 1.45 }}>{featured.description}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <AcidBar pct={Math.min(100, Math.round((featured.progress / Math.max(featured.target_count, 1)) * 100))} hero />
                  <span style={{ ...MTAG, color: AB.ink2 }}>{featured.progress}/{featured.target_count}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <span style={{ ...MTAG, color: AB.ink3 }}>+{featured.xp_reward} XP</span>
                  {featured.is_completed && !featured.xp_claimed && (
                    <button onClick={() => claim(featured)} className="os-press" style={{ cursor: 'pointer', fontSize: 15, fontWeight: 700, minHeight: 44, padding: '12px 22px', borderRadius: 999, border: 0, background: AB.acid, color: AB.acidInk }}>Uzmi +{featured.xp_reward}</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* sponsored — real partners fund the rewards (ECONOMY §1 / PARTNERS ring 1) */}
          {(sponsored || []).length > 0 && (
            <div style={{ padding: '22px 18px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...LABEL, color: G.house }}>★ PARTNERI ČASTE</span>
                <span style={{ ...LABEL, fontSize: 10 }}>NAGRADA NA LICU MESTA</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sponsored.map((s: any, i: number) => {
                  const doneS = s.accepted && s.progress >= s.target_count;
                  return (
                    <div key={s.id} style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}`, borderLeft: `3px solid ${G.house}`, ...reveal(i) }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: hexA(G.house, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{s.logo || '⭐'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...LABEL, fontSize: 10, color: G.house }}>SPONZORISANO · {(s.venue_name || '').toUpperCase()}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink, marginTop: 3 }}>{s.title}</div>
                          <div style={{ fontSize: 13, color: AB.ink2, marginTop: 3, lineHeight: 1.4 }}>{s.description}</div>
                          <div style={{ display: 'inline-block', ...MTAG, fontSize: 10, letterSpacing: '.1em', color: ROLE.energy, background: hexA(ROLE.energy, 0.1), borderRadius: 999, padding: '3px 9px', marginTop: 7 }}>→ {s.reward_label}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <span style={{ flex: 1, ...MTAG, fontSize: 10, color: AB.ink3 }}>{s.kind === 'content' ? (s.media === 'video' ? '🎬 VIDEO · GLASA SCENA' : '📸 FOTO · GLASA SCENA') : (s.spots_label || '')}</span>
                        {s.kind === 'content'
                          ? <button onClick={() => setCampaign(s.id)} className="os-press" style={{ flex: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 40, padding: '10px 16px', borderRadius: 999, border: 0, background: G.house, color: '#0B0B0D' }}>Uđi · glasaj</button>
                          : s.accepted
                          ? <span style={{ ...MTAG, fontSize: 10, color: doneS ? ROLE.energy : AB.ink3 }}>{doneS ? '✓ ZAVRŠENO' : `${s.progress}/${s.target_count} · U TOKU`}</span>
                          : <button onClick={() => accept(s.id)} disabled={isAccepting} className="os-press" style={{ flex: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 40, padding: '10px 16px', borderRadius: 999, border: 0, background: G.house, color: '#0B0B0D' }}>Prihvati</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* party of the month — vote */}
          <OSPartyOfMonth />

          {/* side quests — čista lista ispod featured (kanon §9) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '22px 18px 0' }}>
            {side.length > 0 && <div style={LABEL}>SPOREDNI QUESTOVI</div>}
            {side.map((q: any, i: number) => <QuestCard key={q.id} q={q} i={i} />)}
          </div>

          {/* custom quests */}
          {(customQuests || []).length > 0 && cat === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '22px 18px 0' }}>
              <div style={LABEL}>TVOJI</div>
              {customQuests.map((q: any) => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}` }}>
                  <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: hexA(G.house, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{q.icon || '🎯'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{q.title}</div>
                    <div style={{ ...MTAG, fontSize: 10, color: AB.ink3, marginTop: 2 }}>{q.is_crew ? `CREW · ${q.memberCount} ČLANOVA` : 'SOLO'} · {q.xp} XP</div>
                  </div>
                  {q.moderation_status === 'pending' && <span style={{ ...MTAG, fontSize: 10, color: G.house }}>🕓</span>}
                </div>
              ))}
            </div>
          )}

          {/* make a quest — tiho na dnu; kreiranje je za posvećene */}
          <div style={{ padding: '22px 18px 0' }}>
            {!maker ? (
              <button onClick={() => setMaker(true)} className="os-press" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 16, cursor: 'pointer', textAlign: 'left', background: 'transparent', border: `1px solid ${AB.line2}` }}>
                <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: AB.raised, color: AB.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>＋</span>
                <div><div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: AB.ink }}>Napravi quest</div><div style={{ fontSize: 12.5, color: AB.ink3, marginTop: 1 }}>Solo ili crew izazov za scenu</div></div>
              </button>
            ) : (
              <div style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}` }}>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Naziv questa…" style={{ width: '100%', background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: AB.ink, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <label style={{ flex: 1, ...LABEL, fontSize: 10 }}>CILJ<input type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: +e.target.value })} style={{ width: '100%', marginTop: 4, background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '8px', fontSize: 14, color: AB.ink, outline: 'none' }} /></label>
                  <label style={{ flex: 1, ...LABEL, fontSize: 10 }}>XP<input type="number" min={0} step={50} value={form.xp} onChange={(e) => setForm({ ...form, xp: +e.target.value })} style={{ width: '100%', marginTop: 4, background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '8px', fontSize: 14, color: AB.ink, outline: 'none' }} /></label>
                  <button onClick={() => setForm({ ...form, crew: !form.crew })} className="os-press" style={{ alignSelf: 'flex-end', padding: '9px 12px', borderRadius: 10, ...MTAG, fontSize: 10, cursor: 'pointer', border: `1px solid ${form.crew ? AB.uv : AB.line2}`, background: form.crew ? 'oklch(0.62 0.25 300 / 0.16)' : AB.void, color: form.crew ? AB.uv : AB.ink3 }}>CREW</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setMaker(false)} className="os-press" style={{ flex: 'none', padding: '10px 14px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
                  <button onClick={submitQuest} className="os-press" style={{ flex: 1, padding: '10px', borderRadius: 999, background: AB.raised, border: `1px solid ${AB.line2}`, color: AB.ink, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Kreiraj</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REWARDS ── */}
      {hub === 'rewards' && (
        <div key="rewards" style={{ padding: '20px 18px 0', animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ padding: '18px 16px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, textAlign: 'center' }}>
            <div style={LABEL}>🪙 AFC BALANS</div>
            <div style={{ fontWeight: 800, fontSize: 40, lineHeight: '42px', letterSpacing: '-.02em', color: AB.ink, marginTop: 6 }}>{balance.toLocaleString()}</div>
            <div style={{ ...LABEL, fontSize: 10, marginTop: 12, borderTop: `1px solid ${AB.line}`, paddingTop: 10 }}>FOND PUNE PARTNERI · NAGRADE SU STVARNE</div>
          </div>

          {/* recent AFC — transparency (kako se zarađuje) */}
          {ledger.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}`, margin: '14px 0 0' }}>
              <div style={{ ...LABEL, fontSize: 10, marginBottom: 8 }}>NEDAVNO ZARAĐENO</div>
              {ledger.map((l: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${AB.line}` : 'none' }}>
                  <span style={{ fontSize: 13, color: AB.ink2 }}>{LEDGER_LABEL[l.reason] || l.reason}</span>
                  <span style={{ ...MTAG, color: l.delta >= 0 ? AB.acidDim : AB.hot }}>{l.delta >= 0 ? '+' : ''}{l.delta}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {rewards.map((r: any, i: number) => {
              const afford = balance >= r.cost_xp && !r.is_locked;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}`, ...reveal(i) }}>
                  <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: hexA(G.house, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{r.icon || '🎁'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{r.title}</div>
                    <div style={{ ...MTAG, color: AB.ink3, marginTop: 2 }}>{r.cost_xp?.toLocaleString()} AFC</div>
                  </div>
                  <button onClick={() => afford && redeem(r.id)} disabled={!afford || isRedeeming} className="os-press" style={{ flex: 'none', cursor: afford ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, minHeight: 40, padding: '10px 16px', borderRadius: 999, border: 0, background: afford ? AB.acid : AB.raised, color: afford ? AB.acidInk : AB.ink3 }}>{r.is_locked ? '🔒' : afford ? 'Uzmi' : 'Malo AFC'}</button>
                </div>
              );
            })}
            {rewards.length === 0 && <div style={{ ...MTAG, color: AB.ink3, textAlign: 'center', padding: '24px 0' }}>NEMA NAGRADA ZA SAD.</div>}
          </div>
        </div>
      )}

      {/* ── STREAK ── */}
      {hub === 'streak' && (
        <div key="streak" style={{ padding: '20px 18px 0', animation: 'os-swap .15s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ padding: '22px 16px', borderRadius: 22, background: AB.surface, border: `1px solid ${AB.line2}`, textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🔥</div>
            <div style={{ fontWeight: 800, fontSize: 40, lineHeight: '42px', letterSpacing: '-.02em', color: AB.ink, marginTop: 4 }}>{streak.current_streak}<span style={{ fontSize: 16, fontWeight: 500, color: AB.ink3 }}> zaredom</span></div>
            <div style={{ ...LABEL, fontSize: 10, marginTop: 6 }}>NAJDUŽE: {streak.longest_streak}</div>
          </div>

          {/* week grid */}
          <div style={{ display: 'flex', gap: 6, margin: '16px 0' }}>
            {weekDates.map((d, i) => {
              const claimed = claimedDates.has(d);
              return (
                <div key={d} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: claimed ? 'oklch(0.88 0.19 158 / 0.14)' : AB.surface, border: `1px solid ${claimed ? AB.acidDim : AB.line}`, fontSize: 15 }}>{claimed ? '🔥' : <span style={{ color: AB.ink3 }}>·</span>}</div>
                  <div style={{ ...MTAG, fontSize: 9, color: AB.ink3, marginTop: 4 }}>{DAYS[i]}</div>
                </div>
              );
            })}
          </div>

          {/* weekend shield */}
          <div style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${G.techno}`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>🛡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>Weekend Shield</div>
              <div style={{ fontSize: 12.5, color: AB.ink2, marginTop: 2 }}>{shieldAvailable ? 'Spreman — preskoči 1 vikend bez gubitka streaka' : 'Iskorišćen ovog meseca'}</div>
            </div>
            <span style={{ ...MTAG, fontSize: 10, padding: '4px 10px', borderRadius: 999, background: shieldAvailable ? hexA(G.techno, 0.2) : AB.raised, color: shieldAvailable ? G.techno : AB.ink3 }}>{shieldAvailable ? '1' : '0'}</span>
          </div>

          <button onClick={() => claimStreak()} disabled={claimedToday || isClaiming} className="os-press" style={{ width: '100%', padding: 16, borderRadius: 999, border: 0, fontWeight: 700, fontSize: 16, cursor: claimedToday ? 'default' : 'pointer', background: claimedToday ? AB.raised : AB.acid, color: claimedToday ? AB.ink3 : AB.acidInk }}>{claimedToday ? 'Danas uzeto ✓' : isClaiming ? '…' : 'Uzmi dnevni XP 🔥'}</button>
        </div>
      )}

      {xp.show && <div style={{ position: 'fixed', left: '50%', bottom: 150, zIndex: 200, ...MTAG, fontSize: 19, color: AB.acid, textShadow: '0 0 24px oklch(0.88 0.19 158 / 0.6)', animation: 'os-xp 1.4s ease forwards', pointerEvents: 'none' }}>+{xp.val} XP</div>}
      {dare && <OSDareWheel onClose={() => setDare(false)} />}
      {campaign && <OSCampaign sponsoredId={campaign} onClose={() => setCampaign(null)} />}
    </div>
  );
};
