import { cn } from '@/lib/utils';

// Single source of truth for venue category visuals across the app.
// Aligns with mem://style/map-color-coding.
export const VENUE_TYPE_META: Record<
  string,
  { label: string; emoji: string; chip: string; dot: string }
> = {
  club:        { label: 'Club',        emoji: '🎵', chip: 'bg-purple-500/15 text-purple-300 border-purple-400/30', dot: 'bg-purple-400' },
  splav:       { label: 'Splav',       emoji: '🚢', chip: 'bg-blue-500/15 text-blue-300 border-blue-400/30',       dot: 'bg-blue-400' },
  cafe:        { label: 'Cafe',        emoji: '☕', chip: 'bg-amber-500/15 text-amber-300 border-amber-400/30',     dot: 'bg-amber-400' },
  cafe_bar:    { label: 'Cafe',        emoji: '☕', chip: 'bg-amber-500/15 text-amber-300 border-amber-400/30',     dot: 'bg-amber-400' },
  bar:         { label: 'Bar',         emoji: '🍸', chip: 'bg-rose-500/15 text-rose-300 border-rose-400/30',         dot: 'bg-rose-400' },
  afterplace:  { label: 'Food Corner', emoji: '🍔', chip: 'bg-orange-500/15 text-orange-300 border-orange-400/30', dot: 'bg-orange-400' },
  gallery:     { label: 'Gallery',     emoji: '🎨', chip: 'bg-pink-500/15 text-pink-300 border-pink-400/30',         dot: 'bg-pink-400' },
  popup:       { label: 'Pop-up',      emoji: '⚡', chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',   dot: 'bg-yellow-400' },
  restaurant:  { label: 'Restaurant',  emoji: '🍽️', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', dot: 'bg-emerald-400' },
  venue:       { label: 'Venue',       emoji: '🏛️', chip: 'bg-violet-500/15 text-violet-300 border-violet-400/30',   dot: 'bg-violet-400' },
};

interface Props {
  type?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export const VenueTypeBadge = ({ type, size = 'sm', className }: Props) => {
  const meta = VENUE_TYPE_META[type || 'club'] || VENUE_TYPE_META.club;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        meta.chip,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  );
};
