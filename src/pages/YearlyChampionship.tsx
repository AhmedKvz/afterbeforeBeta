import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Plane, Crown, Shield, Star, Users, Award, Vote, Sparkles, Trophy, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useChampionshipVotes } from '@/hooks/useChampionshipVotes';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const DESTINATIONS = [
  {
    name: 'Tokyo',
    vibe: 'Future Night Energy',
    emoji: '🇯🇵',
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    accent: 'hsl(330, 81%, 60%)',
    description: 'Neon-lit underground, warehouse raves, and the most futuristic nightlife on earth.',
  },
  {
    name: 'Berlin',
    vibe: 'Underground Capital',
    emoji: '🇩🇪',
    gradient: 'from-slate-600 via-zinc-700 to-neutral-800',
    accent: 'hsl(0, 0%, 63%)',
    description: 'Berghain. Tresor. The birthplace of modern club culture.',
  },
  {
    name: 'Mexico',
    vibe: 'Heat, Rhythm, Escape',
    emoji: '🇲🇽',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    accent: 'hsl(38, 92%, 50%)',
    description: 'Day clubs, cenote parties, and ancient rhythm meets modern bass.',
  },
];

const SCORING_PILLARS = [
  { name: 'XP', weight: '30%', icon: Sparkles, description: 'Total experience points earned throughout the year' },
  { name: 'Trust Score', weight: '25%', icon: Shield, description: 'Safety contributions, positive reviews, verified presence' },
  { name: 'Quest Diversity', weight: '15%', icon: Star, description: 'Variety of quests completed across different categories' },
  { name: 'Community', weight: '15%', icon: Users, description: 'Matches made, signals sent, events attended with others' },
  { name: 'Community Vote', weight: '10%', icon: Vote, description: 'Peer recognition from the scene' },
  { name: 'Jury Score', weight: '5%', icon: Crown, description: 'Partner venues and curators assessment' },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const YearlyChampionship = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { voteCounts, userVote, totalVotes, vote, isVoting } = useChampionshipVotes();
  const currentYear = new Date().getFullYear();

  const maxVotes = Math.max(...Object.values(voteCounts), 1);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ─── HERO ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background to-background" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-1/4 w-64 h-64 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute top-20 right-1/4 w-48 h-48 rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative px-4 pt-6 pb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          <motion.div {...fadeUp} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <Crown className="w-3 h-3" />
              Season {currentYear}
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              Yearly Championship
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              The highest honor in the AfterBefore ecosystem.
            </p>
            <p className="text-muted-foreground/70 text-xs mt-3 max-w-sm mx-auto italic">
              Compete all year. Build reputation. Earn your place in the global scene.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* ─── DESTINATION VOTING ─── */}
        <motion.section {...fadeUp} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Vote for the Annual Destinations</h2>
          </div>
          <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
            The community chooses the 3 dream destinations. These become the official grand prize for this year's champion.
          </p>

          <div className="space-y-3">
            {DESTINATIONS.map((dest, i) => {
              const votes = voteCounts[dest.name] || 0;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isSelected = userVote === dest.name;

              return (
                <motion.div
                  key={dest.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1 }}
                  className={cn(
                    'relative overflow-hidden rounded-xl border transition-all',
                    isSelected
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border/50 bg-card/50'
                  )}
                >
                  {/* Background gradient bar */}
                  <div
                    className={cn('absolute inset-y-0 left-0 opacity-10 bg-gradient-to-r', dest.gradient)}
                    style={{ width: `${Math.max(percentage, 5)}%`, transition: 'width 0.6s ease' }}
                  />

                  <div className="relative p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{dest.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">{dest.name}</h3>
                          <span className="text-xs text-muted-foreground italic">{dest.vibe}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed">{dest.description}</p>

                        {/* Vote bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div
                              className={cn('h-full rounded-full bg-gradient-to-r', dest.gradient)}
                              initial={{ width: 0 }}
                              animate={{ width: `${(votes / maxVotes) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium min-w-[3rem] text-right">
                            {votes} vote{votes !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => vote(dest.name)}
                        disabled={isVoting || !user}
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                        )}
                      >
                        {isSelected ? '✓ Voted' : 'Vote'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {totalVotes > 0 && (
            <p className="text-center text-xs text-muted-foreground/60 mt-2">
              {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast
            </p>
          )}
        </motion.section>

        {/* ─── OFFICIAL DESTINATIONS ─── */}
        <motion.section {...fadeUp} transition={{ delay: 0.2 }}>
          <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-foreground">Official Championship Destinations</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              The scene has spoken. These destinations define this year's final prize.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DESTINATIONS.map((dest, i) => (
                <motion.div
                  key={dest.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={cn(
                    'rounded-lg p-3 text-center bg-gradient-to-br border border-white/5',
                    dest.gradient,
                    'bg-opacity-20'
                  )}
                  style={{ background: `linear-gradient(135deg, ${dest.accent}15, ${dest.accent}05)` }}
                >
                  <span className="text-xl">{dest.emoji}</span>
                  <p className="text-xs font-bold text-foreground mt-1">{dest.name}</p>
                  <p className="text-[10px] text-muted-foreground italic">{dest.vibe}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ─── LEGENDARY REWARD ─── */}
        <motion.section {...fadeUp} transition={{ delay: 0.3 }}>
          <div className="relative overflow-hidden rounded-xl border border-accent/30">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-primary/5 to-secondary/5" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl" />

            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Award className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Legendary Annual Reward</h2>
                  <p className="text-[10px] text-muted-foreground">The #1 scene champion wins an international nightlife journey</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '✈️', label: 'Trip for 2', sub: 'Winner + plus one' },
                  { icon: '🏨', label: 'Accommodation', sub: 'Fully covered' },
                  { icon: '🎫', label: 'Event Tickets', sub: 'Festival or club night' },
                  { icon: '💰', label: 'Pocket Money', sub: 'Spending allowance' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="rounded-lg bg-card/60 border border-border/30 p-3"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-xs font-bold text-foreground mt-1">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground/70 italic text-center mt-3">
                The annual champion does not just win points. They win the night beyond the city.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ─── SCORING ─── */}
        <motion.section {...fadeUp} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">How the Champion Is Chosen</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            The yearly title reflects who truly shaped the scene — not just who tapped the most.
          </p>

          <div className="space-y-2">
            {SCORING_PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <pillar.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{pillar.name}</span>
                    <span className="text-xs font-bold text-primary">{pillar.weight}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{pillar.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/60 italic text-center mt-3">
            The goal is to reward the most complete scene participant, not the highest activity volume.
          </p>
        </motion.section>

        {/* ─── VALUES ─── */}
        <motion.section {...fadeUp} transition={{ delay: 0.5 }}>
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">What This Reward Means</h2>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>This is not just a trip.</p>
              <p>This is a global scene exchange. A symbol of trust, consistency, presence, and contribution.</p>
              <p className="text-foreground/80 font-medium italic">
                Your reputation can take you beyond your city.
              </p>
              <p className="text-muted-foreground/60">From Belgrade to the world.</p>
            </div>
          </div>
        </motion.section>

        {/* ─── HALL OF FAME ─── */}
        <motion.section {...fadeUp} transition={{ delay: 0.6 }}>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-accent" />
            <h2 className="text-lg font-bold text-foreground">Future Hall of Fame</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Each yearly champion becomes part of AfterBefore history.
          </p>

          <div className="rounded-xl border border-dashed border-accent/30 bg-accent/5 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-dashed border-accent/30 flex items-center justify-center mx-auto mb-3">
              <Crown className="w-7 h-7 text-accent/40" />
            </div>
            <p className="text-sm font-bold text-foreground/60">Season {currentYear} Champion</p>
            <p className="text-xs text-muted-foreground mt-1">To be crowned</p>

            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50">
              <span>🏆 Champion Badge</span>
              <span>•</span>
              <span>🌍 Destination Won</span>
              <span>•</span>
              <span>📅 {currentYear}</span>
            </div>

            <p className="text-[10px] text-muted-foreground/40 italic mt-4">
              Not everyone enters the hall of fame.
            </p>
          </div>
        </motion.section>

        {/* ─── CLOSING LINE ─── */}
        <motion.div {...fadeUp} transition={{ delay: 0.7 }} className="text-center py-4">
          <p className="text-xs text-muted-foreground/50 italic">
            This is the highest yearly honor in the ecosystem.
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default YearlyChampionship;
