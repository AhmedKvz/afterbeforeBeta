import { motion, AnimatePresence } from 'framer-motion';
import { X, Clover, Check, Trophy, Calendar, Sparkles, Gift } from 'lucide-react';
import { useLucky100 } from '@/hooks/useLucky100';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';

interface Lucky100ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Lucky100Modal = ({ isOpen, onClose }: Lucky100ModalProps) => {
  const { user } = useAuth();
  const {
    isEntered,
    hasWonThisWeek,
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

  // Check if user is admin (you'd implement proper admin check)
  const isAdmin = false; // Replace with actual admin check

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
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
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
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Trophy className="w-16 h-16 text-accent mx-auto mb-3" />
                    </motion.div>
                    <h4 className="text-2xl font-bold text-accent">You Won! 🎉</h4>
                    <p className="text-muted-foreground mt-2">
                      Check your notifications for your free ticket!
                    </p>
                  </motion.div>
                ) : isEntered ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-success/10 border border-success/20">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="font-bold text-success">You're Entered!</p>
                      <p className="text-sm text-muted-foreground">
                        Draw: {format(nextDrawTime, "EEEE, MMM d 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      You haven't entered this week yet
                    </p>
                    <motion.button
                      onClick={() => enter()}
                      disabled={isEntering}
                      className={cn(
                        "px-6 py-3 rounded-full font-bold",
                        "bg-gradient-to-r from-primary to-accent text-white",
                        "hover:opacity-90 transition-opacity",
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
                  <Sparkles className="w-5 h-5 text-accent" />
                  How It Works
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: Calendar, text: 'Check in to events or mark "I\'m Going"' },
                    { icon: Check, text: 'You\'re automatically entered for the week' },
                    { icon: Gift, text: '5 random winners every Friday at 20:00' },
                    { icon: Trophy, text: 'Win free tickets to upcoming events!' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
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
                    <div className="text-2xl font-bold text-primary">{monthlyEntries}</div>
                    <div className="text-xs text-muted-foreground">This Month</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">{totalWins}</div>
                    <div className="text-xs text-muted-foreground">Total Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">{entryHistory?.length ?? 0}</div>
                    <div className="text-xs text-muted-foreground">All Time</div>
                  </div>
                </div>
              </GlassCard>

              {/* Past Wins */}
              {pastWins.length > 0 && (
                <section>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    Your Wins
                  </h3>
                  <div className="space-y-2">
                    {pastWins.map((win) => (
                      <div 
                        key={win.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-accent/10 border border-accent/20"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-accent" />
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
