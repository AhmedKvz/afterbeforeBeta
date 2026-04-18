import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { useChallenges, ChallengeStatus } from '@/hooks/useChallenges';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { BottomNav } from '@/components/BottomNav';

const TABS: { value: ChallengeStatus; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'voting', label: 'Glasanje' },
  { value: 'resolved', label: 'Završeni' },
];

const ChallengesList = ({ status }: { status: ChallengeStatus }) => {
  const { data, isLoading } = useChallenges(status);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-52 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {status === 'live' && 'Nema aktivnih izazova trenutno.'}
          {status === 'voting' && 'Nema izazova u glasanju.'}
          {status === 'resolved' && 'Još nema završenih izazova.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((c) => (
        <ChallengeCard key={c.id} challenge={c} />
      ))}
    </div>
  );
};

const Challenges = () => {
  const [tab, setTab] = useState<ChallengeStatus>('live');

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 px-4 py-4 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">Scene Challenges</h1>
        <p className="text-xs text-muted-foreground">Glasaj, učestvuj, osvajaj nagrade</p>
      </header>

      <main className="px-4 pt-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ChallengeStatus)}>
          <TabsList className="grid w-full grid-cols-3">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <ChallengesList status={t.value} />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Challenges;
