import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useQuestSystem';

export const RewardsHub = () => {
  const { profile } = useAuth();
  const { rewards, redeem, isRedeeming } = useRewards();
  const balance = (profile as any)?.spendable_xp ?? profile?.xp ?? 0;

  return (
    <div className="px-4">
      {/* Balance strip */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl mb-4 border border-accent/40 bg-gradient-to-br from-accent/15 to-secondary/10">
        <div className="text-3xl">💰</div>
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground">Your balance</div>
          <div className="text-2xl font-extrabold text-accent">{balance.toLocaleString()} XP</div>
        </div>
        <div className="text-[11px] text-muted-foreground text-right leading-tight">
          Earn more<br />in Quests →
        </div>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">🎁 Redeem perks</div>
      <div className="grid grid-cols-2 gap-2.5">
        {rewards.map((r: any) => {
          const afford = balance >= r.cost_xp && !r.is_locked;
          return (
            <div
              key={r.id}
              className="relative flex flex-col p-3 rounded-2xl border"
              style={{
                background: r.is_locked ? 'rgba(20,20,20,0.7)' : 'hsl(var(--card))',
                borderColor: r.tag === 'Best value' ? 'hsl(var(--accent) / 0.4)' : 'hsl(var(--border))',
                opacity: r.is_locked ? 0.65 : 1,
              }}
            >
              {r.tag && (
                <span
                  className="absolute -top-2 right-2.5 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold tracking-wide"
                  style={
                    r.tag === 'Best value'
                      ? { background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.14)', color: 'hsl(var(--foreground))' }
                  }
                >
                  {r.tag.toUpperCase()}
                </span>
              )}
              <div
                className="w-[42px] h-[42px] rounded-xl mb-2 flex items-center justify-center text-[22px]"
                style={{ background: `linear-gradient(135deg, oklch(0.55 0.2 ${r.hue}), oklch(0.36 0.16 ${(r.hue + 30) % 360}))` }}
              >
                {r.is_locked ? '🔒' : r.icon}
              </div>
              <div className="font-bold text-[13px] leading-tight">{r.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 mb-2.5 flex-1">{r.sub}</div>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-extrabold text-sm ${afford ? 'text-accent' : 'text-muted-foreground'}`}>
                  {r.cost_xp.toLocaleString()}
                </span>
                <span className="text-[9px] text-text-faint">{r.stock_label}</span>
              </div>
              <button
                disabled={!afford || isRedeeming}
                onClick={() => redeem(r.id)}
                className="w-full py-2 rounded-[10px] text-[11px] font-bold"
                style={
                  afford
                    ? { background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--text-faint))' }
                }
              >
                {r.is_locked ? 'VIP locked' : afford ? 'Redeem' : 'Not enough XP'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
