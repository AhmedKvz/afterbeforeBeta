import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock } from 'lucide-react';
import { Challenge } from '@/hooks/useChallenges';
import { formatEUR } from '@/lib/format';
import { formatDeadline, statusLabel } from '@/lib/challengeFormat';

interface Props {
  challenge: Challenge;
}

const statusStyles: Record<string, string> = {
  live: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  voting: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  resolved: 'bg-muted text-muted-foreground border-border',
};

export const ChallengeCard = ({ challenge }: Props) => {
  const deadline =
    challenge.status === 'live'
      ? challenge.submission_deadline
      : challenge.status === 'voting'
        ? challenge.voting_deadline
        : challenge.resolved_at || challenge.voting_deadline;

  return (
    <Link to={`/challenges/${challenge.id}`}>
      <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur transition hover:border-primary/40 hover:shadow-lg">
        <div
          className="relative h-32 w-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/20"
          style={
            challenge.sponsor_color
              ? {
                  background: `linear-gradient(135deg, ${challenge.sponsor_color}40, hsl(var(--primary) / 0.2))`,
                }
              : undefined
          }
        >
          {challenge.cover_url && (
            <img src={challenge.cover_url} alt={challenge.title} className="h-full w-full object-cover" />
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="outline" className={statusStyles[challenge.status]}>
              {statusLabel(challenge.status)}
            </Badge>
            {challenge.challenge_type === 'sponsored' && challenge.sponsor_name && (
              <Badge variant="outline" className="border-white/30 bg-black/40 text-white backdrop-blur">
                by {challenge.sponsor_name}
              </Badge>
            )}
          </div>
          {challenge.prize_pool_cents > 0 && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-semibold text-amber-300 backdrop-blur">
              <Trophy className="h-3 w-3" />
              {formatEUR(challenge.prize_pool_cents)}
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          <h3 className="line-clamp-1 text-base font-semibold text-foreground">{challenge.title}</h3>
          {challenge.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{challenge.description}</p>
          )}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {challenge.entry_count || 0} prijava
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDeadline(deadline)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};
