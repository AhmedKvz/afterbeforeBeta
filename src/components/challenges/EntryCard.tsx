import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Crown } from 'lucide-react';
import { ChallengeEntry } from '@/hooks/useChallengeEntries';
import { cn } from '@/lib/utils';

interface Props {
  entry: ChallengeEntry;
  rank: number;
  canVote: boolean;
  isUserVote: boolean;
  isWinner: boolean;
  isVoting: boolean;
  onVote: () => void;
}

export const EntryCard = ({ entry, rank, canVote, isUserVote, isWinner, isVoting, onVote }: Props) => {
  const initials = entry.profile?.display_name?.slice(0, 2).toUpperCase() || '??';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card/60 p-3 backdrop-blur transition',
        isWinner && 'border-amber-500/60 bg-amber-500/5',
        isUserVote && !isWinner && 'border-primary/60',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
        {isWinner ? <Crown className="h-4 w-4 text-amber-400" /> : `#${rank}`}
      </div>

      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={entry.profile?.avatar_url || undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {entry.profile?.display_name || 'Korisnik'}
        </div>
        {entry.caption && (
          <div className="truncate text-xs text-muted-foreground">{entry.caption}</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">{entry.vote_count}</span>
        {canVote ? (
          <Button
            size="sm"
            variant={isUserVote ? 'default' : 'outline'}
            disabled={isVoting || isUserVote}
            onClick={onVote}
            className="h-8 gap-1 px-3"
          >
            <Heart className={cn('h-3.5 w-3.5', isUserVote && 'fill-current')} />
            {isUserVote ? 'Glas' : 'Glasaj'}
          </Button>
        ) : (
          <Heart className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
};
