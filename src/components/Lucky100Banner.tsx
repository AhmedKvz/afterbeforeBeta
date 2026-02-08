import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clover, ChevronRight, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLucky100, getNextDrawTime } from '@/hooks/useLucky100';
import { AvatarStack } from './AvatarStack';
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

// Countdown hook
const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

export const Lucky100Banner = ({ onClick }: Lucky100BannerProps) => {
  const navigate = useNavigate();
  const { 
    isEntered, 
    hasWonThisWeek,
    weeklyEntryCount, 
    recentEntries,
    nextDrawTime,
    enter,
    isEntering,
    isLoading 
  } = useLucky100();

  const countdown = useCountdown(nextDrawTime);

  const handleEnterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEntered && !isEntering) {
      enter();
    }
  };

  const handleBrowseEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/');
  };

  // Get avatars from recent entries
  const recentAvatars = recentEntries
    .filter(entry => entry.avatar_url)
    .map(entry => entry.avatar_url!)
    .slice(0, 3);

  // Format countdown
  const formatCountdown = () => {
    if (countdown.days > 0) {
      return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`;
    }
    if (countdown.hours > 0) {
      return `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
    }
    return `${countdown.minutes}m ${countdown.seconds}s`;
  };

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
      <AnimatedSparkle delay={0.8} x="5%" y="50%" />
      <AnimatedSparkle delay={1.2} x="40%" y="85%" />

      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent" />

      {/* Content */}
      <div className="relative p-4 z-10">
        <div className="flex items-start justify-between">
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
              <p className="text-white/90 text-xs font-medium">THIS WEEK'S DRAW</p>
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </div>

        {/* Social Proof Section */}
        <div className="mt-3 flex items-center gap-3">
          {recentAvatars.length > 0 && (
            <AvatarStack 
              avatars={recentAvatars} 
              max={3} 
              total={weeklyEntryCount}
              size="sm"
            />
          )}
          <div className="flex-1">
            <p className="text-white font-semibold text-sm drop-shadow">
              {weeklyEntryCount} people entered
            </p>
            <p className="text-white/80 text-xs flex items-center gap-1">
              <span>Draw in:</span>
              <motion.span 
                key={countdown.seconds}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="font-mono font-bold text-yellow-200"
              >
                {formatCountdown()}
              </motion.span>
            </p>
          </div>
        </div>

        {/* Action Section */}
        <div className="mt-4 flex items-center justify-between">
          {hasWonThisWeek ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/30 border border-yellow-300/50"
            >
              <Sparkles className="w-4 h-4 text-yellow-200" />
              <span className="text-yellow-100 font-bold text-sm drop-shadow">WINNER! 🎉</span>
            </motion.div>
          ) : isEntered ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/20 border border-white/40 backdrop-blur-sm"
            >
              <Check className="w-4 h-4 text-green-300" />
              <span className="text-white font-bold text-sm">YOU'RE IN! ✓</span>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {/* Empty state message */}
              <p className="text-white/90 text-xs">
                You're not in the draw yet! Check-in or plan an event to enter.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleEnterClick}
                  disabled={isEntering || isLoading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full",
                    "bg-white text-purple-600 font-bold text-sm",
                    "hover:bg-white/90 transition-all",
                    "disabled:opacity-50 shadow-lg"
                  )}
                  animate={{ 
                    boxShadow: [
                      '0 0 0 0 rgba(255,255,255,0.6)',
                      '0 0 20px 4px rgba(255,255,255,0.3)',
                      '0 0 0 0 rgba(255,255,255,0.6)',
                    ]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isEntering ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      🍀
                    </motion.span>
                  ) : (
                    <>
                      ENTER NOW
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
                <button
                  onClick={handleBrowseEvents}
                  className="px-4 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
                >
                  Browse Events →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
