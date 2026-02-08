import { motion } from 'framer-motion';
import { Clover, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLucky100Counter } from '@/hooks/useLucky100Counter';
import { useLucky100Winners } from '@/hooks/useLucky100Winners';
import { AvatarStack } from './AvatarStack';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Lucky100BannerProps {
  onClick: () => void;
}

// Animated sparkle component
const AnimatedSparkle = ({ delay, x, y }: { delay: number; x: string; y: string }) => (
  <motion.div
    className="absolute text-lg pointer-events-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 1, 1, 0],
      scale: [0.5, 1.2, 1, 0.5],
      rotate: [0, 15, -15, 0],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      delay,
      ease: "easeInOut",
    }}
  >
    ✨
  </motion.div>
);

export const Lucky100Banner = ({ onClick }: Lucky100BannerProps) => {
  const navigate = useNavigate();
  const { stats, recentWinners, luckyInterval } = useLucky100Counter();
  const { hasUnclaimedPrize } = useLucky100Winners();

  // Get avatars from recent winners
  const recentAvatars = recentWinners
    .filter(winner => winner.avatar_url)
    .map(winner => winner.avatar_url!)
    .slice(0, 3);

  // Calculate progress to next winner
  const progressToNext = ((luckyInterval - stats.checkInsToNext) / luckyInterval) * 100;

  // Last winner info
  const lastWinner = recentWinners[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer group shadow-lg shadow-purple-500/30"
    >
      {/* Gradient Background - Purple to Pink to Orange */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400" />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-white/5" />
      
      {/* Animated sparkles */}
      <AnimatedSparkle delay={0} x="10%" y="20%" />
      <AnimatedSparkle delay={0.5} x="85%" y="15%" />
      <AnimatedSparkle delay={1} x="25%" y="70%" />
      <AnimatedSparkle delay={1.5} x="70%" y="65%" />
      <AnimatedSparkle delay={2} x="50%" y="10%" />
      <AnimatedSparkle delay={0.3} x="90%" y="75%" />

      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent" />

      {/* Content */}
      <div className="relative p-4 z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Clover className="w-6 h-6 text-green-300 drop-shadow-lg" />
            </motion.div>
            <div>
              <h3 className="font-bold text-lg text-white drop-shadow-md">LUCKY 100</h3>
              <p className="text-white/90 text-xs font-medium">INSTANT WIN RAFFLE</p>
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </div>

        {/* Progress Bar Section */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/80 mb-1">
            <span>Next winner: #{stats.nextLuckyNumber}</span>
            <span className="font-bold text-green-300">{stats.checkInsToNext} check-ins away!</span>
          </div>
          <Progress value={progressToNext} className="h-2 bg-white/20" />
        </div>

        {/* Social Proof Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {recentAvatars.length > 0 && (
              <AvatarStack 
                avatars={recentAvatars} 
                max={3} 
                total={stats.globalCount}
                size="sm"
              />
            )}
            <div>
              <p className="text-white font-semibold text-sm drop-shadow">
                {stats.globalCount} check-ins
              </p>
              {lastWinner && (
                <p className="text-white/80 text-xs">
                  Last winner: {lastWinner.display_name}
                </p>
              )}
            </div>
          </div>

          {/* Winner badge */}
          {hasUnclaimedPrize && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/30 border border-yellow-300/50"
            >
              <Sparkles className="w-3 h-3 text-yellow-200" />
              <span className="text-yellow-100 font-bold text-xs">YOU WON!</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
