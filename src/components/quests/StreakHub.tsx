import { useStreak } from '@/hooks/useQuestSystem';
import { getCurrentWeekStart } from '@/services/questProgress';

const DAY_LABELS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
const DAY_XP = [10, 10, 15, 15, 25, 30, 100];

const MILESTONES = [
  { d: 4,   reward: 'Free venue peek ×1',    icon: '👁' },
  { d: 8,   reward: 'Skip-the-line pass',     icon: '🚪' },
  { d: 13,  reward: 'AfterBefore+ 1 week',   icon: '💎' },
  { d: 52,  reward: 'Legend badge + bottle',  icon: '👑' },
];

function weeksFromDays(days: number) {
  return Math.max(1, Math.round(days / 7));
}

export const StreakHub = () => {
  const { streak, claimedToday, claimedDates, shieldAvailable, claim, isClaiming } = useStreak();
  const weekStart = getCurrentWeekStart();
  const today = new Date().toISOString().split('T')[0];

  const days = DAY_LABELS.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    return { label, iso, xp: DAY_XP[i], big: i === 5, done: claimedDates.has(iso), today: iso === today };
  });

  const weekCount = streak.current_streak >= 7 ? weeksFromDays(streak.current_streak) : null;

  return (
    <div className="px-4">
      {/* Big streak number */}
      <div className="text-center p-4 rounded-[22px] mb-3 border border-heat/40 bg-gradient-to-br from-heat/20 to-destructive/10">
        <div className="text-[44px] leading-none">🔥</div>
        <div className="text-3xl font-extrabold mt-1">{streak.current_streak} dana</div>
        {weekCount && (
          <div className="text-sm font-bold text-heat mt-0.5">≈ {weekCount} vikenda zaredom</div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          Čekiraj se danas za <strong className="text-accent">+25 XP</strong>
        </div>
      </div>

      {/* Weekend Shield badge */}
      <div
        className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3 border"
        style={{
          background: shieldAvailable
            ? 'linear-gradient(135deg, oklch(0.35 0.12 260 / 0.5), oklch(0.25 0.08 260 / 0.3))'
            : 'rgba(255,255,255,0.03)',
          borderColor: shieldAvailable ? 'oklch(0.55 0.18 260 / 0.6)' : 'hsl(var(--border))',
        }}
      >
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-xl flex-shrink-0"
          style={{
            background: shieldAvailable
              ? 'oklch(0.45 0.18 260 / 0.4)'
              : 'rgba(255,255,255,0.05)',
          }}
        >
          🛡
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold">Weekend Shield</div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            {shieldAvailable
              ? 'Jedan propušteni vikend ovog meseca neće kidati streak'
              : 'Shield iskorišćen ovog meseca · obnavlja se 1. u mesecu'}
          </div>
        </div>
        <div
          className="text-[10px] font-extrabold tracking-wide px-2 py-1 rounded-full flex-shrink-0"
          style={{
            background: shieldAvailable ? 'oklch(0.55 0.18 260 / 0.3)' : 'rgba(255,255,255,0.06)',
            color: shieldAvailable ? 'oklch(0.78 0.16 260)' : 'hsl(var(--muted-foreground))',
          }}
        >
          {shieldAvailable ? '1 dostupan' : 'iskorišćen'}
        </div>
      </div>

      {/* 7-day track */}
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Ova nedelja</div>
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
                ? 'hsl(var(--heat) / 0.14)'
                : 'rgba(255,255,255,0.04)',
              borderColor: d.today ? 'rgba(255,255,255,0.4)' : d.big ? 'hsl(var(--heat) / 0.5)' : 'hsl(var(--border))',
            }}
          >
            <div className={`text-[9px] font-semibold mb-1 ${d.done || d.today ? 'text-white' : 'text-muted-foreground'}`}>{d.label}</div>
            <div className={d.big ? 'text-xl' : 'text-base'}>{d.done ? '✓' : d.today ? '🎁' : d.big ? '🔥' : '🔒'}</div>
            <div className={`text-[9px] font-bold mt-0.5 ${d.done || d.today ? 'text-white' : d.big ? 'text-heat' : 'text-muted-foreground'}`}>+{d.xp}</div>
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
        {claimedToday ? '✓ Uzeto danas' : '🎁 Uzmi danas +25 XP'}
      </button>

      {/* Streak milestones (in weeks for nightlife framing) */}
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Vikend milestones</div>
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        {MILESTONES.map((m, i) => {
          const daysNeeded = m.d * 7;
          return (
            <div key={m.d} className={`flex items-center gap-3 px-3.5 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="w-9 h-9 rounded-[10px] bg-white/5 flex items-center justify-center text-lg">{m.icon}</div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{m.d} vikenda zaredom</div>
                <div className="text-[11px] text-muted-foreground">{m.reward}</div>
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold">
                {Math.min(streak.current_streak, daysNeeded)}/{daysNeeded}d
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
