import { useState } from 'react';
import { MessageSquarePlus, X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const db = supabase as any;

/** Floating beta feedback button → modal → writes to public.feedback. */
export const BetaFeedback = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const message = msg.trim();
    if (!message) return;
    setSending(true);
    try {
      const { error } = await db.from('feedback').insert({
        user_id: user?.id ?? null,
        message,
        rating: rating || null,
        context: typeof window !== 'undefined' ? window.location.hash || window.location.pathname : null,
      });
      if (error) throw error;
      toast.success('Hvala na feedback-u! 🙌');
      setMsg(''); setRating(0); setOpen(false);
    } catch (e: any) {
      toast('Nije poslato', { description: e?.message ?? 'Pokušaj ponovo.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-24 z-[90] flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', boxShadow: '0 10px 28px -8px hsl(var(--primary) / 0.6)' }}
      >
        <MessageSquarePlus className="w-4 h-4" /> Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md bg-background rounded-3xl border border-border p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-[11px] font-bold tracking-wide text-accent">BETA</div>
                <h3 className="text-xl font-extrabold">Tvoj utisak</h3>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-white/[0.06] grid place-items-center"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[13px] text-muted-foreground mb-3">Šta ti se sviđa, šta ne radi, šta bi dodao? Sve pomaže 🙏</p>

            <div className="flex gap-1.5 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={cn('w-7 h-7', n <= rating ? 'fill-accent text-accent' : 'text-muted-foreground')} />
                </button>
              ))}
            </div>

            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={4}
              placeholder="Napiši ovde…"
              className="w-full bg-card border border-border-strong rounded-xl p-3 text-sm outline-none focus:border-primary resize-none"
            />

            <button
              onClick={submit}
              disabled={sending || !msg.trim()}
              className="mt-3 w-full py-3 rounded-xl text-white font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
            >
              {sending ? 'Šaljem…' : 'Pošalji feedback'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
