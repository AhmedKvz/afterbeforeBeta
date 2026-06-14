import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Lock } from 'lucide-react';
import { useCustomQuests, useCreatorStatus } from '@/hooks/useQuestSystem';
import { REACH_OPTIONS, tierMeta, type Visibility } from '@/lib/creatorLevels';
import { CreatorLadderSheet } from '@/components/quests/CreatorLevel';
import { cn } from '@/lib/utils';

const QUEST_TEMPLATES = [
  { id: 't1', icon: '🗺️', title: 'Venue crawl', sub: 'Visit N venues in one night', kind: 'walk', defaultTarget: 4, defaultXP: 200 },
  { id: 't2', icon: '☕', title: 'New cafés', sub: 'Try N places you\'ve never been', kind: 'walk', defaultTarget: 5, defaultXP: 250 },
  { id: 't3', icon: '🎨', title: 'Culture run', sub: 'Galleries / libraries / museums', kind: 'walk', defaultTarget: 3, defaultXP: 150 },
  { id: 't4', icon: '💜', title: 'Find a date', sub: 'Match + plan a night together', kind: 'match', defaultTarget: 1, defaultXP: 100 },
  { id: 't5', icon: '🍸', title: 'Drink crawl', sub: 'N bars in one neighborhood', kind: 'walk', defaultTarget: 4, defaultXP: 180 },
  { id: 't6', icon: '🚢', title: 'Splav night', sub: 'N splavi before sunrise', kind: 'walk', defaultTarget: 3, defaultXP: 300 },
  { id: 't7', icon: '🤝', title: 'Custom (freeform)', sub: 'Set your own goal & XP reward', kind: 'custom', defaultTarget: 1, defaultXP: 100 },
];

const TIMEFRAMES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

interface MakeQuestSheetProps {
  onClose: () => void;
}

