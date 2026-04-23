import { motion, AnimatePresence } from 'framer-motion';
import { X, Clover, Trophy, Calendar, Sparkles, Gift, Share2, Ticket, PartyPopper, Check } from 'lucide-react';
import { useLucky100Counter } from '@/hooks/useLucky100Counter';
import { useLucky100Winners } from '@/hooks/useLucky100Winners';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { GlassCard } from './GlassCard';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

interface Lucky100ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Lucky100Modal = ({ isOpen, onClose }: Lucky100ModalProps) => {
  const { user } = useAuth();
  const { stats, recentWinners, luckyInterval } = useLucky100Counter();
  const { unclaimedPrize, hasUnclaimedPrize, totalWins, winHistory } = useLucky100Winners();
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminRole();
  }, [user]);

  // Trigger celebration when modal opens and user has unclaimed prize
  useEffect(() => {
    if (isOpen && hasUnclaimedPrize) {
      setShowCelebration(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f97316'],
      });
    }
  }, [isOpen, hasUnclaimedPrize]);

  const handleShare = async () => {
    const shareText = hasUnclaimedPrize 
      ? `🍀 I just won a free ticket in the Lucky 100! Every 5th check-in wins! #Lucky100 #AfterBefore`
      : `🍀 Check out Lucky 100 - every 5th check-in wins a free ticket! #Lucky100`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lucky 100', text: shareText });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  const progressToNext = ((luckyInterval - stats.checkInsToNext) / luckyInterval) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background border-t border-border"
          >
            {/* Winner Celebration Overlay */}
            <AnimatePresence>
              {showCelebration && hasUnclaimedPrize && unclaimedPrize && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-purple-900/95 to-pink-900/95 rounded-t-3xl"
                >
                  <div className="text-center p-6">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', duration: 0.8 }}
                    >
                      <PartyPopper className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                    </motion.div>
                    
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-white mb-2"
                    >
                      🍀 YOU WON!
                    </motion.h2>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-white/80 mb-2"
                    >
                      You're check-in #{unclaimedPrize.check_in_number}!
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-white/60 text-sm mb-6"
                    >
                      Claim your free ticket now!
                    </motion.p>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      onClick={() => setShowCelebration(false)}
                      className="px-8 py-3 rounded-full bg-white text-purple-600 font-bold"
                    >
                      View Details
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Clover className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Lucky 100</h2>
                    <p className="text-sm text-muted-foreground">Instant Win Raffle</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Current Counter Status */}
              <GlassCard className="p-4 bg-gradient-to-br from-purple-600/10 via-pink-500/10 to-orange-400/10" hoverable={false}>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold">{stats.globalCount}</p>
                  <p className="text-sm text-muted-foreground">Global Check-ins</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Next winner: #{stats.nextLuckyNumber}</span>
                    <span className="font-bold text-green-500">{stats.checkInsToNext} away!</span>
                  </div>
                  <Progress value={progressToNext} className="h-3" />
                </div>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  Every {luckyInterval}th check-in wins automatically! 🍀
                </p>
              </GlassCard>

              {/* Winner Status */}
              {hasUnclaimedPrize && unclaimedPrize && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-bold text-yellow-200">You Won!</p>
                      <p className="text-sm text-yellow-200/70">
                        Check-in #{unclaimedPrize.check_in_number}
                      </p>
                    </div>
                    <button
                      onClick={() => window.location.href = '/lucky100'}
                      className="px-4 py-2 rounded-full bg-yellow-500 text-black font-bold text-sm"
                    >
                      Claim
                    </button>
                  </div>
                </div>
              )}

              {/* How It Works */}
              <section>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  How It Works
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: Calendar, text: 'Check in at any partner event', color: 'text-purple-500' },
                    { icon: Check, text: 'Your check-in adds to the global counter', color: 'text-blue-500' },
                    { icon: Gift, text: 'Every 5th check-in wins instantly!', color: 'text-pink-500' },
                    { icon: Trophy, text: 'Winners claim free tickets', color: 'text-yellow-500' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className={cn("w-8 h-8 rounded-full bg-muted flex items-center justify-center", step.color)}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm">{step.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Winners */}
              <section>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Recent Winners
                </h3>
                {recentWinners.length > 0 ? (
                  <div className="space-y-2">
                    {recentWinners.slice(0, 5).map((winner) => (
                      <div 
                        key={winner.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={winner.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
                            {winner.display_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{winner.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Check-in #{winner.check_in_number}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(winner.won_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No winners yet - be the first!</p>
                  </div>
                )}
              </section>

              {/* Your Stats */}
              <GlassCard className="p-4" hoverable={false}>
                <h3 className="font-bold mb-4">Your Lucky 100 Stats</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">{totalWins}</div>
                    <div className="text-xs text-muted-foreground">Total Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {winHistory.filter(w => w.prize_claimed).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Prizes Claimed</div>
                  </div>
                </div>
              </GlassCard>

              {/* Share */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold"
              >
                <Share2 className="w-5 h-5" />
                Share Lucky 100
              </button>

              {/* Rules */}
              <section className="pb-6">
                <h3 className="font-bold mb-3">Rules</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Check in at partner events to participate</li>
                  <li>• Every 5th check-in globally wins automatically</li>
                  <li>• Winners get free entry to partner clubs</li>
                  <li>• Prizes must be claimed within 30 days</li>
                </ul>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
