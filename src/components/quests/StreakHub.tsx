import { useStreak } from '@/hooks/useQuestSystem';
import { getCurrentWeekStart } from '@/services/questProgress';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_XP = [10, 10, 15, 15, 25, 30, 100];

const MILESTONES = [
  { d: 7, reward: 'Free venue peek ×1', icon: '👁' },
  { d: 14, reward: 'Skip-the-line pass', icon: '🚪' },
  { d: 30, reward: 'AfterBefore+ 1 week', icon: '💎' },
  { d: 100, reward: 'Legend badge + bottle', icon: '👑' },
];

export const StreakHub = () => {
  const { streak, claimedToday, claimedDates, claim, isClaiming } = useStreak();
  const weekStart = getCurrentWeekStart();
  const today = new Date().toISOString().split('T')[0];

  // build Mon..Sun for the current week
  const days = DAY_LABELS.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    return {
      label,
      iso,
      xp: DAY_XP[i],
      big: i === 6,
      done: claimedDates.has(iso),
      today: iso === today,
    };
  });

  return (
    <div className="px-4">
      {/* Big streak */}
      <div className="text-center p-4 rounded-[22px] mb-3.5 border border-heat/40 bg-gradient-to-br from-heat/20 to-destructive/10">
        <div className="text-[44px] leading-none">🔥</div>
        <div className="text-3xl font-extrabold mt-1">{streak.current_streak} days</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Keep it alive — check in today for <strong className="text-accent">+25 XP</strong>
        </div>
      </div>

      {/* 7-day track */}
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">This week</div>
      <div className="flex gap-1.5 mb-4">
        {days.map((d) => (
          <div
            key={d.iso}
            className="rounded-xl text-center py-2.5 px-1 border"
            style={{
              flex: d.big ? 1.4 : 1,
              background: d.done
                ? 'linear-gradient(160deg, hsl(var(--success) / 0.8), hsl(var(--success) / 0.4))'
                : d.today
                ? 'linear-gradient(160deg, hsl(var(--primary)), hsl(var(--secondary)))'
                : d.big
                ? 'hsl(var(--accent) / 0.14)'
                : 'rgba(255,255,255,0.04)',
              borderColor: d.today ? 'rgba(255,255,255,0.4)' : d.big ? 'hsl(var(--accent) / 0.4)' : 'hsl(var(--border))',
            }}
          >
            <div className={`text-[9px] font-semibold mb-1 ${d.done || d.today ? 'text-white' : 'text-muted-foreground'}`}>{d.label}</div>
            <div className={d.big ? 'text-xl' : 'text-base'}>{d.done ? '✓' : d.today ? '🎁' : d.big ? '👑' : '🔒'}</div>
            <div className={`text-[9px] font-bold mt-0.5 ${d.done || d.today ? 'text-white' : d.big ? 'text-accent' : 'text-muted-foreground'}`}>+{d.xp}</div>
          </div>
        ))}
      </div>

      {/* Claim */}
      <button
        onClick={() => claim()}
        disabled={claimedToday || isClaiming}
        className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm mb-4 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', boxShadow: '0 10px 28px -8px hsl(var(--primary) / 0.6)' }}
      >
        {claimedToday ? "✓ Claimed today" : "🎁 Claim today's +25 XP"}
      </button>

      {/* Milestones */}
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Streak milestones</div>
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        {MILESTONES.map((m, i) => (
          <div key={m.d} className={`flex items-center gap-3 px-3.5 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
            <div className="w-9 h-9 rounded-[10px] bg-white/5 flex items-center justify-center text-lg">{m.icon}</div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold">{m.d}-day streak</div>
              <div className="text-[11px] text-muted-foreground">{m.reward}</div>
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold">
              {Math.min(streak.current_streak, m.d)}/{m.d}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
