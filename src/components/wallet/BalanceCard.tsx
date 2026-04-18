import { motion } from 'framer-motion';
import { Sparkles, Coins } from 'lucide-react';
import { formatEurCents, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  variant: 'xp' | 'sc';
  amount: number; // xp = number, sc = cents
  subtitle?: string;
  className?: string;
}

export const BalanceCard = ({ variant, amount, subtitle, className }: BalanceCardProps) => {
  const isXP = variant === 'xp';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-[14px] p-5 border border-white/5',
        isXP ? 'bg-[#0f0f14]' : 'bg-[#0f0f14]',
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {isXP ? (
            <Sparkles className="w-4 h-4" style={{ color: '#EF9F27' }} />
          ) : (
            <Coins className="w-4 h-4" style={{ color: '#5DCAA5' }} />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">
            {isXP ? 'XP · Status' : 'Scene Credits'}
          </span>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-4xl font-bold tabular-nums tracking-tight"
          style={{ color: isXP ? '#EF9F27' : '#5DCAA5', fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {isXP ? formatNumber(amount) : formatEurCents(amount)}
        </span>
        {isXP && <span className="font-mono text-xs text-white/40">XP</span>}
      </div>

      {subtitle && (
        <p className="mt-2 font-mono text-[11px] text-white/40">{subtitle}</p>
      )}

      <div
        className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full opacity-[0.06] blur-2xl pointer-events-none"
        style={{ background: isXP ? '#EF9F27' : '#5DCAA5' }}
      />
    </motion.div>
  );
};
