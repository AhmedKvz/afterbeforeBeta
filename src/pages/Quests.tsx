import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, ChevronRight } from 'lucide-react';
import { useQuests } from '@/hooks/useQuests';
import { useCustomQuests } from '@/hooks/useQuestSystem';
import { useStreak } from '@/hooks/useQuestSystem';
import { useAuth } from '@/contexts/AuthContext';
import { getXPProgress } from '@/services/gamification';
import { track } from '@/lib/analytics';
import { QuestCard } from '@/components/QuestCard';
import { CustomQuestCard } from '@/components/quests/CustomQuestCard';
import { MakeQuestSheet } from '@/components/quests/MakeQuestSheet';
import { CreatorLevelCard } from '@/components/quests/CreatorLevel';
import { CommunityQuests, QuestEngineStats } from '@/components/quests/CommunityQuests';
import { QuestDetailView } from '@/components/quests/QuestDetailView';
import { PartyOfMonthVoteModal } from '@/components/PartyOfMonthVoteModal';
import { SponsoredStrip } from '@/components/quests/SponsoredStrip';
import { RewardsHub } from '@/components/quests/RewardsHub';
import { StreakHub } from '@/components/quests/StreakHub';
import { BottomNav } from '@/components/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from 'sonner';

type Hub = 'quests' | 'rewards' | 'streak';
type Tab = 'heatmap' | 'circle' | 'yours' | 'other';

const HUBS: { id: Hub; label: string }[] = [
  { id: 'quests', label: '🎯 Quests' },
  { id: 'rewards', label: '🎁 Rewards' },
  { id: 'streak', label: '🔥 Streak' },
];

const TABS: { id: Tab; label: string; header: string }[] = [
  { id: 'heatmap', label: '🗺️ Heat Map', header: '🗺️ FROM THE HEAT MAP · GPS-VERIFIED' },
  { id: 'circle', label: '💜 Circle', header: '💜 CIRCLE SWIPE · MATCH & VIBE' },
  { id: 'yours', label: '✨ Yours', header: '✨ YOUR QUESTS' },
  { id: 'other', label: '🎯 Other', header: '🎯 REVIEWS · VIBE · SIGNALS' },
];

// map real quest_type -> prototype tab group
const TAB_TYPES: Record<Exclude<Tab, 'yours'>, string[]> = {
  heatmap: ['check_in', 'explore', 'vote_best_party'],
  circle: ['match', 'social'],
  other: ['review', 'vibe', 'signal'],
};

