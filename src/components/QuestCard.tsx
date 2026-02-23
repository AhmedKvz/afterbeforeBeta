import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/GlassCard';
import { cn } from '@/lib/utils';

interface QuestCardProps {
  icon: string;
  title: string;
  description: string;
  progress: number;
  targetCount: number;
  xpReward: number;
  isCompleted: boolean;
  xpClaimed: boolean;
  onClaim: () => void;
  index: number;
}

export const QuestCard = ({
  icon,
  title,
  description,
  progress,
  targetCount,
  xpReward,
  isCompleted,
  xpClaimed,
  onClaim,
  index,
}: QuestCardProps) => {
  const percentage = Math.min(100, (progress / targetCount) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <GlassCard
        className={cn(
          'p-4',
          xpClaimed && 'opacity-50'
        )}
        hoverable={false}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-sm truncate">{title}</h4>
              <span className="text-xs font-bold text-primary flex-shrink-0 ml-2">
                +{xpReward} XP
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
            <div className="flex items-center gap-2">
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {progress}/{targetCount}
              </span>
            </div>
          </div>
          {isCompleted && !xpClaimed && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClaim}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold flex-shrink-0"
            >
              Claim
            </motion.button>
          )}
          {xpClaimed && (
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-success" />
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};
