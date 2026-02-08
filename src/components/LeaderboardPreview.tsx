import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { CountdownTimer, getNextSunday } from '@/components/CountdownTimer';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

export const LeaderboardPreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { leaderboard, userRank, isLoading } = useLeaderboard('weekly', 3);

  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  const isUserInTop3 = leaderboard.some(entry => entry.user_id === user?.id);
  const top3MinXP = leaderboard.length >= 3 ? leaderboard[2].total_xp : 0;
  const xpToTop3 = userRank ? Math.max(0, top3MinXP - userRank.total_xp + 1) : top3MinXP;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      onClick={() => navigate('/leaderboard')}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-90" />
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-200" />
            <h3 className="font-bold text-white">WEEKLY LEADERBOARD</h3>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </div>

        {/* Countdown & Subtitle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/80 text-sm">
            🎟️ Top 3 win free tickets!
          </p>
          <div className="flex items-center gap-1 text-xs text-white/70">
            <span>Resets:</span>
            <CountdownTimer targetDate={getNextSunday()} compact className="text-yellow-200" />
          </div>
        </div>

        {/* Top 3 */}
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg",
                entry.user_id === user?.id 
                  ? "bg-white/30 border border-white/40" 
                  : "bg-white/10"
              )}
            >
              <span className="text-xl">{MEDALS[index]}</span>
              <Avatar className="w-8 h-8">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {entry.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-white font-medium truncate">
                {entry.display_name}
                {entry.user_id === user?.id && (
                  <span className="text-yellow-200 ml-1">(You)</span>
                )}
              </span>
              <span className="text-white/90 font-bold">
                {entry.total_xp.toLocaleString()} XP
              </span>
            </motion.div>
          ))}
        </div>

        {/* Current user rank if not in top 3 */}
        {!isUserInTop3 && userRank && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-white/80 text-sm mb-2">
              <span>Your rank: #{userRank.rank}</span>
              <span>{userRank.total_xp.toLocaleString()} XP</span>
            </div>
            {xpToTop3 > 0 && (
              <div className="flex items-center gap-2 text-yellow-200 text-xs">
                <Zap className="w-3 h-3" />
                <span>Need {xpToTop3} XP to reach Top 3!</span>
              </div>
            )}
          </div>
        )}

        {leaderboard.length === 0 && (
          <div className="text-center py-4 text-white/70">
            <p>No XP earned yet this week</p>
            <p className="text-sm">Check in to events to climb the ranks!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