const Quests = () => {
  const { profile } = useAuth();
  const { quests, claimReward } = useQuests();
  const { customQuests } = useCustomQuests();
  const { streak } = useStreak();

  const [hub, setHub] = useState<Hub>('quests');
  const [tab, setTab] = useState<Tab>('heatmap');
  const [makerOpen, setMakerOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const [openQuestId, setOpenQuestId] = useState<string | null>(null);

  const openQuest = openQuestId ? customQuests.find((q: any) => q.id === openQuestId) : null;

  const handleClaim = (questId: string, xpReward: number) => {
    claimReward({ questId, xpReward });
    track('quest_done', { quest_id: questId, xp_reward: xpReward });
    toast.success(`+${xpReward} XP claimed! 🎯`);
  };

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const spendable = (profile as any)?.spendable_xp ?? xp;
  const prog = getXPProgress(xp);

  const shownSystem = useMemo(() => {
    if (tab === 'yours') return [];
    const types = TAB_TYPES[tab];
    return quests.filter((q: any) => types.includes((q.quest_type || '').toLowerCase()));
  }, [quests, tab]);

  const yoursCount = customQuests.length;

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <AppHeader back title="Quests" right={<Target className="h-5 w-5 text-accent" />} />

      {openQuest ? (
        <QuestDetailView quest={openQuest} onBack={() => setOpenQuestId(null)} />
      ) : (
        <>
      {/* XP banner — cinematic Frame, acid is the single hero glow */}
      <div className="px-[18px] pt-3.5 pb-3">
        <div
          className="relative rounded-[22px] p-[18px] overflow-hidden"
          style={{
            background:
              'radial-gradient(130% 100% at 12% 0%, oklch(0.62 0.25 300 / 0.22), transparent 58%),' +
              'radial-gradient(110% 90% at 92% 100%, oklch(0.88 0.19 158 / 0.12), transparent 55%),' +
              'var(--ab-surface)',
            border: '1px solid var(--ab-hairline)',
          }}
        >
          <div className="flex items-end justify-between mb-3.5">
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase" style={{ color: 'var(--ab-ink-3)' }}>Tvoj nivo</div>
              <div className="text-[34px] font-extrabold leading-none mt-1 tabular-nums" style={{ color: 'var(--ab-ink)', letterSpacing: '-0.02em' }}>
                Lv. {level}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--ab-ink-3)' }}>🪙 AFC balans</div>
              <div className="text-lg font-extrabold tabular-nums mt-0.5" style={{ color: 'var(--ab-ink)', fontFeatureSettings: '"tnum"' }}>
                {spendable.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--ab-hairline)' }}>
            <div className="h-full rounded-full ab-acid-fill transition-[width] duration-500" style={{ width: `${prog.percentage}%` }} />
          </div>
          <div className="flex justify-between text-[11px]" style={{ color: 'var(--ab-ink-2)' }}>
            <span className="tabular-nums">{Math.max(prog.required - prog.current, 0).toLocaleString()} XP do Lv. {level + 1}</span>
            <span>🔥 {streak.current_streak} {streak.current_streak === 1 ? 'dan' : 'dana'} zaredom</span>
          </div>
        </div>
      </div>

      {/* Hub sub-nav — UV frames the gamification layer */}
      <div className="px-[18px] pb-3.5">
        <div
          className="grid grid-cols-3 gap-1 p-1 rounded-2xl"
          style={{ background: 'var(--ab-void)', border: '1px solid var(--ab-hairline)' }}
        >
          {HUBS.map((h) => (
            <button
              key={h.id}
              onClick={() => setHub(h.id)}
              className="py-2 rounded-xl text-xs font-bold transition-colors"
              style={
                hub === h.id
                  ? { background: 'oklch(0.62 0.25 300 / 0.18)', color: 'var(--ab-ink)', boxShadow: 'inset 0 0 0 1px oklch(0.62 0.25 300 / 0.45)' }
                  : { color: 'var(--ab-ink-3)' }
              }
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {hub === 'rewards' && <RewardsHub />}
      {hub === 'streak' && <StreakHub />}

      {hub === 'quests' && (
        <>
          {/* Quest engine stats + creator level ladder */}
          <div className="px-[18px] pb-3 space-y-2.5">
            <QuestEngineStats />
            <CreatorLevelCard />
          </div>

          {/* Make a Quest CTA — solid UV (dashed reads as disabled) */}
          <div className="px-[18px] pb-3">
            <motion.button
              whileTap="tap"
              onClick={() => setMakerOpen(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left"
              style={{
                background: 'oklch(0.62 0.25 300 / 0.08)',
                border: '1px solid oklch(0.62 0.25 300 / 0.45)',
              }}
            >
              <motion.div
                variants={{ tap: { rotate: 90 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className="w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--ab-uv), var(--ab-uv-dim))', boxShadow: 'var(--ab-glow-uv)' }}
              >
                <Plus className="w-[22px] h-[22px] text-white" strokeWidth={2.6} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm" style={{ color: 'var(--ab-ink)' }}>Napravi Quest</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--ab-ink-3)' }}>Solo, sa ekipom, ili crew izazov — šablon ili slobodno.</div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--ab-uv)' }} />
            </motion.button>
          </div>

          {/* Community quests — social proof */}
          <CommunityQuests />

          {/* Sponsored */}
          <SponsoredStrip />

          {/* Tabs — quiet ink active; acid stays reserved for progress/claim */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-[18px] pb-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  tab === t.id
                    ? { background: 'var(--ab-raised)', color: 'var(--ab-ink)', boxShadow: 'inset 0 0 0 1px var(--ab-hairline-strong)' }
                    : { color: 'var(--ab-ink-3)' }
                }
              >
                {t.label}{t.id === 'yours' && yoursCount > 0 ? ` · ${yoursCount}` : ''}
              </button>
            ))}
          </div>

          {/* Category header */}
          <div className="px-[18px] pb-2 flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-[0.12em]" style={{ color: 'var(--ab-ink-3)' }}>
              {TABS.find((t) => t.id === tab)?.header}
              {tab === 'yours' && yoursCount > 0 ? ` · ${yoursCount} ACTIVE` : ''}
            </span>
            {tab === 'yours' && (
              <button onClick={() => setMakerOpen(true)} className="text-[11px] font-bold" style={{ color: 'var(--ab-uv)' }}>+ Novi</button>
            )}
          </div>

          {/* Quest list */}
          <div className="px-[18px] space-y-2.5">
            {tab === 'yours' ? (
              yoursCount === 0 ? (
                <EmptyState icon="✨" text="Još nema tvojih questova" sub="Tapni „Napravi Quest“ da kreneš." />
              ) : (
                customQuests.map((q: any) => (
                  <CustomQuestCard key={q.id} quest={q} onOpen={() => setOpenQuestId(q.id)} />
                ))
              )
            ) : shownSystem.length === 0 ? (
              <EmptyState icon="🎯" text="Ovde nema questova ove nedelje" sub="Probaj druge tabove ili svrati sledeće nedelje." />
            ) : (
              shownSystem.map((quest: any, index: number) =>
                (quest.quest_type || '') === 'vote_best_party' ? (
                  <div
                    key={quest.id}
                    className="rounded-2xl p-4"
                    style={{ background: 'oklch(0.62 0.25 300 / 0.07)', border: '1px solid oklch(0.62 0.25 300 / 0.4)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🗳️</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="font-bold text-[15px]" style={{ color: 'var(--ab-ink)' }}>{quest.title}</h4>
                          <span className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--ab-acid-dim)' }}>+{quest.xp_reward} XP</span>
                        </div>
                        <p className="text-[12px] mb-2.5" style={{ color: 'var(--ab-ink-3)' }}>{quest.description}</p>
                        <button
                          onClick={() => setVoteOpen(true)}
                          className="w-full py-2.5 rounded-xl font-extrabold text-[13px]"
                          style={{ background: 'linear-gradient(135deg, var(--ab-uv), var(--ab-uv-dim))', color: '#fff' }}
                        >
                          {quest.is_completed ? '✓ Glasao si · promeni izbor' : '🗳️ Glasaj sada'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <QuestCard
                    key={quest.id}
                    icon={quest.icon || '🎯'}
                    title={quest.title}
                    description={quest.description}
                    progress={quest.progress}
                    targetCount={quest.target_count}
                    xpReward={quest.xp_reward}
                    isCompleted={quest.is_completed}
                    xpClaimed={quest.xp_claimed}
                    onClaim={() => handleClaim(quest.id, quest.xp_reward)}
                    index={index}
                  />
                )
              )
            )}
          </div>
        </>
      )}
        </>
      )}

      <BottomNav />

      {makerOpen && <MakeQuestSheet onClose={() => setMakerOpen(false)} />}
      {voteOpen && <PartyOfMonthVoteModal onClose={() => setVoteOpen(false)} />}
    </div>
  );
};

const EmptyState = ({ icon, text, sub }: { icon: string; text: string; sub: string }) => (
  <div className="text-center py-10">
    <div className="text-3xl mb-2 opacity-70">{icon}</div>
    <p className="text-sm font-semibold" style={{ color: 'var(--ab-ink-2)' }}>{text}</p>
    <p className="text-xs mt-1" style={{ color: 'var(--ab-ink-3)' }}>{sub}</p>
  </div>
);

export default Quests;
