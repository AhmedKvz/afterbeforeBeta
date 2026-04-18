import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight } from 'lucide-react';
import { useChallenges } from '@/hooks/useChallenges';
import { formatEUR } from '@/lib/format';

export const LiveChallengesCarousel = () => {
  const navigate = useNavigate();
  const { data: challenges = [], isLoading } = useChallenges('live');

  if (isLoading || challenges.length === 0) return null;

  const top = challenges.slice(0, 3);

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-lg">Živi izazovi</h2>
        </div>
        <button
          onClick={() => navigate('/challenges')}
          className="text-xs text-primary font-bold flex items-center gap-1"
        >
          Svi <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {top.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/challenges/${c.id}`)}
            className="min-w-[220px] max-w-[220px] flex-shrink-0 rounded-2xl bg-muted/30 backdrop-blur-xl border border-amber-500/20 overflow-hidden text-left"
          >
            <div
              className="relative h-24 bg-gradient-to-br from-amber-500/30 to-pink-500/20"
              style={
                c.sponsor_color
                  ? { background: `linear-gradient(135deg, ${c.sponsor_color}55, hsl(var(--primary) / 0.2))` }
                  : undefined
              }
            >
              {c.cover_url && (
                <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/80 text-[10px] font-bold text-white">
                LIVE
              </div>
              {c.prize_pool_cents > 0 && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-bold text-amber-300 backdrop-blur">
                  🏆 {formatEUR(c.prize_pool_cents)}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm truncate">{c.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {c.entry_count || 0} prijava
                {c.sponsor_name ? ` · by ${c.sponsor_name}` : ''}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
