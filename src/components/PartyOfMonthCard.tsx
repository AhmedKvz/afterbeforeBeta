import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { GradientImg } from './GradientImg';
import { hueFromString } from '@/lib/gradients';
import { usePartyOfMonthVote } from '@/hooks/usePartyOfMonth';
import { cn } from '@/lib/utils';

interface PartyOfMonthCardProps {
  event: any;
  voteCount: number;
  avgRating: number;
  reviewCount: number;
  userVoted: boolean;
}

export const PartyOfMonthCard = ({
  event,
  voteCount,
  avgRating,
  reviewCount,
  userVoted,
}: PartyOfMonthCardProps) => {
  const navigate = useNavigate();
  const vote = usePartyOfMonthVote();

  const monthLabel = (() => {
    try {
      return format(new Date(), 'MMMM');
    } catch {
      return 'This Month';
    }
  })();

  const dateLabel = (() => {
    try {
      return format(new Date(event.date), 'EEE, MMM d');
    } catch {
      return event.date;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl shadow-lg"
      style={{ boxShadow: '0 10px 30px -10px rgba(245,166,35,0.4)' }}
    >
      <GradientImg
        src={event.image_url}
        hue={hueFromString(event.venue_name || event.title)}
        alt={event.title}
        className="relative h-56 cursor-pointer"
        imgClassName="transition-transform duration-500 hover:scale-105"
      >
        {/* dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Party of the Month badge */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-accent-foreground shadow-lg">
            <span>👑</span>
            <span>Party of {monthLabel}</span>
          </div>
        </div>

        {/* Vote count chip */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
          🗳️ {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
        </div>

        {/* tap-to-open area */}
        <button
          onClick={() => navigate(`/event/${event.id}`)}
          className="absolute inset-0"
          aria-label={`Open ${event.title}`}
        />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="mb-1 text-xl font-bold text-white">{event.title}</h3>

          <div className="mb-3 flex items-center gap-3 text-sm text-white/80">
            <span>{dateLabel}</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{event.venue_name}</span>
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-bold">{avgRating.toFixed(1)}</span>
                {reviewCount > 0 && <span className="text-white/60">({reviewCount})</span>}
              </div>
            )}
          </div>

          {/* Vote button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              vote.mutate(event.id);
            }}
            disabled={vote.isPending}
            className={cn(
              'relative z-10 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition',
              userVoted
                ? 'bg-success/20 text-success border border-success/40'
                : 'bg-gradient-to-r from-primary to-secondary text-white shadow-[0_8px_24px_-8px_rgba(138,92,246,0.6)] hover:brightness-110',
              vote.isPending && 'opacity-70'
            )}
          >
            {userVoted ? (
              <>
                <Check className="h-4 w-4" /> You voted · +XP earned
              </>
            ) : (
              <>🗳️ Vote for Party of the Month · +100 XP</>
            )}
          </button>
        </div>
      </GradientImg>
    </motion.div>
  );
};
