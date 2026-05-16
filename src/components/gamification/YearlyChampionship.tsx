import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plane, Hotel, Utensils, Music, Sparkles, Trophy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';

const DESTINATIONS = [
  {
    key: 'buenos_aires',
    name: 'Buenos Aires',
    emoji: '🇦🇷',
    tagline: 'Underground techno & all-night milongas',
    gradient: 'from-sky-500/30 via-blue-500/20 to-indigo-500/10',
    accent: 'text-sky-300',
    border: 'border-sky-400/40',
  },
  {
    key: 'tokyo',
    name: 'Tokyo',
    emoji: '🇯🇵',
    tagline: 'Neon nights, Shibuya warehouses, sunrise ramen',
    gradient: 'from-pink-500/30 via-fuchsia-500/20 to-purple-500/10',
    accent: 'text-pink-300',
    border: 'border-pink-400/40',
  },
];

const PRIZES = [
  { icon: Plane, label: 'Round-trip flight' },
  { icon: Hotel, label: 'Hotel stay (paid)' },
  { icon: Utensils, label: 'Food & drinks covered' },
  { icon: Music, label: 'Club + after access' },
  { icon: Sparkles, label: 'Sponsor cash bonus' },
];

export const YearlyChampionship = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const year = new Date().getFullYear();

  const { data: votes = [] } = useQuery({
    queryKey: ['championship-votes', year],
    queryFn: async () => {
      const { data } = await supabase
        .from('championship_votes')
        .select('user_id, destination')
        .eq('year', year);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const myVote = votes.find((v) => v.user_id === user?.id)?.destination;
  const counts = DESTINATIONS.reduce<Record<string, number>>((acc, d) => {
    acc[d.key] = votes.filter((v) => v.destination === d.key).length;
    return acc;
  }, {});
  const total = votes.length || 1;

  const handleVote = async (destination: string) => {
    if (!user) {
      toast.error('Sign in to cast your vote');
      return;
    }
    const { error } = myVote
      ? await supabase
          .from('championship_votes')
          .update({ destination })
          .eq('user_id', user.id)
          .eq('year', year)
      : await supabase
          .from('championship_votes')
          .insert({ user_id: user.id, year, destination });

    if (error) {
      toast.error('Vote failed');
      return;
    }
    toast.success(`🌍 Vote locked: ${DESTINATIONS.find((d) => d.key === destination)?.name}`);
    qc.invalidateQueries({ queryKey: ['championship-votes', year] });
  };

  return (
    <motion.div {...fadeUp} className="space-y-4">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-primary/10 to-transparent p-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Yearly Championship · {year}
          </span>
        </div>
        <h3 className="mt-1 text-xl font-black tracking-tight">
          Top 3 ravers fly out together
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Vote where the year's top 3 on the global leaderboard get sent. All-expenses paid.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRIZES.map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2"
            >
              <p.icon className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="text-[11px] font-medium leading-tight">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vote cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DESTINATIONS.map((d) => {
          const count = counts[d.key] || 0;
          const pct = Math.round((count / total) * 100);
          const isMine = myVote === d.key;
          return (
            <button
              key={d.key}
              onClick={() => handleVote(d.key)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left transition',
                d.gradient,
                isMine ? d.border : 'border-white/10 hover:border-white/25'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-3xl">{d.emoji}</div>
                  <h4 className={cn('mt-1 text-lg font-black tracking-tight', d.accent)}>
                    {d.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">{d.tagline}</p>
                </div>
                {isMine && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/20 text-success">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{count} votes</span>
                  <span className="font-bold">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r',
                      d.key === 'buenos_aires'
                        ? 'from-sky-400 to-indigo-400'
                        : 'from-pink-400 to-fuchsia-400'
                    )}
                  />
                </div>
              </div>

              <span className="mt-3 inline-block text-[11px] font-bold uppercase tracking-wider text-foreground/80">
                {isMine ? 'Your pick — tap to change' : 'Tap to vote'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        One vote per rager. You can change it any time before Dec 31.
      </p>
    </motion.div>
  );
};
