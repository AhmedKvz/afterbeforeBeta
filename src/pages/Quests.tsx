import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, ChevronRight } from 'lucide-react';
import { useQuests } from '@/hooks/useQuests';
import { useCustomQuests } from '@/hooks/useQuestSystem';
import { useStreak } from '@/hooks/useQuestSystem';
import { useAuth } from '@/contexts/AuthContext';
import { getXPProgress } from '@/services/gamification';
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
import { cn } from '@/lib/utils';

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
      {/* XP banner */}
      <div className="px-4 pt-3.5 pb-3">
        <div
          className="rounded-[22px] p-[18px]"
          style={{
            background: 'linear-gradient(135deg, oklch(0.4 0.2 280) 0%, oklch(0.45 0.22 330) 100%)',
            boxShadow: '0 14px 32px -12px hsl(var(--primary) / 0.5)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-white/80">YOUR LEVEL</div>
              <div className="text-[28px] font-extrabold text-white mt-0.5">Lv. {level}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-white/80">🪙 AFC balans</div>
              <div className="text-xl font-extrabold text-white">{spendable.toLocaleString()} AFC</div>
            </div>
          </div>
          <div className="h-2 rounded bg-white/20 overflow-hidden mb-1.5">
            <div className="h-full rounded bg-gradient-to-r from-white to-white/70" style={{ width: `${prog.percentage}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-white/85">
            <span>{Math.max(prog.required - prog.current, 0).toLocaleString()} XP to Lv. {level + 1}</span>
            <span>🔥 {streak.current_streak}-day streak</span>
          </div>
        </div>
      </div>

      {/* Hub sub-nav */}
      <div className="px-4 pb-3.5">
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-card border border-border">
          {HUBS.map((h) => (
            <button
              key={h.id}
              onClick={() => setHub(h.id)}
              className={cn(
                'py-2 rounded-xl text-xs font-semibold transition',
                hub === h.id ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'text-muted-foreground'
              )}
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
          <div className="px-4 pb-3 space-y-2.5">
            <QuestEngineStats />
            <CreatorLevelCard />
          </div>

          {/* Make a Quest CTA */}
          <div className="px-4 pb-3">
            <button
              onClick={() => setMakerOpen(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left border-[1.5px] border-dashed border-accent/50 bg-gradient-to-br from-accent/10 to-secondary/5"
            >
              <div
                className="w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))', boxShadow: '0 6px 14px -4px hsl(var(--accent) / 0.55)' }}
              >
                <Plus className="w-[22px] h-[22px] text-white" strokeWidth={2.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm">Make a Quest</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Solo, with friends, or a crew challenge — pick a template or freeform.</div>
              </div>
              <ChevronRight className="w-4 h-4 text-accent" />
            </button>
          </div>

          {/* Community quests — social proof */}
          <CommunityQuests />

          {/* Sponsored */}
          <SponsoredStrip />

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition',
                  tab === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border'
                )}
              >
                {t.label}{t.id === 'yours' && yoursCount > 0 ? ` · ${yoursCount}` : ''}
              </button>
            ))}
          </div>

          {/* Category header */}
          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
              {TABS.find((t) => t.id === tab)?.header}
              {tab === 'yours' && yoursCount > 0 ? ` · ${yoursCount} ACTIVE` : ''}
            </span>
            {tab === 'yours' && (
              <button onClick={() => setMakerOpen(true)} className="text-[11px] font-bold text-accent">+ New</button>
            )}
          </div>

          {/* Quest list */}
          <div className="px-4 space-y-2.5">
            {tab === 'yours' ? (
              yoursCount === 0 ? (
                <EmptyState icon="✨" text="No custom quests yet" sub="Tap “Make a Quest” to create one." />
              ) : (
                customQuests.map((q: any) => (
                  <CustomQuestCard key={q.id} quest={q} onOpen={() => setOpenQuestId(q.id)} />
                ))
              )
            ) : shownSystem.length === 0 ? (
              <EmptyState icon="🎯" text="No quests here this week" sub="Check other tabs or come back next week." />
            ) : (
              shownSystem.map((quest: any, index: number) =>
                (quest.quest_type || '') === 'vote_best_party' ? (
                  <div key={quest.id} className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-secondary/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🗳️</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="font-bold text-sm">{quest.title}</h4>
                          <span className="text-xs font-bold text-accent">+{quest.xp_reward} XP</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2.5">{quest.description}</p>
                        <button
                          onClick={() => setVoteOpen(true)}
                          className="w-full py-2 rounded-xl text-white font-bold text-xs"
                          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
                        >
                          {quest.is_completed ? '✓ Voted · change pick' : '🗳️ Vote now'}
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
  <div className="text-center py-10 text-muted-foreground">
    <div className="text-3xl mb-2 opacity-70">{icon}</div>
    <p className="text-sm font-medium">{text}</p>
    <p className="text-xs mt-1">{sub}</p>
  </div>
);

export default Quests;
