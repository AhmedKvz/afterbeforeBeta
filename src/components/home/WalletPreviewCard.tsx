import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowRight, Sparkles, Coins } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { formatEUR } from '@/lib/format';

export const WalletPreviewCard = () => {
  const navigate = useNavigate();
  const { data: wallet, isLoading } = useWallet();

  if (isLoading) return null;

  return (
    <div className="px-4 mb-4">
      <button
        onClick={() => navigate('/wallet')}
        className="w-full rounded-2xl p-4 bg-gradient-to-br from-primary/15 via-purple-500/10 to-amber-500/10 border border-primary/25 backdrop-blur-xl text-left"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Wallet</span>
          </div>
          <span className="text-xs text-primary font-bold flex items-center gap-1">
            Otvori <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background/40 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">XP</span>
            </div>
            <div className="text-lg font-bold">{wallet?.xpBalance ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Lvl {wallet?.level ?? 1}</div>
          </div>

          <div className="rounded-xl bg-background/40 border border-border/40 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Coins className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">SC</span>
            </div>
            <div className="text-lg font-bold">{formatEUR(wallet?.scBalanceCents ?? 0)}</div>
            <div className="text-[10px] text-muted-foreground">Scene Credits</div>
          </div>
        </div>
      </button>
    </div>
  );
};
