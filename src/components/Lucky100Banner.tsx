import { motion } from 'framer-motion';
import { Clover, ChevronRight, Check, Sparkles } from 'lucide-react';
import { useLucky100 } from '@/hooks/useLucky100';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Lucky100BannerProps {
  onClick: () => void;
}

export const Lucky100Banner = ({ onClick }: Lucky100BannerProps) => {
  const { 
    isEntered, 
    hasWonThisWeek,
    weeklyEntryCount, 
    nextDrawTime,
    enter,
    isEntering,
    isLoading 
  } = useLucky100();

  const handleEnterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEntered && !isEntering) {
      enter();
    }
  };

  const drawTimeFormatted = format(nextDrawTime, "EEEE HH:mm");

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-90" />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/10" />
      
      {/* Animated sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%',
              opacity: 0.3 
            }}
            animate={{ 
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative p-4 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Clover className="w-6 h-6 text-success" />
            </motion.div>
            <div>
              <h3 className="font-bold text-lg text-white">LUCKY 100</h3>
              <p className="text-white/80 text-xs">THIS WEEK</p>
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-white/90 text-sm">
              <span className="font-bold text-white">{weeklyEntryCount}</span> people entered
            </p>
            <p className="text-white/70 text-xs">
              Draw: {drawTimeFormatted}
            </p>
          </div>

          {hasWonThisWeek ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 border border-success/40"
            >
              <Sparkles className="w-4 h-4 text-success" />
              <span className="text-success font-bold text-sm">WINNER!</span>
            </motion.div>
          ) : isEntered ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/40"
            >
              <Check className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">YOU'RE IN!</span>
            </motion.div>
          ) : (
            <motion.button
              onClick={handleEnterClick}
              disabled={isEntering || isLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-white text-primary font-bold text-sm",
                "hover:bg-white/90 transition-colors",
                "disabled:opacity-50"
              )}
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(255,255,255,0.4)',
                  '0 0 0 8px rgba(255,255,255,0)',
                ]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
              }}
            >
              {isEntering ? (
                'Entering...'
              ) : (
                <>
                  ENTER NOW
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
