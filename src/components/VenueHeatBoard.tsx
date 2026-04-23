import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ClubVotingCards } from '@/components/ClubVotingCards';

const MEDALS = ['🥇', '🥈', '🥉'];
const PRIZE_LABELS = ['Featured Club of the Week', 'Trending', 'Rising'];

interface VenueHeat {
  venue_name: string;
  signal_count: number;
  checkin_count: number;
  total_heat: number;
  top_event_title: string;
  top_event_id: string;
}

interface VenueHeatBoardProps {
  compact?: boolean;
}

export const VenueHeatBoard = ({ compact = false }: VenueHeatBoardProps) => {
  const navigate = useNavigate();

  const { data: venueHeat, isLoading } = useQuery({
    queryKey: ['venue-heat'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_venue_heat', { days_back: 7 });
      if (error) throw error;
      return (data as unknown as VenueHeat[]) || [];
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-12 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!venueHeat?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Flame className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No venue heat yet this week</p>
      </div>
    );
  }

  const maxHeat = venueHeat[0]?.total_heat || 1;
  const displayVenues = compact ? venueHeat.slice(0, 3) : venueHeat;

  if (compact) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <span>🔥</span> This Week's Heat
          </h3>
          <button
            onClick={() => navigate('/leaderboard?mode=clubs')}
            className="text-xs text-primary"
          >
            See all →
          </button>
        </div>
        <div className="space-y-2">
          {displayVenues.map((venue, index) => (
            <motion.div
              key={venue.venue_name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => venue.top_event_id && navigate(`/event/${venue.top_event_id}`)}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors"
            >
              <span className="text-lg">{MEDALS[index]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{venue.venue_name}</p>
                <p className="text-xs text-muted-foreground truncate">{venue.top_event_title}</p>
              </div>
              <span className="text-sm font-bold text-orange-400 flex items-center gap-1">
                🔥 {venue.total_heat}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Prizes */}
      <div className="glass-card p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Club Prizes
        </h3>
        <div className="space-y-2">
          {PRIZE_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{MEDALS[i]}</span>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Voting */}
      <ClubVotingCards />

      {/* Rankings */}
      {displayVenues.map((venue, index) => {
        const isTop3 = index < 3;
        return (
          <motion.div
            key={venue.venue_name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => venue.top_event_id && navigate(`/event/${venue.top_event_id}`)}
            className={cn(
              'glass-card p-4 cursor-pointer hover:border-primary/30 transition-colors',
              index === 0 && 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center">
                {isTop3 ? (
                  <span className="text-2xl">{MEDALS[index]}</span>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{venue.venue_name}</p>
                <p className="text-xs text-muted-foreground">
                  {venue.signal_count} going · {venue.checkin_count} checked in
                </p>
                <Progress
                  value={(venue.total_heat / maxHeat) * 100}
                  className="h-1.5 mt-1.5"
                />
                {venue.top_event_title && (
                  <p className="text-xs text-primary mt-1 truncate">
                    🎵 {venue.top_event_title}
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="font-bold text-lg text-orange-400">
                  {venue.total_heat}
                </span>
                <span className="text-xs text-muted-foreground ml-1">🔥</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
