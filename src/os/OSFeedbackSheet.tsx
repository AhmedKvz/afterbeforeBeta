import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/analytics';
import { X } from 'lucide-react';
import { OS, G, hexA, MONO } from './osTheme';

const db = supabase as any;
const COOLDOWN_KEY = 'ab_feedback_last';

const OPTIONS = [
  { label: 'Da, definitivno', emoji: '🔥', score: 5, col: G.festival },
  { label: 'Možda', emoji: '🤔', score: 3, col: G.house },
  { label: 'Ne baš', emoji: '👎', score: 1, col: G.afterparty },
];

/** NPS sheet — Nightlife OS styling. Pairs with shouldShowFeedback() from the
 *  legacy FeedbackSheet (shared cooldown key). */
export const OSFeedbackSheet = ({ venueId, onDone }: { venueId: string | null; onDone: () => void }) => {
  const [chosen, setChosen] = useState<number | null>(null);

  const submit = async (opt: typeof OPTIONS[0]) => {
    setChosen(opt.score);
    localStorage.setItem(COOLDOWN_KEY, new Date().toISOString());
    track('feedback_nps', { score: opt.score, label: opt.label, venue_id: venueId });
    await db.rpc('submit_checkin_feedback', { p_question: 'nps_recommend', p_score: opt.score, p_label: opt.label, p_venue_id: venueId ?? null }).catch(() => {});
    setTimeout(onDone, 1000);
  };

  return (
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 186, zIndex: 80, borderRadius: 22, overflow: 'hidden', maxWidth: 496, margin: '0 auto', background: OS.surface, border: `1px solid ${OS.line2}`, boxShadow: '0 -8px 40px rgba(0,0,0,.6)', animation: 'os-sheet .35s cubic-bezier(.16,1,.3,1)' }}>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: OS.ink6, marginBottom: 4 }}>BRZO PITANJE</div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: OS.ink }}>Da li bi preporučio AfterBefore prijatelju?</div>
          </div>
          <button onClick={onDone} style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: OS.ink5 }}><X className="w-3.5 h-3.5" /></button>
        </div>

        {chosen === null ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {OPTIONS.map((opt) => (
              <button key={opt.score} onClick={() => submit(opt)} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: `1px solid ${OS.line2}`, background: OS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: OS.ink5, textAlign: 'center', lineHeight: 1.2 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{chosen === 5 ? '🔥' : chosen === 3 ? '🤝' : '💙'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: OS.ink }}>{chosen === 5 ? 'Hvala! Pomažeš nam da rastemo.' : chosen === 3 ? 'Cenimo iskrenost.' : 'Razumemo. Radimo na tome.'}</div>
          </div>
        )}
      </div>
    </div>
  );
};
