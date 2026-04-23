import { motion } from 'framer-motion';
import { Clover, ChevronLeft, Trophy, Gift, Check, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useLucky100Counter } from '@/hooks/useLucky100Counter';
import { useLucky100Winners } from '@/hooks/useLucky100Winners';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { Lucky100WinModal } from '@/components/Lucky100WinModal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const FAQ_ITEMS = [
  {
    question: 'How do I enter?',
    answer: 'Just check in at any partner event! Every check-in automatically counts towards Lucky 100.',
  },
  {
    question: 'How often can I win?',
    answer: 'You can win multiple times! Each 5th check-in is a winner, so keep attending events.',
  },
  {
    question: 'What do I win?',
    answer: 'Winners get free entry to one of our partner clubs: Drugstore, Karmakoma, or Para.',
  },
  {
    question: 'How do I claim my prize?',
    answer: 'When you win, you\'ll choose your preferred event and add your name to the guestlist through the app.',
  },
  {
    question: 'When can I redeem?',
    answer: 'Your guestlist spot is valid for any event at your chosen venue within 30 days of winning.',
  },
];

const Lucky100Page = () => {
  const navigate = useNavigate();
  const { stats, recentWinners, isLoading, luckyInterval } = useLucky100Counter();
  const { unclaimedPrize, hasUnclaimedPrize, totalWins, winHistory } = useLucky100Winners();
  const [showWinModal, setShowWinModal] = useState(false);

  const progressToNext = ((luckyInterval - stats.checkInsToNext) / luckyInterval) * 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Clover className="w-6 h-6 text-green-300" />
            <h1 className="text-xl font-bold text-white">Lucky 100</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Unclaimed Prize Alert */}
        {hasUnclaimedPrize && unclaimedPrize && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-yellow-400" />
              <div className="flex-1">
                <p className="font-bold text-yellow-200">You have an unclaimed prize!</p>
                <p className="text-sm text-yellow-200/70">Check-in #{unclaimedPrize.check_in_number}</p>
              </div>
              <button
                onClick={() => setShowWinModal(true)}
                className="px-4 py-2 rounded-full bg-yellow-500 text-black font-bold text-sm"
              >
                Claim
              </button>
            </div>
          </motion.div>
        )}

        {/* Counter Card */}
        <GlassCard className="p-6 bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-orange-400/20" hoverable={false}>
          <div className="text-center mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-2"
            >
              <Clover className="w-12 h-12 text-green-400" />
            </motion.div>
            <h2 className="text-4xl font-bold mb-1">{stats.globalCount}</h2>
            <p className="text-muted-foreground">Global Check-ins</p>
          </div>

          {/* Progress to next winner */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Next winner at check-in #{stats.nextLuckyNumber}</span>
              <span className="font-bold text-green-400">{stats.checkInsToNext} away!</span>
            </div>
            <Progress value={progressToNext} className="h-4" />
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Every {luckyInterval}th check-in wins automatically! 🍀
          </p>
        </GlassCard>

        {/* Your Stats */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 text-center" hoverable={false}>
            <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalWins}</p>
            <p className="text-xs text-muted-foreground">Your Wins</p>
          </GlassCard>
          <GlassCard className="p-4 text-center" hoverable={false}>
            <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{winHistory.filter(w => w.prize_claimed).length}</p>
            <p className="text-xs text-muted-foreground">Prizes Claimed</p>
          </GlassCard>
        </div>

        {/* Recent Winners */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recent Winners
          </h3>
          
          {recentWinners.length > 0 ? (
            <div className="space-y-2">
              {recentWinners.map((winner, index) => (
                <motion.div
                  key={winner.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={winner.avatar_url || undefined} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-400">
                      {winner.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{winner.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Check-in #{winner.check_in_number}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(winner.won_at), { addSuffix: true })}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <GlassCard className="p-6 text-center" hoverable={false}>
              <Clover className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No winners yet</p>
              <p className="text-sm text-muted-foreground">Be the first to win!</p>
            </GlassCard>
          )}
        </section>

        {/* How It Works */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            How It Works
          </h3>
          <div className="space-y-3">
            {[
              { step: 1, text: 'Check in at any partner event', icon: '📍' },
              { step: 2, text: 'Your check-in adds to the global counter', icon: '🔢' },
              { step: 3, text: 'Every 5th check-in wins automatically!', icon: '🎉' },
              { step: 4, text: 'Choose your prize and claim your ticket', icon: '🎟️' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            FAQ
          </h3>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border rounded-xl bg-muted/50 px-4"
              >
                <AccordionTrigger className="text-sm font-medium py-3">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>

      <BottomNav />

      {/* Win Modal */}
      {hasUnclaimedPrize && unclaimedPrize && (
        <Lucky100WinModal
          isOpen={showWinModal}
          onClose={() => setShowWinModal(false)}
          checkInNumber={unclaimedPrize.check_in_number}
        />
      )}
    </div>
  );
};

export default Lucky100Page;
