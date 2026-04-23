import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Trophy, Clover, Star, ChevronRight, TrendingUp, Target, Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useXPActivity } from '@/hooks/useXPActivity';
import { calculateLevel, getXPProgress, LEVELS } from '@/services/gamification';
import { Progress } from '@/components/ui/progress';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { useQuests } from '@/hooks/useQuests';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const XP_GUIDE = [
  { action: 'Check-in at event', xp: 50, icon: '📍' },
  { action: "Signal 'I'm Going'", xp: 25, icon: '🔥' },
  { action: 'Match with someone', xp: 100, icon: '💜' },
  { action: 'Vibe signal', xp: 15, icon: '🎵' },
  { action: 'Review (stars only)', xp: 100, icon: '⭐' },
  { action: 'Review (with text)', xp: 200, icon: '✍️' },
  { action: 'Weekly streak bonus', xp: 200, icon: '🔥' },
];

const Gamification = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { transactions, weeklyXP, isLoading } = useXPActivity(10);
  const { completedCount, totalCount } = useQuests();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  const currentXP = profile?.xp ?? 0;
  const currentLevel = calculateLevel(currentXP);
  const xpProgress = getXPProgress(currentXP);
  const nextLevel = LEVELS.find((l) => l.level === currentLevel + 1);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Your XP Journey</h1>
            <p className="text-sm text-muted-foreground">Earn rewards, climb ranks</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Level Card */}
        <GlassCard className="p-6" hoverable={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
                {currentLevel}
              </div>
              <div>
                <h2 className="font-bold text-lg">Level {currentLevel}</h2>
                <p className="text-sm text-muted-foreground">{currentXP.toLocaleString()} XP total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">+{weeklyXP}</p>
              <p className="text-xs text-muted-foreground">This week</p>
            </div>
          </div>

          {/* Progress to next level */}
          {nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress to Level {currentLevel + 1}</span>
                <span className="font-medium">{xpProgress.current} / {xpProgress.required} XP</span>
              </div>
              <Progress value={xpProgress.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {xpProgress.required - xpProgress.current} XP to next level
              </p>
            </div>
          )}
        </GlassCard>

        {/* Weekly Quests */}
        {totalCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/quests')}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-bold text-sm">Weekly Quests</p>
                  <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} completed</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </motion.button>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/leaderboard')}
            className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
          >
            <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-center">Leaderboard</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/lucky100')}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30"
          >
            <Clover className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-center">Lucky 100</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/my-events')}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30"
          >
            <Star className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-center">My Events</p>
          </motion.button>
        </div>

        {/* Recent Activity */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Recent Activity
          </h3>
          
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tx.formattedReason.split(' ')[0]}</span>
                    <div>
                      <p className="font-medium">{tx.formattedReason.slice(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <span className="text-green-500 font-bold">+{tx.amount}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="p-6 text-center" hoverable={false}>
              <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No XP earned yet</p>
              <p className="text-sm text-muted-foreground">Check in to events to start earning!</p>
            </GlassCard>
          )}
        </section>

        {/* How to Earn XP */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            How to Earn XP
          </h3>
          <div className="space-y-2">
            {XP_GUIDE.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm">{item.action}</span>
                </div>
                <span className="text-primary font-bold">+{item.xp} XP</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Gamification;
