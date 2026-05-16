import { motion } from 'framer-motion';
import { Check, Flame, MapPin, MessageSquare, Sparkles, Trophy } from 'lucide-react';
import { useLucky100Counter } from '@/hooks/useLucky100Counter';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';

interface Reward {
  key: string;
  icon: React.ReactNode;
  label: string;
  xp: number;
  done?: boolean;
  onClick?: () => void;
}

interface Props {
  isCheckedIn?: boolean;
  isGoing?: boolean;
  hasReviewed?: boolean;
  onCheckIn?: () => void;
  onGoing?: () => void;
  onReview?: () => void;
  onVibeSignal?: () => void;
  /** Hide the Lucky 100 strip (e.g. on non-event venue profiles) */
  hideLucky?: boolean;
  className?: string;
}

/**
 * Inline gamification card — surfaces XP rewards available on the current page
 * (check-in, going, review, vibe signal) plus live Lucky 100 progress.
 */
export const XPRewardCard = ({
  isCheckedIn,
  isGoing,
  hasReviewed,
  onCheckIn,
  onGoing,
  onReview,
  onVibeSignal,
  hideLucky,
  className,
}: Props) => {
  const { stats } = useLucky100Counter();
  const luckyProgress = stats.globalCount % 5;
  const luckyTotal = 5;

  const rewards: Reward[] = [
    onCheckIn && {
      key: 'checkin',
      icon: <MapPin className="h-4 w-4" />,
      label: 'Check in here',
      xp: 50,
      done: isCheckedIn,
      onClick: onCheckIn,
    },
    onGoing && {
      key: 'going',
      icon: <Flame className="h-4 w-4" />,
      label: "Mark you're going",
      xp: 25,
      done: isGoing,
      onClick: onGoing,
    },
    onReview && {
      key: 'review',
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Write a review',
      xp: 30,
      done: hasReviewed,
      onClick: onReview,
    },
    onVibeSignal && {
      key: 'vibe',
      icon: <Sparkles className="h-4 w-4" />,
      label: 'Send a vibe signal',
      xp: 15,
      onClick: onVibeSignal,
    },
  ].filter(Boolean) as Reward[];

  if (!rewards.length && hideLucky) return null;

  const totalAvailable = rewards.filter((r) => !r.done).reduce((a, r) => a + r.xp, 0);

  return (
    <motion.div
      {...fadeUp}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-4 backdrop-blur-xl',
        className
      )}
    >
      {/* Accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Earn XP here
          </span>
        </div>
        {totalAvailable > 0 && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">
            +{totalAvailable} XP available
          </span>
        )}
      </div>

      {rewards.length > 0 && (
        <div className="space-y-1.5">
          {rewards.map((r) => (
            <button
              key={r.key}
              onClick={r.onClick}
              disabled={r.done}
              className={cn(
                'group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition',
                r.done
                  ? 'border-success/30 bg-success/5 text-success'
                  : 'border-white/10 bg-white/5 hover:border-primary/40 hover:bg-primary/10'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full',
                    r.done ? 'bg-success/20' : 'bg-primary/15 text-primary'
                  )}
                >
                  {r.done ? <Check className="h-4 w-4" /> : r.icon}
                </span>
                <span className={cn('text-sm font-medium', r.done && 'line-through opacity-70')}>
                  {r.label}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-bold',
                  r.done ? 'text-success/70' : 'text-accent'
                )}
              >
                +{r.xp} XP
              </span>
            </button>
          ))}
        </div>
      )}

      {!hideLucky && (
        <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-accent">🎰 Lucky 100</span>
            <span className="text-[11px] text-muted-foreground">
              {luckyProgress}/{luckyTotal} to next winner
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-accent/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(luckyProgress / luckyTotal) * 100}%` }}
              transition={{ duration: 0.6 }}
              className="h-full rounded-full bg-gradient-to-r from-accent to-yellow-300"
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Every 5th global check-in wins a partner guestlist spot.
          </p>
        </div>
      )}
    </motion.div>
  );
};
