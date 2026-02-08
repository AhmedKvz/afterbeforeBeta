import { cn } from '@/lib/utils';

type HeatLevel = 'inferno' | 'hot' | 'warm' | 'cold';

interface HeatBadgeProps {
  level: HeatLevel;
  className?: string;
}

const getHeatConfig = (level: HeatLevel) => {
  switch (level) {
    case 'inferno':
      return {
        text: '🔥 Inferno',
        className: 'heat-inferno',
      };
    case 'hot':
      return {
        text: '🔥 Hot',
        className: 'heat-hot',
      };
    case 'warm':
      return {
        text: '🔥 Warm',
        className: 'heat-warm',
      };
    default:
      return {
        text: '❄️ Chill',
        className: 'bg-muted text-muted-foreground px-3 py-1 text-xs font-bold rounded-full',
      };
  }
};

export const getHeatLevel = (attendeeCount: number, capacity: number = 100): HeatLevel => {
  const ratio = attendeeCount / capacity;
  if (ratio >= 0.8) return 'inferno';
  if (ratio >= 0.5) return 'hot';
  if (ratio >= 0.25) return 'warm';
  return 'cold';
};

export const HeatBadge = ({ level, className }: HeatBadgeProps) => {
  const config = getHeatConfig(level);
  
  return (
    <span className={cn(config.className, className)}>
      {config.text}
    </span>
  );
};
