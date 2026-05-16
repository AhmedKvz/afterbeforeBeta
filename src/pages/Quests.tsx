import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useQuests } from '@/hooks/useQuests';
import { QuestCard } from '@/components/QuestCard';
import { CountdownTimer } from '@/components/CountdownTimer';
import { BottomNav } from '@/components/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const getNextMonday = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🎯' },
  { key: 'ice_melt', label: 'Ice-Melt', emoji: '🧊' },
  { key: 'chaos', label: 'Chaos & Humor', emoji: '😈' },
  { key: 'spiritual', label: 'Spiritual & Vibe', emoji: '🌙' },
  { key: 'connection', label: '1-on-1', emoji: '💜' },
  { key: 'host', label: 'Host Questline', emoji: '🎤' },
  { key: 'after', label: 'After Quests', emoji: '🌅' },
];

const Quests = () => {
  const { quests, isLoading, claimReward, completedCount, totalCount } = useQuests();
  const [category, setCategory] = useState('all');

  const handleClaim = (questId: string, xpReward: number) => {
    claimReward({ questId, xpReward });
    toast.success(`+${xpReward} XP claimed! 🎯`);
  };

  const totalAvailableXP = quests.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalEarnedXP = quests
    .filter((q) => q.xp_claimed)
    .reduce((sum, q) => sum + q.xp_reward, 0);

  const filtered = useMemo(() => {
    if (category === 'all') return quests;
    return quests.filter((q: any) => (q.quest_type || '').toLowerCase().includes(category));
  }, [quests, category]);


  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        back
        title="Weekly Quests"
        subtitle={
          <span className="flex items-center gap-2">
            Resets in{' '}
            <CountdownTimer targetDate={getNextMonday()} compact className="text-accent" />
          </span>
        }
        right={<Target className="h-5 w-5 text-accent" />}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-center"
        >
          <p className="text-sm text-muted-foreground">Quests Completed</p>
          <p className="text-3xl font-bold">
            {completedCount}<span className="text-lg text-muted-foreground">/{totalCount}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalEarnedXP} / {totalAvailableXP} XP earned
          </p>
        </motion.div>

        {/* Quest List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No quests assigned yet</p>
            <p className="text-sm">Check back shortly — quests are assigned weekly!</p>
          </div>
        ) : (
          quests.map((quest, index) => (
            <QuestCard
              key={quest.id}
              icon={quest.icon || '🎯'}
              title={quest.title}
              description={quest.description}
              progress={quest.progress}
              targetCount={quest.target_count}
              xpReward={quest.xp_reward}
              isCompleted={quest.is_completed}
              xpClaimed={quest.xp_claimed}
              onClaim={() => handleClaim(quest.id, quest.xp_reward)}
              index={index}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Quests;
