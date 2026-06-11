import { useSponsoredQuests } from '@/hooks/useQuestSystem';
import { Check } from 'lucide-react';

export const SponsoredStrip = () => {
  const { sponsored, accept, isAccepting } = useSponsoredQuests();
  if (!sponsored.length) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          ⭐ Sponsored · Real perks
        </span>
        <span className="text-[10px] text-text-faint">From partner venues</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
        {sponsored.map((s: any) => (
          <div
            key={s.id}
            className="min-w-[230px] max-w-[230px] flex-shrink-0 rounded-2xl overflow-hidden border"
            style={{
              background: `linear-gradient(140deg, oklch(0.32 0.16 ${s.hue} / 0.55), hsl(var(--card)) 70%)`,
              borderColor: `oklch(0.55 0.18 ${s.hue} / 0.4)`,
            }}
          >
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-base"
                  style={{ background: `linear-gradient(135deg, oklch(0.6 0.2 ${s.hue}), oklch(0.4 0.16 ${(s.hue + 30) % 360}))` }}
                >
                  {s.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{s.venue_name}</div>
                  <div className="text-[9px] text-text-faint">{s.spots_label}</div>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground font-extrabold tracking-wide">AD</span>
              </div>
              <div className="text-[13px] font-bold mb-0.5">{s.title}</div>
              <div className="text-[10px] text-muted-foreground mb-2.5">{s.description}</div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-white/5 mb-2.5">
                <span className="text-sm">🎁</span>
                <span className="flex-1 text-[11px] font-semibold">{s.reward_label}</span>
                <span className="text-[10px] font-bold text-accent">+{s.xp_reward}</span>
              </div>
              <button
                onClick={() => !s.accepted && accept(s.id)}
                disabled={s.accepted || isAccepting}
                className="w-full py-2 rounded-[10px] text-white text-xs font-bold disabled:opacity-80 flex items-center justify-center gap-1.5"
                style={{ background: s.accepted ? 'hsl(var(--success))' : `linear-gradient(135deg, oklch(0.6 0.2 ${s.hue}), oklch(0.5 0.2 ${(s.hue + 25) % 360}))` }}
              >
                {s.accepted ? (<><Check className="w-3.5 h-3.5" /> Accepted</>) : 'Accept quest'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