export const MakeQuestSheet = ({ onClose }: MakeQuestSheetProps) => {
  const { create, isCreating } = useCustomQuests();
  const { status } = useCreatorStatus();
  const [step, setStep] = useState<'template' | 'config'>('template');
  const [tpl, setTpl] = useState<any>(null);
  const [target, setTarget] = useState(3);
  const [timeframe, setTimeframe] = useState('week');
  const [reach, setReach] = useState<Visibility>('private');
  const [showLadder, setShowLadder] = useState(false);

  const isCrew = reach === 'crew';
  const xp = tpl ? Math.round(tpl.defaultXP * (target / tpl.defaultTarget) * (isCrew ? 1.5 : 1)) : 0;

  const handleCreate = () => {
    if (!tpl) return;
    create({
      icon: tpl.icon,
      title: tpl.title,
      description: tpl.sub,
      kind: tpl.kind,
      target,
      xp,
      timeframe,
      isCrew,
      visibility: reach,
    });
    onClose();
  };

  /* Gate: tier 0 cannot create anything yet. */
  if (status.tier < 1) {
    return (
      <Shell onClose={onClose}>
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-3xl mx-auto grid place-items-center text-3xl mb-3"
            style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 282), oklch(0.45 0.22 330))' }}>
            🛠️
          </div>
          <div className="text-[20px] font-extrabold">Unlock quest creation</div>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[280px] mx-auto">
            Reach <span className="text-foreground font-semibold">player Level 2</span> to become a{' '}
            <span className="text-foreground font-semibold">Crew Maker</span> and design your first quest.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-full bg-card border border-border">
            <span className="text-muted-foreground">You're at</span>
            <span className="font-bold">Lv.{status.level}</span>
          </div>
          <button onClick={() => setShowLadder(true)}
            className="block w-full mt-5 py-3.5 rounded-2xl text-white font-extrabold text-sm"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
            See the creator path →
          </button>
        </div>
        {showLadder && <CreatorLadderSheet onClose={() => setShowLadder(false)} />}
      </Shell>
    );
  }

  return (
    <>
    <Shell onClose={onClose}
      back={step === 'config' ? () => setStep('template') : undefined}
      stepLabel={step === 'template' ? 'STEP 1 / 2' : 'STEP 2 / 2'}
      title={step === 'template' ? 'Pick a quest type' : 'Set the rules'}
    >
      <AnimatePresence mode="wait">
        {step === 'template' ? (
          <motion.div key="tpl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2.5">
            {QUEST_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTpl(t); setTarget(t.defaultTarget); setStep('config'); }}
                className="text-left p-3 rounded-2xl bg-card border border-border flex flex-col gap-1"
              >
                <div className="text-2xl">{t.icon}</div>
                <div className="font-bold text-[13px] mt-1">{t.title}</div>
                <div className="text-[10px] text-muted-foreground leading-snug">{t.sub}</div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div key="cfg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* selected template */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-card mb-4">
              <div className="text-2xl">{tpl.icon}</div>
              <div>
                <div className="font-bold text-sm">{tpl.title}</div>
                <div className="text-[11px] text-muted-foreground">{tpl.sub}</div>
              </div>
            </div>

            {/* target */}
            <div className="mb-4">
              <div className="text-[11px] text-muted-foreground font-semibold tracking-wide mb-2">HOW MANY?</div>
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-card border border-border">
                <button onClick={() => setTarget((t) => Math.max(1, t - 1))} className="w-9 h-9 rounded-xl bg-white/[0.06] text-lg font-semibold">−</button>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-extrabold">{target}</div>
                  <div className="text-[10px] text-muted-foreground">venues / matches / spots</div>
                </div>
                <button onClick={() => setTarget((t) => Math.min(20, t + 1))} className="w-9 h-9 rounded-xl bg-white/[0.06] text-lg font-semibold">+</button>
              </div>
            </div>

            {/* timeframe */}
            <div className="mb-4">
              <div className="text-[11px] text-muted-foreground font-semibold tracking-wide mb-2">WHEN?</div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-card border border-border">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id)}
                    className={`py-2 rounded-xl text-xs font-semibold transition ${timeframe === tf.id ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'text-muted-foreground'}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* reach — gated by creator tier */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground font-semibold tracking-wide">REACH</span>
                <button onClick={() => setShowLadder(true)} className="text-[10px] font-bold text-accent">Tier {status.tier} · upgrade →</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {REACH_OPTIONS.map((opt) => {
                  const locked = status.tier < opt.tier;
                  const active = reach === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => (locked ? setShowLadder(true) : setReach(opt.id))}
                      className={cn('text-left p-3 rounded-2xl border relative', locked && 'opacity-70')}
                      style={{
                        background: active ? 'linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--secondary) / 0.08))' : 'hsl(var(--card))',
                        borderColor: active ? 'hsl(var(--accent) / 0.55)' : 'hsl(var(--border))',
                      }}
                    >
                      {locked && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                          <Lock className="w-3 h-3" /> T{opt.tier}
                        </span>
                      )}
                      <div className={cn('text-[20px] mb-1', locked && 'grayscale')}>{opt.icon}</div>
                      <div className="text-[13px] font-bold">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
              {(reach === 'community' || reach === 'public') && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  🛡️ {reach === 'community' ? 'Goes to a quick safety review before it appears for others.' : 'Auto-published — AI safety check applies.'}
                </p>
              )}
            </div>

            {/* XP preview */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/10 to-secondary/5 mb-3.5">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground">Reward on completion</div>
                <div className="text-lg font-extrabold text-accent">+{xp} XP</div>
              </div>
              {isCrew && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">1.5× crew bonus</span>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', boxShadow: '0 10px 28px -8px hsl(var(--primary) / 0.55)' }}
            >
              {isCrew ? '📨 Send invites & start quest'
                : reach === 'community' ? '🗳️ Submit to community'
                : reach === 'public' ? '🌍 Publish quest'
                : '🚀 Start quest'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
    {showLadder && <CreatorLadderSheet onClose={() => setShowLadder(false)} />}
    </>
  );
};

/* Shared bottom-sheet chrome */
const Shell = ({ children, onClose, back, stepLabel, title }: {
  children: React.ReactNode; onClose: () => void; back?: () => void; stepLabel?: string; title?: string;
}) => (
  <div className="fixed inset-0 z-[100] flex flex-col justify-end">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative z-10 bg-background rounded-t-[26px] px-4 pt-3.5 pb-7 max-h-[92%] overflow-y-auto no-scrollbar shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
      <div className="flex items-start gap-2 mb-3.5">
        {back && (
          <button onClick={back} className="flex items-center pt-1">
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
        )}
        <div className="flex-1">
          {stepLabel && <div className="text-[11px] text-muted-foreground font-semibold tracking-wide">{stepLabel}</div>}
          {title && <div className="text-[22px] font-extrabold mt-0.5">{title}</div>}
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);
