import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Crown, Ticket, Star, Gift, Zap, Target, HelpCircle, Flame } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLeaderboard, getCurrentWeekInfo } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { WeeklyWinnersButton } from '@/components/WeeklyWinnersButton';
import { CountdownTimer, getNextSunday } from '@/components/CountdownTimer';
import { VenueHeatBoard } from '@/components/VenueHeatBoard';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

const WEEKLY_PRIZES = [
  { rank: 1, prize: 'Free VIP ticket', icon: Ticket },
  { rank: 2, prize: 'Free entry', icon: Gift },
  { rank: 3, prize: 'Free drink', icon: Star },
];

const MONTHLY_PRIZES = [
  { rank: 1, prize: 'Weekend trip', description: 'All-expenses paid' },
  { rank: 2, prize: 'VIP table', description: 'At any event' },
  { rank: 3, prize: 'DJ Meet & Greet', description: 'Exclusive access' },
];

const XP_GUIDE = [
  { action: 'Check-in at event', xp: 50, icon: '📍' },
  { action: "Signal 'I'm Going'", xp: 25, icon: '🔥' },
  { action: 'Match with someone', xp: 100, icon: '💜' },
  { action: 'Review (stars only)', xp: 100, icon: '⭐' },
  { action: 'Review (with text)', xp: 200, icon: '✍️' },
  { action: 'Weekly streak bonus', xp: 200, icon: '🔥' },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<'ravers' | 'clubs'>(
    searchParams.get('mode') === 'clubs' ? 'clubs' : 'ravers'
  );
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const { leaderboard, userRank, isLoading } = useLeaderboard(period, 20);
  const { week, year } = getCurrentWeekInfo();

  const isUserInLeaderboard = leaderboard.some(entry => entry.user_id === user?.id);
  const top3MinXP = leaderboard.length >= 3 ? leaderboard[2].total_xp : 0;
  const xpToTop3 = userRank ? Math.max(0, top3MinXP - userRank.total_xp + 1) : top3MinXP;
  const isInTop3 = userRank ? userRank.rank <= 3 : false;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className={cn(
          "absolute inset-0",
          mode === 'clubs'
            ? 'bg-gradient-to-br from-orange-500 via-red-500 to-amber-500'
            : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
        )} />
        <div className="absolute inset-0 bg-black/20" />
        
        <div className="relative p-4 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="text-center pb-4">
            {mode === 'clubs' ? (
              <Flame className="w-12 h-12 text-yellow-200 mx-auto mb-2" />
            ) : (
              <Trophy className="w-12 h-12 text-yellow-200 mx-auto mb-2" />
            )}
            <h1 className="text-2xl font-bold text-white">
              {mode === 'clubs' ? 'Club Heat' : 'Leaderboard'}
            </h1>
            <p className="text-white/80 text-sm">Week {week} of {year}</p>
            
            <div className="mt-3 flex items-center justify-center gap-2 text-white/90 text-sm">
              <span>Resets in:</span>
              <CountdownTimer targetDate={getNextSunday()} compact className="text-yellow-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 -mt-3 mb-4">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
          <button
            onClick={() => setMode('ravers')}
            className={cn(
              'py-2.5 rounded-lg text-sm font-medium transition-all',
              mode === 'ravers'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🎶 Ravers
          </button>
          <button
            onClick={() => setMode('clubs')}
            className={cn(
              'py-2.5 rounded-lg text-sm font-medium transition-all',
              mode === 'clubs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🏢 Clubs
          </button>
        </div>
      </div>

      {mode === 'clubs' ? (
        <div className="px-4">
          <VenueHeatBoard />
        </div>
      ) : (
        <>
          {/* XP to Top 3 Motivation */}
          {userRank && !isInTop3 && xpToTop3 > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">You're #{userRank.rank}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-purple-400">{xpToTop3} XP</span> to reach Top 3!
                  </p>
                </div>
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="px-4">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly" disabled>
                  Yearly 🔒
                </TabsTrigger>
              </TabsList>

              <TabsContent value="weekly" className="mt-4 space-y-4">
                <div className="glass-card p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    This Week's Prizes
                  </h3>
                  <div className="space-y-2">
                    {WEEKLY_PRIZES.map((prize) => (
                      <div key={prize.rank} className="flex items-center gap-3">
                        <span className="text-xl">{MEDALS[prize.rank - 1]}</span>
                        <prize.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{prize.prize}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="xp-guide" className="border rounded-xl bg-muted/30 px-4">
                    <AccordionTrigger className="text-sm font-medium py-3">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        How to Earn XP
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <div className="space-y-2">
                        {XP_GUIDE.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span>{item.icon}</span>
                              <span className="text-muted-foreground">{item.action}</span>
                            </div>
                            <span className="font-bold text-primary">+{item.xp}</span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <LeaderboardList
                  entries={leaderboard}
                  currentUserId={user?.id}
                  userRank={userRank}
                  isLoading={isLoading}
                  isUserInLeaderboard={isUserInLeaderboard}
                />
              </TabsContent>

              <TabsContent value="monthly" className="mt-4 space-y-4">
                <div className="glass-card p-4 border border-purple-500/30">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-purple-500" />
                    Monthly Grand Prizes
                  </h3>
                  <div className="space-y-3">
                    {MONTHLY_PRIZES.map((prize, i) => (
                      <div key={prize.rank} className="flex items-start gap-3">
                        <span className="text-xl">{MEDALS[i]}</span>
                        <div>
                          <span className="font-medium">{prize.prize}</span>
                          <p className="text-xs text-muted-foreground">{prize.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <LeaderboardList
                  entries={leaderboard}
                  currentUserId={user?.id}
                  userRank={userRank}
                  isLoading={isLoading}
                  isUserInLeaderboard={isUserInLeaderboard}
                />
              </TabsContent>

              <TabsContent value="yearly" className="mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 border border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 cursor-pointer"
                  onClick={() => navigate('/yearly-championship')}
                >
                  <div className="text-center">
                    <Crown className="w-10 h-10 text-accent mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-foreground">Yearly Championship</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      The highest honor in the AfterBefore ecosystem
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-2 italic">
                      Trip for 2 · Accommodation · Event tickets · Pocket money
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                      <Globe className="w-3 h-3" />
                      Vote Destinations & View Rules →
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      <BottomNav />
      <WeeklyWinnersButton />
    </div>
  );
};

interface LeaderboardListProps {
  entries: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    total_xp: number;
    rank: number;
  }>;
  currentUserId?: string;
  userRank: { rank: number; total_xp: number } | null;
  isLoading: boolean;
  isUserInLeaderboard: boolean;
}

const LeaderboardList = ({
  entries,
  currentUserId,
  userRank,
  isLoading,
  isUserInLeaderboard,
}: LeaderboardListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-12 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No entries yet this period</p>
        <p className="text-sm">Check in to events to start earning XP!</p>
      </div>
    );
  }

  const maxXP = entries[0]?.total_xp || 1;

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const isTop3 = index < 3;

        return (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'glass-card p-4',
              isCurrentUser && 'border-2 border-primary',
              isTop3 && 'bg-gradient-to-r from-amber-500/10 to-orange-500/10'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center">
                {isTop3 ? (
                  <span className="text-2xl">{MEDALS[index]}</span>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    #{entry.rank}
                  </span>
                )}
              </div>

              <Avatar className="w-10 h-10">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20">
                  {entry.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {entry.display_name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-primary">(You)</span>
                  )}
                </div>
                <Progress
                  value={(entry.total_xp / maxXP) * 100}
                  className="h-1.5 mt-1"
                />
              </div>

              <div className="text-right">
                <span className="font-bold text-lg">
                  {entry.total_xp.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">XP</span>
              </div>
            </div>
          </motion.div>
        );
      })}

      {!isUserInLeaderboard && userRank && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-4 border border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 text-center">
              <span className="text-lg font-bold text-muted-foreground">
                #{userRank.rank}
              </span>
            </div>
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/20">You</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <span className="font-medium">Your Position</span>
              <p className="text-xs text-muted-foreground">
                {userRank.rank <= 10 ? 'Almost there!' : 'Keep climbing!'}
              </p>
            </div>
            <div className="text-right">
              <span className="font-bold text-lg">
                {userRank.total_xp.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground ml-1">XP</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Leaderboard;
