import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

/**
 * PLESNA KARTICA — poslednja završena noć, servirana na prvi ulazak u app
 * posle izlaska. Server (get_night_card) računa iz check-inova + dance
 * sesija; koraci su native slot (NULL na webu → ne prikazuju se).
 * Sva polja su JSON-primitivi (keš zakon: nikad Date u persisted keš).
 */
export interface NightCard {
  night: string;          // ISO date
  from: string;           // HH:MM
  to: string;
  duration_min: number;
  dance_s: number;
  venues: string[];
  checkins: number;
  steps: number | null;
}

const seenKey = (night: string) => `ab-night-card-seen-${night}`;

export const useNightCard = () => {
  const { user } = useAuth();
  const q = useQuery<NightCard | null>({
    queryKey: ['night-card', user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_night_card');
      return error ? null : (data as NightCard | null);
    },
  });
  const card = q.data ?? null;
  // ultra-review bug_006: dismiss MORA da obori state — localStorage sam ne
  // re-renderuje OSApp, pa bi nevidljivi scrim (fixed inset-0) ostao montiran
  // i gutao svaki tap. localStorage ostaje samo kao „jednom po noći" pamćenje.
  const [dismissed, setDismissed] = useState<string | null>(null);
  let fresh = false;
  try { fresh = !!card && card.night !== dismissed && !localStorage.getItem(seenKey(card.night)); } catch { /* private mode */ }
  const dismiss = () => {
    if (card) setDismissed(card.night);
    try { if (card) localStorage.setItem(seenKey(card.night), '1'); } catch { /* noop */ }
  };
  return { card, fresh, dismiss };
};
