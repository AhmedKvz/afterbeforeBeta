import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { incrementQuestProgress } from '@/services/questProgress';
import { logTrainingEvent } from '@/services/aiTracker';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    venue_name: string;
    image_url: string;
  };
}

export const ReviewModal = ({ isOpen, onClose, event }: ReviewModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const xpReward = reviewText.length > 10 ? 200 : 100;

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user?.id || rating === 0) throw new Error('Missing required data');

      const { error } = await supabase
        .from('event_reviews')
        .insert({
          user_id: user.id,
          event_id: event.id,
          rating,
          review_text: reviewText || null,
        });

      if (error) throw error;
    },
    onSuccess: async (_, __, context) => {
      if (user?.id) {
        await incrementQuestProgress(user.id, 'review');
        
        // Log training event
        logTrainingEvent('review', user.id, event.id, {
          rating,
          textLength: reviewText.length,
          hasText: reviewText.length > 10,
        }, `rating_${rating}`);

        // Call moderation edge function
        try {
          const { data: reviewData } = await supabase
            .from('event_reviews')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_id', event.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (reviewData) {
            await supabase.functions.invoke('moderate-review', {
              body: { review_id: reviewData.id, text: reviewText, rating },
            });
          }
        } catch (e) {
          console.error('Moderation error:', e);
        }
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f97316'],
      });
      toast.success(`+${xpReward} XP earned! Thanks for your review!`);
      queryClient.invalidateQueries({ queryKey: ['event-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unreviewed-checkins'] });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to submit review');
      console.error('Review error:', error);
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
          {/* Header with event image */}
          <div className="relative h-32 overflow-hidden">
            <img
              src={event.image_url || '/placeholder.svg'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-4">
              <h3 className="font-bold text-white">{event.title}</h3>
              <p className="text-white/70 text-sm">{event.venue_name}</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2">How was the party?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your review helps others discover great events!
            </p>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Optional Review Text */}
            <div className="mb-4">
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, 200))}
                placeholder="Share your experience... (optional)"
                className="resize-none"
                rows={3}
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{reviewText.length}/200</span>
                <span>Add text for +100 bonus XP!</span>
              </div>
            </div>

            {/* XP Reward */}
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-purple-300">+{xpReward} XP</span>
              <span className="text-muted-foreground">
                {reviewText.length > 10 ? '(with text bonus!)' : '(stars only)'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Maybe Later
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() => submitReview.mutate()}
                disabled={rating === 0 || submitReview.isPending}
              >
                {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
