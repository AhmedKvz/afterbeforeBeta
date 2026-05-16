import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, X, Upload, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { getReviewTagsFor, VENUE_TYPE_LABEL } from './reviewTags';
import { logTrainingEvent } from '@/services/aiTracker';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueName: string;
  venueType: string;
  eventId?: string | null;
  onSubmitted?: () => void;
}

export const WriteReviewModal = ({
  open,
  onOpenChange,
  venueName,
  venueType,
  eventId,
  onSubmitted,
}: Props) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const availableTags = getReviewTagsFor(venueType);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 6)));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - photos.length);
    setPhotos((p) => [...p, ...files].slice(0, 4));
  };

  const reset = () => {
    setRating(0);
    setText('');
    setTags([]);
    setPhotos([]);
    setVisitDate(new Date().toISOString().split('T')[0]);
  };

  const submit = async () => {
    if (!user) {
      toast.error('Sign in to leave a review');
      return;
    }
    if (rating === 0) {
      toast.error('Please pick a rating');
      return;
    }
    setSubmitting(true);
    try {
      // Insert review
      const { data: review, error } = await supabase
        .from('event_reviews')
        .insert({
          user_id: user.id,
          event_id: eventId || null,
          rating,
          review_text: text || null,
          vibe_tags: tags,
          visit_date: visitDate || null,
          venue_name: venueName,
          venue_type: venueType,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // Upload photos
      if (review && photos.length > 0) {
        const uploaded: { review_id: string; photo_url: string; position: number }[] = [];
        for (let i = 0; i < photos.length; i++) {
          const f = photos[i];
          const ext = f.name.split('.').pop();
          const path = `${user.id}/${review.id}/${i}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('review-photos')
            .upload(path, f, { cacheControl: '3600', upsert: false });
          if (upErr) continue;
          const { data: pub } = supabase.storage.from('review-photos').getPublicUrl(path);
          uploaded.push({ review_id: review.id, photo_url: pub.publicUrl, position: i });
        }
        if (uploaded.length > 0) {
          await supabase.from('review_photos').insert(uploaded);
        }
      }

      // Moderation
      try {
        await supabase.functions.invoke('moderate-review', {
          body: { review_id: review!.id, text, rating },
        });
      } catch {}

      logTrainingEvent(
        'review',
        user.id,
        eventId || venueName,
        {
          rating,
          textLength: text.length,
          tagCount: tags.length,
          photoCount: photos.length,
          venueType,
        },
        `rating_${rating}`
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f97316'],
      });
      toast.success('Review posted!');
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message || 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-background border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {venueName}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {VENUE_TYPE_LABEL[venueType] || 'Venue'} · share your experience
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stars */}
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
              >
                <Star
                  className={`h-9 w-9 transition ${
                    s <= (hover || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/40'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Text */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="What was the vibe like?"
            rows={3}
          />

          {/* Tags */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vibe tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    tags.includes(t)
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Visit date */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visit date
            </p>
            <Input
              type="date"
              value={visitDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>

          {/* Photos */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Photos ({photos.length}/4)
            </p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                  <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary">
                  <Upload className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-2 text-xs text-purple-200">
            <Sparkles className="h-3.5 w-3.5" />
            🤖 AI moderation runs automatically before publishing.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            onClick={submit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? 'Posting…' : 'Post review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
