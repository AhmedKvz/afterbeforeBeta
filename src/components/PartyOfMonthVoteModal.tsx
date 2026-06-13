import { motion } from 'framer-motion';
import { X, Check, Star } from 'lucide-react';
import { format } from 'date-fns';
import { usePartyCandidates, usePartyOfMonthVote, PartyCandidate } from '@/hooks/usePartyOfMonth';
import { GradientImg } from './GradientImg';
import { hueFromString } from '@/lib/gradients';

interface Props {
  onClose: () => void;
}

export const PartyOfMonthVoteModal = ({ onClose }: Props) => {
  const { data: candidates = [], isLoading } = usePartyCandidates();
  const vote = usePartyOfMonthVote();
  const month = (() => { try { return format(new Date(), 'MMMM'); } catch { return 'this month'; } })();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 bg-background rounded-t-[26px] px-4 pt-3.5 pb-7 max-h-[88%] overflow-y-auto no-scrollbar"
      >
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wide">👑 PARTY OF {month.toUpperCase()}</div>
            <div className="text-[22px] font-extrabold mt-0.5">Vote your pick</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">One vote per month · changing your vote moves it · +100 XP the first time.</p>

        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Loading candidates…</div>
        ) : candidates.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No events this month yet.</div>
        ) : (
          <div className="space-y-2.5">
            {candidates.map((c: PartyCandidate) => (
              <div
                key={c.event_id}
                className="flex items-center gap-3 p-2.5 rounded-2xl border"
                style={{ borderColor: c.user_voted ? 'hsl(var(--success) / 0.5)' : 'hsl(var(--border))', background: 'hsl(var(--card))' }}
              >
                <GradientImg
                  src={c.image_url}
                  hue={hueFromString(c.venue_name || c.title)}
                  className="relative w-14 h-14 rounded-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">{c.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.venue_name}
                    {c.avg_rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 ml-1.5 text-yellow-300">
                        <Star className="w-3 h-3 fill-current" />{c.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">🗳️ {c.vote_count} {c.vote_count === 1 ? 'vote' : 'votes'}</div>
                </div>
                <button
                  onClick={() => !c.user_voted && vote.mutate(c.event_id)}
                  disabled={vote.isPending}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
                  style={c.user_voted
                    ? { background: 'hsl(var(--success) / 0.2)', color: 'hsl(var(--success))' }
                    : { background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', color: '#fff' }}
                >
                  {c.user_voted ? <><Check className="w-3.5 h-3.5" /> Voted</> : 'Vote'}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
