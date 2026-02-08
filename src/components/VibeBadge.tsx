import { cn } from '@/lib/utils';

interface VibeBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const getVibeInfo = (rating: number) => {
  if (rating >= 4.8) {
    return { emoji: '🔥', text: 'LEGENDARY VIBE', color: 'from-red-500 to-orange-500' };
  }
  if (rating >= 4.5) {
    return { emoji: '✨', text: 'GREAT ENERGY', color: 'from-purple-500 to-pink-500' };
  }
  if (rating >= 4.0) {
    return { emoji: '🎵', text: 'GOOD VIBES', color: 'from-blue-500 to-cyan-500' };
  }
  if (rating >= 3.0) {
    return { emoji: '👍', text: 'DECENT', color: 'from-green-500 to-emerald-500' };
  }
  return { emoji: '🎭', text: 'NEW', color: 'from-gray-500 to-gray-600' };
};

export const VibeBadge = ({ rating, size = 'md', className }: VibeBadgeProps) => {
  const { emoji, text, color } = getVibeInfo(rating);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold text-white',
        `bg-gradient-to-r ${color}`,
        sizeClasses[size],
        className
      )}
    >
      <span>{emoji}</span>
      <span>{text}</span>
    </span>
  );
};
