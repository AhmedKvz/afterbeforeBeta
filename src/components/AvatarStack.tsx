import { cn } from '@/lib/utils';
import { avatarGradient, hueFromString } from '@/lib/gradients';

const isReal = (src?: string | null) => !!src && !src.includes('placeholder');

interface AvatarStackProps {
  avatars: string[];
  max?: number;
  total?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const overflowSizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export const AvatarStack = ({ 
  avatars, 
  max = 3, 
  total,
  size = 'md',
  className 
}: AvatarStackProps) => {
  const displayAvatars = avatars.slice(0, max);
  const remaining = total ? total - max : avatars.length - max;
  
  return (
    <div className={cn('avatar-stack', className)}>
      {displayAvatars.map((avatar, index) =>
        isReal(avatar) ? (
          <img
            key={index}
            src={avatar}
            alt={`User ${index + 1}`}
            className={cn(
              sizeClasses[size],
              'rounded-full border-2 border-background object-cover'
            )}
          />
        ) : (
          // prototype-style hued gradient bubble when no real photo
          <div
            key={index}
            aria-label={`User ${index + 1}`}
            className={cn(
              sizeClasses[size],
              'rounded-full border-2 border-background'
            )}
            style={{ background: avatarGradient(hueFromString(`${avatar}-${index}`)) }}
          />
        )
      )}
      {remaining > 0 && (
        <div
          className={cn(
            overflowSizeClasses[size],
            'rounded-full bg-muted border-2 border-background flex items-center justify-center font-medium text-muted-foreground'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
