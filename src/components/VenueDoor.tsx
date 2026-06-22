import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVenueGuestlist, useVerifyRedemption } from '@/hooks/useRedemptions';
import { DoorOpen, Check, Clock } from 'lucide-react';

/** Venue door screen: tonight's guest-list + code verification. Self-resolves the venue uuid. */
export const VenueDoor = () => {
  const [venueId, setVenueId] = useState<string | undefined>();
  const [code, setCode] = useState('');

  useEffect(() => {
    (supabase as any).rpc('get_my_venue').then(({ data }: any) => setVenueId(data || undefined));
  }, []);

  const { data: guests = [], isLoading } = useVenueGuestlist(venueId);
  const verify = useVerifyRedemption();

  const ready = guests.filter((g: any) => g.status === 'unlocked');   // pinged — earned, at the door
  const waiting = guests.filter((g: any) => g.status === 'claimed');  // reserved, not yet arrived
  const done = guests.filter((g: any) => g.status === 'redeemed');    // already let in

  const onVerify = () => {
    if (!code.trim()) return;
    verify.mutate(code, { onSuccess: () => setCode('') });
  };

  return (
    <section>
      <h2 className="font-semibold text-lg mb-3 flex items-center gap-2"><DoorOpen className="w-5 h-5 text-primary" /> Vrata · večeras</h2>

      {/* Code verify */}
      <div className="flex gap-2 mb-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && onVerify()}
          placeholder="Unesi kod (npr. CFB78B)"
          maxLength={6}
          className="flex-1 px-3 py-2.5 rounded-xl bg-card border border-border font-mono tracking-[0.2em] text-sm uppercase outline-none focus:border-primary"
        />
        <button
          onClick={onVerify}
          disabled={verify.isPending || code.length < 4}
          className="px-4 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
        >
          Propusti
        </button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-2 rounded-xl bg-card border border-border">
          <div className="text-lg font-bold text-accent">{ready.length}</div>
          <div className="text-[10px] text-muted-foreground">Stigli</div>
        </div>
        <div className="p-2 rounded-xl bg-card border border-border">
          <div className="text-lg font-bold text-muted-foreground">{waiting.length}</div>
          <div className="text-[10px] text-muted-foreground">Najavili</div>
        </div>
        <div className="p-2 rounded-xl bg-card border border-border">
          <div className="text-lg font-bold text-text-faint">{done.length}</div>
          <div className="text-[10px] text-muted-foreground">Propušteno</div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Učitavanje…</p>
      ) : guests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Još niko nije na listi za večeras.</p>
      ) : (
        <div className="space-y-1.5">
          {[...ready, ...waiting, ...done].map((g: any) => (
            <div key={g.redemption_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
              <div className="shrink-0">
                {g.status === 'unlocked' ? <Check className="w-4 h-4 text-accent" />
                  : g.status === 'redeemed' ? <Check className="w-4 h-4 text-text-faint" />
                  : <Clock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{g.guest_name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{g.reward_title}</div>
              </div>
              <div className="font-mono text-xs tracking-[0.15em]" style={{ opacity: g.status === 'redeemed' ? 0.4 : 1 }}>{g.code}</div>
              <div className="text-[9px] uppercase font-bold tracking-wide shrink-0"
                   style={{ color: g.status === 'unlocked' ? 'hsl(var(--accent))' : g.status === 'redeemed' ? 'hsl(var(--text-faint))' : 'hsl(var(--muted-foreground))' }}>
                {g.status === 'unlocked' ? 'stigao' : g.status === 'redeemed' ? 'ušao' : 'čeka'}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
