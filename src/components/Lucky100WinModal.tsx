import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PartyPopper, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLucky100Winners } from '@/hooks/useLucky100Winners';
import confetti from 'canvas-confetti';

interface Lucky100WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkInNumber: number;
}

const EVENT_OPTIONS = [
  { id: 'drugstore', name: 'Drugstore', description: 'Techno temple' },
  { id: 'karmakoma', name: 'Karmakoma', description: 'Underground vibes' },
  { id: 'para', name: 'Para', description: 'House & disco' },
];

export const Lucky100WinModal = ({ isOpen, onClose, checkInNumber }: Lucky100WinModalProps) => {
  const { unclaimedPrize, claimPrize, isClaiming } = useLucky100Winners();
  const [eventChoice, setEventChoice] = useState('');
  const [guestlistName, setGuestlistName] = useState('');
  const [step, setStep] = useState<'celebrate' | 'claim' | 'success'>('celebrate');

  // Trigger confetti on open
  useEffect(() => {
    if (isOpen) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#a855f7', '#ec4899', '#f97316', '#fbbf24'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#a855f7', '#ec4899', '#f97316', '#fbbf24'],
        });
      }, 150);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleClaim = () => {
    if (!unclaimedPrize || !eventChoice || !guestlistName.trim()) return;

    claimPrize(
      {
        winnerId: unclaimedPrize.id,
        eventChoice,
        guestlistName: guestlistName.trim(),
      },
      {
        onSuccess: () => setStep('success'),
      }
    );
  };

  const handleClose = () => {
    setStep('celebrate');
    setEventChoice('');
    setGuestlistName('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-gradient-to-b from-purple-900 via-pink-900 to-orange-900 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {step === 'celebrate' && (
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                >
                  <PartyPopper className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-bold text-white mb-2"
                >
                  🍀 YOU WON!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl text-white/90 mb-2"
                >
                  You're check-in #{checkInNumber}!
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/70 mb-8"
                >
                  Every 5th check-in wins a free ticket. Today, that's you!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button
                    onClick={() => setStep('claim')}
                    className="w-full py-6 text-lg font-bold bg-white text-purple-600 hover:bg-white/90"
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    Claim Your Prize
                  </Button>
                </motion.div>
              </div>
            )}

            {step === 'claim' && (
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-6 text-center">
                  Choose Your Free Ticket
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-white/80 mb-2 block">Select Event</Label>
                    <Select value={eventChoice} onValueChange={setEventChoice}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Choose an event..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_OPTIONS.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{event.name}</span>
                              <span className="text-sm text-muted-foreground">{event.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white/80 mb-2 block">Your Name (for guestlist)</Label>
                    <Input
                      value={guestlistName}
                      onChange={(e) => setGuestlistName(e.target.value)}
                      placeholder="Enter your full name..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <Button
                    onClick={handleClaim}
                    disabled={!eventChoice || !guestlistName.trim() || isClaiming}
                    className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                  >
                    {isClaiming ? 'Claiming...' : 'Confirm Claim'}
                  </Button>

                  <button
                    onClick={() => setStep('celebrate')}
                    className="w-full text-white/60 text-sm hover:text-white/80"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-green-400" />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">Prize Claimed!</h2>
                <p className="text-white/70 mb-2">
                  You're on the guestlist for{' '}
                  <span className="font-bold text-white">
                    {EVENT_OPTIONS.find((e) => e.id === eventChoice)?.name}
                  </span>
                </p>
                <p className="text-white/50 text-sm mb-6">
                  Name: {guestlistName}
                </p>

                <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
                  <h4 className="font-bold text-white mb-2">How to redeem:</h4>
                  <ol className="text-white/70 text-sm space-y-1">
                    <li>1. Go to the venue entrance</li>
                    <li>2. Say you're on the Lucky 100 guestlist</li>
                    <li>3. Show this confirmation screen</li>
                  </ol>
                </div>

                <Button onClick={handleClose} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  Done
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
