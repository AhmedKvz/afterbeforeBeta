import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const GlassCard = ({ children, className, hoverable = true, onClick }: GlassCardProps) => {
  return (
    <div
      className={cn(
        'glass-card p-6',
        hoverable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
