import { ActivityItem } from '@/hooks/useWalletActivity';
import { formatEurCents, formatNumber } from '@/lib/format';
import { Sparkles, Coins, ArrowDownLeft, ArrowUpRight, Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  item: ActivityItem;
}

export const WalletActivityItem = ({ item }: Props) => {
  const incoming = item.amount > 0;
  const isXP = item.kind === 'xp';

  const Icon =
    item.type.includes('gift') || item.type.includes('Gift')
      ? Gift
      : isXP
        ? Sparkles
        : incoming
          ? ArrowDownLeft
          : ArrowUpRight;

  const color = incoming
    ? '#5DCAA5'
    : isXP
      ? '#EF9F27'
      : '#D85A30';

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `${color}1A`, color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {item.description}
          </div>
          <div className="font-mono text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>
      <div className="font-mono text-sm tabular-nums shrink-0 ml-3" style={{ color }}>
        {incoming ? '+' : ''}
        {isXP
          ? `${formatNumber(item.amount)} XP`
          : formatEurCents(item.amount)}
      </div>
    </div>
  );
};
