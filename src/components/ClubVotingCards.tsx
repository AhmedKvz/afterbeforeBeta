import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Disc3, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useClubVotes } from '@/hooks/useClubVotes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const VOTE_MEDALS = ['🥇', '🥈', '🥉', '4.', '5.'];

export const ClubVotingCards = () => {
  const { user } = useAuth();
  const { topParties, topDJs, userVotes, vote, isVoting } = useClubVotes();
  const [expandedSection, setExpandedSection] = useState<'party' | 'dj' | null>(null);

  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events-for-voting'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, venue_name')
        .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const djOptions = [...new Set((upcomingEvents || []).map(e => e.title).filter(Boolean))];

  return (
    <div className="space-y-3">
      {/* Best Party */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'party' ? null : 'party')}
          className="w-full p-4 flex items-center justify-between"
        >
          <h3 className="font-bold flex items-center gap-2">
            <span className="text-lg">🎉</span>
            Best Party This Week
          </h3>
          {expandedSection === 'party' ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {topParties.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {topParties.slice(0, 3).map((party, i) => (
              <motion.div
                key={party.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex items-center gap-2 text-sm rounded-lg p-2 -mx-1',
                  userVotes.best_party === party.name && 'bg-primary/10 border border-primary/20'
                )}
              >
                <span className="text-base">{VOTE_MEDALS[i]}</span>
                <span className="flex-1 truncate font-medium">{party.name}</span>
                <span className="text-xs text-muted-foreground font-medium">{party.count} votes</span>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {expandedSection === 'party' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  {user ? 'Glasaj za najbolju žurku:' : 'Uloguj se da glasaš'}
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(upcomingEvents || []).map((event) => {
                    const isVoted = userVotes.best_party === event.title;
                    return (
                      <button
                        key={event.id}
                        disabled={isVoting || !user}
                        onClick={() => vote({ voteType: 'best_party', voteValue: event.title, eventId: event.id })}
                        className={cn(
                          'w-full text-left flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                          isVoted ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted/40'
                        )}
                      >
                        <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{event.venue_name}</p>
                        </div>
                        {isVoted && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Best DJ */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'dj' ? null : 'dj')}
          className="w-full p-4 flex items-center justify-between"
        >
          <h3 className="font-bold flex items-center gap-2">
            <span className="text-lg">🎧</span>
            Best DJ This Week
          </h3>
          {expandedSection === 'dj' ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {topDJs.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {topDJs.slice(0, 3).map((dj, i) => (
              <motion.div
                key={dj.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex items-center gap-2 text-sm rounded-lg p-2 -mx-1',
                  userVotes.best_dj === dj.name && 'bg-primary/10 border border-primary/20'
                )}
              >
                <span className="text-base">{VOTE_MEDALS[i]}</span>
                <span className="flex-1 truncate font-medium">{dj.name}</span>
                <span className="text-xs text-muted-foreground font-medium">{dj.count} votes</span>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {expandedSection === 'dj' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  {user ? 'Glasaj za najboljeg DJ-a:' : 'Uloguj se da glasaš'}
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {djOptions.map((name) => {
                    const isVoted = userVotes.best_dj === name;
                    const event = (upcomingEvents || []).find(e => e.title === name);
                    return (
                      <button
                        key={name}
                        disabled={isVoting || !user}
                        onClick={() => vote({ voteType: 'best_dj', voteValue: name, eventId: event?.id })}
                        className={cn(
                          'w-full text-left flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                          isVoted ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted/40'
                        )}
                      >
                        <Disc3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate font-medium">{name}</span>
                        {isVoted && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
