import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/analytics';
import { X } from 'lucide-react';

const db = supabase as any;

const COOLDOWN_KEY = 'ab_feedback_last';
const COOLDOWN_DAYS = 7;

const OPTIONS = [
  { label: 'Da, definitivno', emoji: '🔥', score: 5 },
  { label: 'Možda', emoji: '🤔', score: 3 },
  { label: 'Ne baš', emoji: '👎', score: 1 },
];

interface Props {
  venueId: string | null;
  onDone: () => void;
}

export const FeedbackSheet = ({ venueId, onDone }: Props) => {
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  const submit = async (opt: typeof OPTIONS[0]) => {
    setChosen(opt.score);
    setAnswered(true);
    localStorage.setItem(COOLDOWN_KEY, new Date().toISOString());

    track('feedback_nps', { score: opt.score, label: opt.label, venue_id: venueId });

    await db.rpc('submit_checkin_feedback', {
      p_question: 'nps_recommend',
      p_score: opt.score,
      p_label: opt.label,
      p_venue_id: venueId ?? null,
    }).catch(() => {});

    setTimeout(onDone, 900);
  };

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 140, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className="fixed bottom-24 left-3 right-3 z-50 rounded-[24px] border border-white/10 overflow-hidden"
      style={{ background: 'oklch(0.14 0.04 260 / 0.97)', backdropFilter: 'blur(20px)', boxShadow: '0 -4px 40px oklch(0.55 0.22 260 / 0.15)' }}
    >
      <div className="px-5 pt-4 pb-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-muted-foreground mb-0.5">BRZO PITANJE</div>
            <div className="text-[15px] font-bold leading-snug">Da li bi preporučio AfterBefore<br />prijatelju?</div>
          </div>
          <button onClick={onDone} className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Options */}
        {!answered ? (
          <div className="flex gap-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.score}
                onClick={() => submit(opt)}
                className="flex-1 py-3 rounded-2xl border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-3"
          >
            <div className="text-2xl mb-1">
              {chosen === 5 ? '🔥' : chosen === 3 ? '🤝' : '💙'}
            </div>
            <div className="text-[13px] font-semibold">
              {chosen === 5 ? 'Hvala! Pomažeš nam da rastemo.' : chosen === 3 ? 'Cenimo iskrenost.' : 'Razumemo. Radimo na tome.'}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Returns true if user hasn't answered in the last COOLDOWN_DAYS days
export { shouldShowFeedback } from '@/lib/feedbackCadence';
