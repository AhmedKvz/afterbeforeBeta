import { useState } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from '@/os/osTheme';

const db = supabase as any;

/** Floating beta feedback button → modal → writes to public.feedback. Nightlife OS styling. */
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
        style={{ position: 'fixed', left: 14, bottom: 'calc(env(safe-area-inset-bottom) + 24px)', zIndex: 45, display: 'flex', alignItems: 'center', gap: 7, borderRadius: 999, padding: '9px 14px', fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: OS.ink2, background: 'rgba(19,20,23,.86)', backdropFilter: 'blur(14px)', border: `1px solid ${OS.line2}` }}
      >
        <MessageSquarePlus className="w-4 h-4" /> FEEDBACK
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,7,.66)', backdropFilter: 'blur(4px)', animation: 'os-scrim .25s ease' }} />
          <div className="os-scroll" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 480, background: OS.surface3, borderRadius: '26px 26px 0 0', border: '1px solid rgba(255,255,255,.08)', padding: '18px 18px calc(env(safe-area-inset-bottom) + 22px)', animation: 'os-sheet .35s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.14em', color: G.community }}>BETA · FEEDBACK</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: OS.ink, marginTop: 3 }}>Tvoj utisak</h3>
              </div>
              <button onClick={() => setOpen(false)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer', color: OS.ink2 }}><X className="w-4 h-4" /></button>
            </div>
            <p style={{ fontSize: 13, color: OS.ink5, marginBottom: 14 }}>Šta ti se sviđa, šta ne radi, šta bi dodao? Sve pomaže 🙏</p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} style={{ flex: 1, height: 38, borderRadius: 10, border: 0, cursor: 'pointer', fontSize: 18, background: n <= rating ? hexA(G.house, 0.2) : 'rgba(255,255,255,.05)', color: n <= rating ? G.house : OS.ink6 }}>★</button>
              ))}
            </div>

            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={4}
              placeholder="Napiši ovde…"
              style={{ width: '100%', background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 12, padding: 12, fontSize: 14, color: OS.ink, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
            />

            <button
              onClick={submit}
              disabled={sending || !msg.trim()}
              style={{ marginTop: 12, width: '100%', padding: 14, borderRadius: 14, border: 0, fontWeight: 640, fontSize: 15, cursor: sending || !msg.trim() ? 'default' : 'pointer', background: msg.trim() ? G.community : 'rgba(255,255,255,.05)', color: msg.trim() ? '#0B0B0D' : OS.ink6 }}
            >
              {sending ? 'Šaljem…' : 'Pošalji feedback'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
