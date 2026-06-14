import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Check, ChevronRight } from 'lucide-react';
import { useCreatorStatus } from '@/hooks/useQuestSystem';
import { CREATOR_TIERS, tierMeta, nextTier, type CreatorStatus } from '@/lib/creatorLevels';
import { cn } from '@/lib/utils';

const tierGrad = (hue: number) =>
  `linear-gradient(135deg, oklch(0.5 0.2 ${hue}), oklch(0.45 0.22 ${(hue + 40) % 360}))`;

/** Progress toward the next creator tier (level + created, whichever lags). */
const progressToNext = (s: CreatorStatus) => {
  const next = nextTier(s.tier);
  if (!next) return { next: null, pct: 100, levelMet: true, createdMet: true };
  const lvlPct = next.needLevel ? Math.min(1, s.level / next.needLevel) : 1;
  const crtPct = next.needCreated ? Math.min(1, s.created / next.needCreated) : 1;
  return {
    next,
    pct: Math.round(Math.min(lvlPct, crtPct) * 100),
    levelMet: s.level >= next.needLevel,
    createdMet: s.created >= next.needCreated,
  };
};

/* ───────── Compact card for the Quests page ───────── */
export const CreatorLevelCard = () => {
  const { status } = useCreatorStatus();
  const [open, setOpen] = useState(false);
  const cur = tierMeta(status.tier);
  const { next, pct, levelMet, createdMet } = progressToNext(status);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3"
      >
        <div
          className="w-12 h-12 rounded-2xl flex-shrink-0 grid place-items-center text-2xl"
          style={{ background: tierGrad(cur.hue), boxShadow: `0 8px 18px -8px oklch(0.5 0.2 ${cur.hue})` }}
        >
          {cur.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">CREATOR</span>
            <span className="text-[10px] font-bold text-accent">TIER {status.tier}</span>
            {status.is_founding_raver && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white">✨ FOUNDING RAVER</span>
            )}
          </div>
          <div className="font-extrabold text-sm leading-tight">{cur.name}</div>
          {next ? (
            <>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 truncate">
                Next: {next.icon} {next.name} ·{' '}
                {!levelMet && <span>Lv.{next.needLevel} </span>}
                {!createdMet && <span>{next.needCreated} created</span>}
                {levelMet && createdMet && <span>ready to unlock</span>}
              </div>
            </>
          ) : (
            <div className="text-[10px] text-success mt-1">Max tier — full creator powers 💸</div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
      {open && <CreatorLadderSheet onClose={() => setOpen(false)} />}
    </>
  );
};

/* ───────── Full ladder sheet ───────── */
export const CreatorLadderSheet = ({ onClose }: { onClose: () => void }) => {
  const { status } = useCreatorStatus();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 bg-background rounded-t-[26px] px-4 pt-3.5 pb-7 max-h-[92%] overflow-y-auto no-scrollbar shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wide">CREATOR PATH</div>
            <div className="text-[22px] font-extrabold mt-0.5">Level up to create more</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Each rung unlocks a bigger reach — and stacks on the one before it. You're at{' '}
          <span className="text-foreground font-semibold">Lv.{status.level}</span> with{' '}
          <span className="text-foreground font-semibold">{status.created}</span> quest{status.created === 1 ? '' : 's'} created.
        </p>

        <div className="space-y-2.5">
          {CREATOR_TIERS.map((t) => {
            const unlocked = status.tier >= t.tier;
            const current = status.tier === t.tier;
            return (
              <div
                key={t.tier}
                className={cn(
                  'rounded-2xl border p-3.5 transition',
                  current ? 'border-accent/60' : unlocked ? 'border-success/30' : 'border-border',
                )}
                style={current ? { background: 'linear-gradient(135deg, hsl(var(--accent)/0.12), hsl(var(--secondary)/0.06))' }
                  : { background: unlocked ? 'hsl(var(--card))' : 'hsl(var(--card)/0.5)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn('w-11 h-11 rounded-2xl grid place-items-center text-xl flex-shrink-0', !unlocked && 'grayscale opacity-60')}
                    style={{ background: tierGrad(t.hue) }}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">{t.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground">TIER {t.tier}</span>
                      {current && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/25 text-accent">YOU</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t.blurb}</div>
                  </div>
                  {unlocked
                    ? <Check className="w-5 h-5 text-success flex-shrink-0" />
                    : <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </div>

                <ul className="mt-2.5 space-y-1">
                  {t.unlocks.map((u) => (
                    <li key={u} className="flex items-center gap-2 text-[12px]">
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', unlocked ? 'bg-success' : 'bg-muted-foreground/40')} />
                      <span className={unlocked ? '' : 'text-muted-foreground'}>{u}</span>
                    </li>
                  ))}
                </ul>

                {t.tier > 0 && !unlocked && (
                  <div className="mt-2.5 flex gap-1.5">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      status.level >= t.needLevel ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-muted-foreground')}>
                      {status.level >= t.needLevel ? '✓' : ''} Player Lv.{t.needLevel}
                    </span>
                    {t.needCreated > 0 && (
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                        status.created >= t.needCreated ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-muted-foreground')}>
                        {status.created >= t.needCreated ? '✓' : ''} {t.needCreated} quests created
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
