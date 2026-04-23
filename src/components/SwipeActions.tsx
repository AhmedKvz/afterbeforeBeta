import { X, Star, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeActionsProps {
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  disabled?: boolean;
}

export const SwipeActions = ({ onPass, onSuperLike, onLike, disabled }: SwipeActionsProps) => {
  return (
    <div className="flex items-center justify-center gap-6">
      {/* Pass Button */}
      <button
        onClick={onPass}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          'bg-card border-2 border-destructive/50 text-destructive',
          'transition-all hover:scale-110 hover:border-destructive',
          'disabled:opacity-50 disabled:hover:scale-100'
        )}
      >
        <X className="w-8 h-8" />
      </button>
      
      {/* SuperLike Button */}
      <button
        onClick={onSuperLike}
        disabled={disabled}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'bg-accent text-accent-foreground',
          'transition-all hover:scale-110',
          'disabled:opacity-50 disabled:hover:scale-100'
        )}
      >
        <Star className="w-6 h-6" />
      </button>
      
      {/* Like Button */}
      <button
        onClick={onLike}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          'btn-gradient',
          'transition-all hover:scale-110',
          'disabled:opacity-50 disabled:hover:scale-100'
        )}
      >
        <Heart className="w-8 h-8 fill-white" />
      </button>
    </div>
  );
};
