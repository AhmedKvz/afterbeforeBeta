import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from '../osTheme';

const db = supabase as any;

/** Claim funnel u OS stilu — akvizicioni kanal za klubove, portovan sa legacy
 *  VenueDetail (jedina vrednost te stranice). Stanja: verifikovan → badge,
 *  moj pending → status, neklejmovan → CTA. */
export const OSClaimCard = ({ venueName }: { venueName: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: v } = useQuery({
    queryKey: ['venue-claim', venueName],
    queryFn: async () => {
      const { data } = await db.from('venues').select('id, claim_status, claimed_by, verified, is_partner').eq('name', venueName).maybeSingle();
      return data;
    },
  });

  const claim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc('claim_venue', { p_venue: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venue-claim', venueName] });
      toast.success('Zahtev poslat 🏷️ Verifikacija u toku — javljamo se.');
    },
    onError: (e: any) => toast.error(e?.message || 'Ne može da se klejmuje — pokušaj ponovo.'),
  });

  if (!v) return null;

  if (v.verified || v.claim_status === 'claimed') {
    return (
      <div style={{ margin: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 14, background: hexA(G.festival, 0.07), border: `1px solid ${hexA(G.festival, 0.3)}` }}>
        <span style={{ fontSize: 15 }}>✓</span>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: G.festival }}>VERIFIKOVAN LOKAL{v.is_partner ? ' · PARTNER' : ''}</span>
      </div>
    );
  }

  if (v.claim_status === 'pending' && v.claimed_by === user?.id) {
    return (
      <div style={{ margin: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 14, background: hexA(G.house, 0.07), border: `1px solid ${hexA(G.house, 0.3)}` }}>
        <span style={{ fontSize: 15 }}>🕓</span>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: G.house }}>ZAHTEV POSLAT · VERIFIKACIJA U TOKU</span>
      </div>
    );
  }

  return (
    <div style={{ margin: '14px 16px 0', padding: 14, borderRadius: 16, background: OS.surface, border: `1px solid ${hexA(G.underground, 0.35)}` }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: G.underground, marginBottom: 6 }}>🏷 TVOJ LOKAL?</div>
      <div style={{ fontSize: 13, color: OS.ink3, lineHeight: 1.5, marginBottom: 11 }}>
        Klejmuj profil da upravljaš događajima, questovima i sadržajem — i da dovedeš ekipu kod sebe.
      </div>
      <button
        onClick={() => claim.mutate(v.id)}
        disabled={claim.isPending || v.claim_status === 'pending'}
        style={{ width: '100%', minHeight: 40, borderRadius: 12, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, background: v.claim_status === 'pending' ? 'rgba(255,255,255,.06)' : G.underground, color: v.claim_status === 'pending' ? OS.ink5 : '#fff', opacity: claim.isPending ? 0.6 : 1 }}
      >
        {v.claim_status === 'pending' ? 'Već u procesu klejma' : 'Klejmuj ovaj lokal'}
      </button>
    </div>
  );
};
