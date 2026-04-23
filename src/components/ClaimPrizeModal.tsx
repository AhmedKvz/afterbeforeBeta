import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, PartyPopper, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const EVENT_CHOICES = [
  { value: 'drugstore', label: 'Drugstore', description: 'Underground techno vibes' },
  { value: 'karmakoma', label: 'Karmakoma', description: 'House music paradise' },
  { value: 'para', label: 'Para', description: 'Electronic beats all night' },
];

interface ClaimPrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
}

export const ClaimPrizeModal = ({ isOpen, onClose, entryId }: ClaimPrizeModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [eventChoice, setEventChoice] = useState('');
  const [guestlistName, setGuestlistName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const claimPrize = useMutation({
    mutationFn: async () => {
      if (!user?.id || !eventChoice || !guestlistName) {
        throw new Error('Missing required data');
      }

      const { error } = await supabase
        .from('lucky_100_claims')
        .insert({
          user_id: user.id,
          entry_id: entryId,
          event_choice: eventChoice,
          guestlist_name: guestlistName,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#d97706'],
      });
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['lucky-100'] });
      toast.success("You're on the guestlist! 🎉");
    },
    onError: (error) => {
      toast.error('Failed to claim prize');
      console.error('Claim error:', error);
    },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-background rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 text-center">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block"
            >
              <PartyPopper className="w-16 h-16 text-white mx-auto mb-3" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-white mb-1">
              🎉 CONGRATULATIONS! 🎉
            </h2>
            <p className="text-white/90">
              You won a free ticket in Lucky 100!
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-bold text-xl mb-2">You're on the list!</h3>
                <p className="text-muted-foreground mb-4">
                  Show up at {EVENT_CHOICES.find(e => e.value === eventChoice)?.label} and tell them your name: <strong>{guestlistName}</strong>
                </p>
                <Button onClick={onClose} className="w-full">
                  Got it!
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Gift className="w-5 h-5 text-amber-400" />
                  <span className="text-sm">
                    Choose your event and add your name to the guestlist
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label>Choose Event</Label>
                    <Select value={eventChoice} onValueChange={setEventChoice}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_CHOICES.map((event) => (
                          <SelectItem key={event.value} value={event.value}>
                            <div>
                              <div className="font-medium">{event.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {event.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Name for Guestlist</Label>
                    <Input
                      value={guestlistName}
                      onChange={(e) => setGuestlistName(e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is the name you'll use at the door
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={() => claimPrize.mutate()}
                  disabled={!eventChoice || !guestlistName || claimPrize.isPending}
                >
                  {claimPrize.isPending ? 'Claiming...' : 'Claim My Free Ticket'}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
