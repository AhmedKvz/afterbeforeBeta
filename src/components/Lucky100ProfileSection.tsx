import { Clover, Check, Trophy } from 'lucide-react';
import { useLucky100 } from '@/hooks/useLucky100';
import { GlassCard } from './GlassCard';

interface Lucky100ProfileSectionProps {
  onOpenModal?: () => void;
}

export const Lucky100ProfileSection = ({ onOpenModal }: Lucky100ProfileSectionProps) => {
  const { isEntered, monthlyEntries, totalWins, isLoading } = useLucky100();

  if (isLoading) {
    return (
      <GlassCard className="p-4 animate-pulse" hoverable={false}>
        <div className="h-20 bg-muted rounded" />
      </GlassCard>
    );
  }

  return (
    <GlassCard 
      className="p-4 cursor-pointer" 
      hoverable={true}
      onClick={onOpenModal}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Clover className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold">Lucky 100</h3>
          <p className="text-xs text-muted-foreground">Weekly Raffle</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-lg font-bold">
            {isEntered ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span className="text-success">In</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">This Week</div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary">{monthlyEntries}</div>
          <div className="text-xs text-muted-foreground">This Month</div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-lg font-bold text-accent">
            <Trophy className="w-4 h-4" />
            {totalWins}
          </div>
          <div className="text-xs text-muted-foreground">Total Wins</div>
        </div>
      </div>
    </GlassCard>
  );
};
