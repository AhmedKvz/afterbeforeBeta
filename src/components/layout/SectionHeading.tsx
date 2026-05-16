import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  label: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent section heading used across Home, Venue, Event, Gamification.
 * All-caps muted label + optional accent icon + optional right-aligned action.
 */
export const SectionHeading = ({ label, icon, action, className }: Props) => (
  <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
    <div className="flex items-center gap-2">
      {icon && <span className="text-primary">{icon}</span>}
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </h2>
    </div>
    {action && <div className="text-xs">{action}</div>}
  </div>
);
