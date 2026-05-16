import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean | (() => void);
  right?: ReactNode;
  className?: string;
  /** Gradient title styling */
  gradient?: boolean;
}

/**
 * Shared sticky header used across Home, Explore, Event, Venue, Gamification, etc.
 * Gives the app a single recognizable top-bar with consistent blur, spacing and motion.
 */
export const AppHeader = ({ title, subtitle, back, right, className, gradient = true }: Props) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof back === 'function') back();
    else navigate(-1);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/85 backdrop-blur-xl',
        'border-b border-white/5',
        'px-4 py-3.5',
        className
      )}
    >
      {/* Subtle gradient underline for product cohesion */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <button
              onClick={handleBack}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1
              className={cn(
                'truncate text-lg font-black tracking-tight',
                gradient ? 'gradient-text' : 'text-foreground'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
};
