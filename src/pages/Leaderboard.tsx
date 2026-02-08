import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Crown, Ticket, Star, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useLeaderboard, getCurrentWeekInfo } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
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

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const { leaderboard, userRank, isLoading } = useLeaderboard(period, 20);
  const { week, year } = getCurrentWeekInfo();

  const isUserInLeaderboard = leaderboard.some(entry => entry.user_id === user?.id);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500" />
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
            <Trophy className="w-12 h-12 text-yellow-200 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-white/80 text-sm">Week {week} of {year}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-2">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly" disabled>
              Yearly 🔒
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            {/* Weekly Prizes */}
            <div className="glass-card p-4 mb-4">
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

            {/* Leaderboard List */}
            <LeaderboardList
              entries={leaderboard}
              currentUserId={user?.id}
              userRank={userRank}
              isLoading={isLoading}
              isUserInLeaderboard={isUserInLeaderboard}
            />
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            {/* Monthly Prizes */}
            <div className="glass-card p-4 mb-4 border border-purple-500/30">
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
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Yearly leaderboard coming soon!</p>
              <p className="text-sm">Available after pilot period</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
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
              {/* Rank */}
              <div className="w-8 text-center">
                {isTop3 ? (
                  <span className="text-2xl">{MEDALS[index]}</span>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="w-10 h-10">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20">
                  {entry.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name & Progress */}
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

              {/* XP */}
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

      {/* Show user's rank if not in visible list */}
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
