import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Users, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallenge } from '@/hooks/useChallenges';
import { useChallengeEntries, useUserChallengeVote } from '@/hooks/useChallengeEntries';
import { useVoteChallenge } from '@/hooks/useVoteChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { EntryCard } from '@/components/challenges/EntryCard';
import { SubmitEntryDrawer } from '@/components/challenges/SubmitEntryDrawer';
import { formatEUR } from '@/lib/format';
import { formatDeadline, statusLabel } from '@/lib/challengeFormat';

const statusStyles: Record<string, string> = {
  live: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  voting: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  resolved: 'bg-muted text-muted-foreground border-border',
};

const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: challenge, isLoading } = useChallenge(id);
  const { data: entries, isLoading: entriesLoading } = useChallengeEntries(id);
  const { data: userVote } = useUserChallengeVote(id);
  const voteMutation = useVoteChallenge(id || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="mb-4 text-muted-foreground">Izazov nije pronađen.</p>
        <Button onClick={() => navigate('/challenges')}>Nazad</Button>
      </div>
    );
  }

  const deadline =
    challenge.status === 'live'
      ? challenge.submission_deadline
      : challenge.status === 'voting'
        ? challenge.voting_deadline
        : challenge.resolved_at || challenge.voting_deadline;

  const canVote = challenge.status === 'voting' && !!user;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div
        className="relative h-56 w-full"
        style={{
          background: challenge.sponsor_color
            ? `linear-gradient(135deg, ${challenge.sponsor_color}60, hsl(var(--primary) / 0.3))`
            : 'linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(280 70% 50% / 0.3))',
        }}
      >
        {challenge.cover_url && (
          <img src={challenge.cover_url} alt={challenge.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur"
          aria-label="Nazad"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </button>

        <div className="absolute right-4 top-4 flex gap-2">
          <Badge variant="outline" className={statusStyles[challenge.status]}>
            {statusLabel(challenge.status)}
          </Badge>
        </div>
      </div>

      <main className="-mt-12 space-y-5 px-4">
        {/* Title block */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur">
          {challenge.sponsor_name && (
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              Sponzorisao {challenge.sponsor_name}
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{challenge.title}</h1>
          {challenge.description && (
            <p className="mt-2 text-sm text-muted-foreground">{challenge.description}</p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4">
            <div className="text-center">
              <Trophy className="mx-auto mb-1 h-4 w-4 text-amber-400" />
              <div className="text-sm font-semibold">{formatEUR(challenge.prize_pool_cents)}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Nagrada</div>
            </div>
            <div className="text-center">
              <Users className="mx-auto mb-1 h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">{entries?.length || 0}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Prijava</div>
            </div>
            <div className="text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">{formatDeadline(deadline)}</div>
              <div className="text-[10px] uppercase text-muted-foreground">
                {challenge.status === 'resolved' ? 'Završen' : 'Preostalo'}
              </div>
            </div>
          </div>

          {challenge.prize_description && (
            <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
              🏆 {challenge.prize_description}
            </div>
          )}
        </div>

        {/* Entries */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {challenge.status === 'resolved' ? 'Konačni rezultati' : 'Prijave'}
            </h2>
            {challenge.status === 'voting' && userVote && (
              <span className="text-xs text-primary">Već si glasao</span>
            )}
          </div>

          {entriesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
              Još nema prijava.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  rank={idx + 1}
                  canVote={canVote && entry.user_id !== user?.id}
                  isUserVote={userVote === entry.id}
                  isWinner={
                    challenge.status === 'resolved' &&
                    (challenge.winner_entry_id === entry.id || (idx === 0 && !challenge.winner_entry_id))
                  }
                  isVoting={voteMutation.isPending}
                  onVote={() => voteMutation.mutate(entry.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ChallengeDetail;
