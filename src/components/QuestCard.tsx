import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { hueFromString } from '@/lib/gradients';
import { cn } from '@/lib/utils';

interface QuestCardProps {
  icon: string;
  title: string;
  description: string;
  progress: number;
  targetCount: number;
  xpReward: number;
  isCompleted: boolean;
  xpClaimed: boolean;
  onClaim: () => void;
  index: number;
}

// Signature ease from the design system (--ease-out).
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const QuestCard = ({
  icon,
  title,
  description,
  progress,
  targetCount,
  xpReward,
  isCompleted,
  xpClaimed,
  onClaim,
  index,
}: QuestCardProps) => {
  const percentage = Math.min(100, (progress / targetCount) * 100);
  const hue = hueFromString(title); // each quest carries a subtle culture color
  const [igniting, setIgniting] = useState(false);

  const handleClaim = () => {
    setIgniting(true);          // fire XP-Fly + ignite bloom
    onClaim();
    setTimeout(() => setIgniting(false), 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, ease: EASE_OUT, duration: 0.36 }} // 45ms stagger, not 100ms
      className={cn(
        'relative rounded-2xl p-4 overflow-hidden transition-opacity',
        xpClaimed && 'opacity-55',
        igniting && 'ab-ignite',
      )}
      style={{
        background: `var(--ab-surface)`,
        border: '1px solid var(--ab-hairline)',
        borderLeft: `3px solid oklch(0.64 0.18 ${hue})`,
      }}
    >
      {/* faint genre wash, top-left */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(120% 80% at 0% 0%, oklch(0.64 0.18 ${hue} / 0.07), transparent 60%)` }}
      />

      <div className="relative flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 leading-none mt-0.5">{icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-bold text-[15px] truncate" style={{ color: 'var(--ab-ink)' }}>{title}</h4>
            <span
              className="text-[11px] font-bold flex-shrink-0 tabular-nums"
              style={{ color: 'var(--ab-acid-dim)', fontFeatureSettings: '"tnum"' }}
            >
              +{xpReward} XP
            </span>
          </div>
          <p className="text-[12px] mb-2.5 leading-snug" style={{ color: 'var(--ab-ink-3)' }}>{description}</p>

          {/* thick acid progress with edge-glow */}
          <div className="flex items-center gap-2.5">
            <div
              className="h-3 flex-1 rounded-full overflow-hidden"
              style={{ background: 'var(--ab-hairline)' }}
            >
              <motion.div
                className={cn('h-full rounded-full', percentage > 0 && 'ab-acid-fill')}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ ease: EASE_OUT, duration: 0.5 }}
              />
            </div>
            <span
              className="text-[11px] flex-shrink-0 tabular-nums font-semibold"
              style={{ color: 'var(--ab-ink-3)', fontFeatureSettings: '"tnum"' }}
            >
              {progress}/{targetCount}
            </span>
          </div>
        </div>

        {/* trophy claim / claimed state */}
        {isCompleted && !xpClaimed && (
          <div className="relative flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleClaim}
              className="px-3.5 py-2 rounded-full text-[12px] font-extrabold"
              style={{
                background: 'var(--ab-acid)',
                color: 'var(--ab-acid-ink)',
                boxShadow: 'var(--ab-glow-acid)',
              }}
            >
              Pokupi
            </motion.button>

            {/* XP-Fly: the "earned it" moment */}
            <AnimatePresence>
              {igniting && (
                <motion.div
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -34, scale: 1 }}
                  exit={{ opacity: 0, y: -52 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                  className="absolute -top-1 right-0 text-[12px] font-extrabold whitespace-nowrap pointer-events-none tabular-nums"
                  style={{ color: 'var(--ab-acid)', textShadow: '0 0 10px oklch(0.88 0.19 158 / 0.7)' }}
                >
                  +{xpReward} XP
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {xpClaimed && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'oklch(0.88 0.19 158 / 0.16)' }}
          >
            <Check className="w-4 h-4" style={{ color: 'var(--ab-acid)' }} strokeWidth={3} />
          </div>
        )}
      </div>
    </motion.div>
  );
};
