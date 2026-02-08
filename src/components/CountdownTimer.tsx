import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = ({
  targetDate,
  className,
  showLabels = false,
  compact = false,
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  if (compact) {
    if (timeLeft.days > 0) {
      return (
        <span className={cn('font-mono font-bold', className)}>
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      );
    }
    if (timeLeft.hours > 0) {
      return (
        <span className={cn('font-mono font-bold', className)}>
          {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      );
    }
    return (
      <span className={cn('font-mono font-bold', className)}>
        {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold font-mono">{timeLeft.days}</span>
          {showLabels && <span className="text-xs text-muted-foreground">days</span>}
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className="text-xl font-bold font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
        {showLabels && <span className="text-xs text-muted-foreground">hrs</span>}
      </div>
      <span className="text-xl font-bold">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl font-bold font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
        {showLabels && <span className="text-xs text-muted-foreground">min</span>}
      </div>
      <span className="text-xl font-bold">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl font-bold font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
        {showLabels && <span className="text-xs text-muted-foreground">sec</span>}
      </div>
    </div>
  );
};

// Helper to get next Sunday at 23:59
export const getNextSunday = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999);
  
  return nextSunday;
};
