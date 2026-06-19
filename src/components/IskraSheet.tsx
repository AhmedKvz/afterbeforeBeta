import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useSparkable, useSparkActions } from '@/hooks/useSparks';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';

/** Send an Iskra (spark) to someone at the same venue. Subtle layer, not a swipe deck. */
export const IskraSheet = ({ venueId, venueName, onClose }: { venueId: string; venueName: string; onClose: () => void }) => {
  const { data: people = [], isLoading } = useSparkable(venueId);
  const { send } = useSparkActions();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 bg-background rounded-t-[26px] px-4 pt-3.5 pb-7 max-h-[80%] overflow-y-auto no-scrollbar shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wide">✨ ISKRA · {venueName}</div>
            <div className="text-[20px] font-extrabold mt-0.5">Osetio si nešto?</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Pošalji iskru — <b className="text-foreground">anonimno.</b> Ona ne zna ko si dok i ona ne pošalje nazad. Tada se otvara chat. Imaš do sutra uveče.
        </p>

        {isLoading && <p className="text-center text-muted-foreground text-sm py-8">Učitavam…</p>}

        {!isLoading && people.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <div className="text-3xl mb-2 opacity-70">🫥</div>
            <p className="text-sm font-medium">Niko (još) nije ovde za isku</p>
            <p className="text-xs mt-1">Iskru šalješ ljudima koji su se takođe čekirali na ovu žurku.</p>
          </div>
        )}

        <div className="space-y-2">
          {people.map((p: any) => (
            <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border">
              {p.avatar
                ? <img src={p.avatar} className="w-11 h-11 rounded-full object-cover flex-none" />
                : <div className="w-11 h-11 rounded-full flex-none grid place-items-center text-sm font-bold text-white" style={{ background: avatarGradient(hueFromString(p.name || p.user_id)) }}>{initials(p.name || '·')}</div>}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.name || 'rejver'}</div>
                <div className="text-[11px] text-muted-foreground">na istoj žurci</div>
              </div>
              <button
                onClick={() => send.mutate({ to: p.user_id, venue: venueId })}
                disabled={send.isPending}
                className="flex-none text-[13px] font-bold px-4 py-2.5 rounded-xl text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
              >
                ✨ Iskra
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
