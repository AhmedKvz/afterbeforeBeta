import { motion, AnimatePresence } from 'framer-motion';
import { X, Clover, Check, Trophy, Calendar, Sparkles, Gift, Share2, Ticket, PartyPopper } from 'lucide-react';
import { useLucky100, triggerConfetti } from '@/hooks/useLucky100';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lucky100ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WinnerEvent {
  id: string;
  title: string;
  date: string;
  venue_name: string;
  image_url: string;
}

export const Lucky100Modal = ({ isOpen, onClose }: Lucky100ModalProps) => {
  const { user } = useAuth();
  const {
    isEntered,
    hasWonThisWeek,
    currentEntry,
    totalWins,
    monthlyEntries,
    entryHistory,
    weeklyEntryCount,
    nextDrawTime,
    enter,
    isEntering,
    drawWinners,
    isDrawing,
  } = useLucky100();

  const [prizeEvent, setPrizeEvent] = useState<WinnerEvent | null>(null);
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);

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

  // Fetch prize event if user won
  useEffect(() => {
    const fetchPrizeEvent = async () => {
      if (currentEntry?.won && currentEntry?.prize_event_id) {
        const { data } = await supabase
          .from('events')
          .select('id, title, date, venue_name, image_url')
          .eq('id', currentEntry.prize_event_id)
          .single();
        
        if (data) {
          setPrizeEvent(data);
        }
      }
    };
    fetchPrizeEvent();
  }, [currentEntry]);

  // Trigger celebration when modal opens and user has won
  useEffect(() => {
    if (isOpen && hasWonThisWeek) {
      setShowWinnerCelebration(true);
      triggerConfetti();
    }
  }, [isOpen, hasWonThisWeek]);

  const handleShare = async () => {
    const shareText = prizeEvent 
      ? `🎉 I just won a free ticket to ${prizeEvent.title} in the Lucky 100 draw! #Lucky100 #NightlifeOS`
      : `🍀 I'm entered in this week's Lucky 100 draw! 5 random winners get free event tickets every Friday. #Lucky100`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lucky 100',
          text: shareText,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
    }
  };

  const pastWins = entryHistory?.filter(e => e.won) ?? [];

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
              {showWinnerCelebration && hasWonThisWeek && (
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
                      🎉 YOU WON!
                    </motion.h2>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-white/80 mb-6"
                    >
                      Congratulations! You've won a free ticket!
                    </motion.p>

                    {prizeEvent && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6"
                      >
                        <p className="text-white font-bold">{prizeEvent.title}</p>
                        <p className="text-white/70 text-sm">{prizeEvent.venue_name}</p>
                        <p className="text-white/70 text-sm">{format(new Date(prizeEvent.date), 'EEEE, MMM d')}</p>
                      </motion.div>
                    )}

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      onClick={() => setShowWinnerCelebration(false)}
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
                    <p className="text-sm text-muted-foreground">Weekly Raffle</p>
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
              {/* Current Status */}
              <GlassCard className="p-4" hoverable={false}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">This Week's Status</h3>
                  <span className="text-sm text-muted-foreground">
                    {weeklyEntryCount} entries
                  </span>
                </div>

                {hasWonThisWeek ? (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Trophy className="w-8 h-8 text-yellow-500" />
                      <h4 className="text-xl font-bold text-yellow-500">You Won!</h4>
                    </div>
                    
                    {prizeEvent && (
                      <div className="bg-muted/50 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Ticket className="w-5 h-5 text-primary" />
                          <span className="font-bold">Your Prize</span>
                        </div>
                        <p className="font-medium">{prizeEvent.title}</p>
                        <p className="text-sm text-muted-foreground">{prizeEvent.venue_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(prizeEvent.date), 'EEEE, MMM d')}
                        </p>
                      </div>
                    )}

                    <div className="bg-muted/30 rounded-xl p-4 mb-4">
                      <h5 className="font-bold mb-2">How to Claim</h5>
                      <ol className="text-sm text-muted-foreground text-left space-y-2">
                        <li>1. Show this screen at the venue entrance</li>
                        <li>2. Provide your registered email for verification</li>
                        <li>3. Enjoy your free entry! 🎉</li>
                      </ol>
                    </div>

                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold"
                    >
                      <Share2 className="w-5 h-5" />
                      Share Your Win
                    </button>
                  </div>
                ) : isEntered ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-bold text-green-500">You're Entered!</p>
                      <p className="text-sm text-muted-foreground">
                        Draw: {format(nextDrawTime, "EEEE, MMM d 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      You're not in the draw yet!
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Check-in to an event or mark "I'm Going" to enter automatically.
                    </p>
                    <motion.button
                      onClick={() => enter()}
                      disabled={isEntering}
                      className={cn(
                        "px-6 py-3 rounded-full font-bold",
                        "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white",
                        "hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30",
                        "disabled:opacity-50"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isEntering ? 'Entering...' : 'Enter Now 🍀'}
                    </motion.button>
                  </div>
                )}
              </GlassCard>

              {/* How It Works */}
              <section>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  How It Works
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: Calendar, text: 'Check in to events or mark "I\'m Going"', color: 'text-purple-500' },
                    { icon: Check, text: 'You\'re automatically entered for the week', color: 'text-green-500' },
                    { icon: Gift, text: '5 random winners every Friday at 20:00', color: 'text-pink-500' },
                    { icon: Trophy, text: 'Win free tickets to upcoming events!', color: 'text-yellow-500' },
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

              {/* Your Stats */}
              <GlassCard className="p-4" hoverable={false}>
                <h3 className="font-bold mb-4">Your Lucky 100 Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-500">{monthlyEntries}</div>
                    <div className="text-xs text-muted-foreground">This Month</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">{totalWins}</div>
                    <div className="text-xs text-muted-foreground">Total Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-500">{entryHistory?.length ?? 0}</div>
                    <div className="text-xs text-muted-foreground">All Time</div>
                  </div>
                </div>
              </GlassCard>

              {/* Past Wins */}
              {pastWins.length > 0 && (
                <section>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Your Wins
                  </h3>
                  <div className="space-y-2">
                    {pastWins.map((win) => (
                      <div 
                        key={win.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          <span className="font-medium">
                            Week {win.week_number}, {win.year}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(win.created_at), 'MMM d')}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Rules */}
              <section className="pb-6">
                <h3 className="font-bold mb-3">Rules</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Be active: check in to events or add them to your list</li>
                  <li>• One entry per week (multiple activities don't add more entries)</li>
                  <li>• 5 random winners selected every Friday at 20:00</li>
                  <li>• Winners receive free tickets to upcoming events</li>
                  <li>• Winners notified via push notification and in-app</li>
                </ul>
              </section>

              {/* Admin Draw Button (hidden for non-admins) */}
              {isAdmin && (
                <div className="pb-6">
                  <button
                    onClick={() => drawWinners(5)}
                    disabled={isDrawing}
                    className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold"
                  >
                    {isDrawing ? 'Drawing...' : '🎰 Draw Lucky 100 Winners (Admin)'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
