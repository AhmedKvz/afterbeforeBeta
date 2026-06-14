import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

/** Shows partner/verified badge, and a "claim your venue" CTA for unclaimed directory venues. */
export const VenueClaimBanner = ({ venueName }: { venueName: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: venue } = useQuery({
    queryKey: ['venue-directory', venueName],
    queryFn: async () => {
      const { data } = await db.from('venues').select('*').eq('name', venueName).maybeSingle();
      return data;
    },
  });

  const claim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc('claim_venue', { p_venue: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-directory'] });
      toast('Zahtev poslat 🏷️', { description: 'Verifikacija u toku — javljamo se uskoro.' });
    },
    onError: (e: any) => toast('Ne može da se klejmuje', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });

  if (!venue) return null;

  const mineClaim = venue.claimed_by === user?.id;

  // Verified / partner — show a badge.
  if (venue.verified || venue.claim_status === 'claimed') {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-success/30 bg-success/[0.06] px-4 py-3">
        <BadgeCheck className="h-5 w-5 text-success flex-none" />
        <span className="text-sm font-semibold">Verifikovan lokal{venue.is_partner ? ' · Partner' : ''}</span>
      </div>
    );
  }

  // Claimed by me, pending verification.
  if (venue.claim_status === 'pending' && mineClaim) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3">
        <Store className="h-5 w-5 text-accent flex-none" />
        <span className="text-sm font-semibold">Zahtev za klejm poslat — verifikacija u toku 🕓</span>
      </div>
    );
  }

  // Unclaimed (or pending by someone else) — invite the owner to claim.
  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] to-secondary/[0.05] p-4">
      <div className="flex items-center gap-2 mb-1">
        <Store className="h-5 w-5 text-primary flex-none" />
        <span className="text-sm font-bold">Da li je ovo tvoj lokal?</span>
        {venue.is_partner && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">PARTNER</span>}
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">
        Klejmuj profil da upravljaš događajima, questovima i sadržajem — i da dovedeš ekipu kod sebe.
      </p>
      <button
        onClick={() => claim.mutate(venue.id)}
        disabled={claim.isPending || venue.claim_status === 'pending'}
        className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
      >
        {venue.claim_status === 'pending' ? 'Već u procesu klejma' : '🏷️ Klejmuj ovaj lokal'}
      </button>
    </div>
  );
};
