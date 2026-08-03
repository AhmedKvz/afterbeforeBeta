import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AB, G, hexA, MONO } from '../osTheme';

const db = supabase as any;

/**
 * SOFTENERI (founder 2026-08-03: „maksimalno olakšaj spajanje").
 *
 * Dva sloja, nikad oba odjednom:
 *  1. PRE IZLASKA — prazna nit dobija predlog prve poruke, zavisno od dana.
 *     Tap PUNI polje (ne šalje) — reč ostaje korisnikova.
 *  2. U KLUBU — kad smo OBOJE čekirani na istom mestu, chat nudi igrice za
 *     fizičko nalaženje. Tu je jedan tap ŠALJE odmah: u klubu se ne kuca.
 */

/** Da li smo večeras oboje na istom mestu (server, 12h prozor). */
export const useChatMeetContext = (otherId: string | null | undefined) =>
  useQuery<{ together: boolean; venue_name?: string }>({
    queryKey: ['chat-meet-ctx', otherId],
    enabled: !!otherId,
    staleTime: 120_000,
    refetchInterval: 180_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('chat_meet_context', { p_other: otherId });
      if (error) throw error;
      return data || { together: false };
    },
  });

/** Predlozi prve poruke po danu — ritam nedelje je ritam scene. */
export const dayStarters = (name: string, d = new Date()): string[] => {
  const day = d.getDay(); // 0 ned … 6 sub
  const hour = d.getHours();
  if (day === 5 || day === 6) {
    return hour >= 18 || hour < 6
      ? [`Izlaziš večeras?`, `Gde si krenuo/la?`, `Ima mesta u ekipi?`]
      : [`Šta radiš večeras?`, `Imaš plan za noćas?`, `Gde se ide?`];
  }
  if (day === 0) return [`Kako je bilo sinoć?`, `Ideš na after negde?`, `Sledeći vikend?`];
  if (day === 4) return [`Vikend se sprema — imaš plan?`, `Gde ideš u petak?`, `Praviš rutu za vikend?`];
  return [`Šta slušaš ovih dana?`, `Gde izlaziš u poslednje vreme?`, `Imaš plan za vikend?`];
};

const CHIP = {
  flex: 'none' as const, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  fontSize: 12.5, fontWeight: 600, padding: '9px 14px', borderRadius: 999,
  fontFamily: 'inherit',
};

/** Traka iznad polja za unos. Prikazuje se samo kad ima šta da ponudi. */
export const ChatStarters = ({
  otherId, otherName, empty, onPrefill, onSend,
}: {
  otherId: string | null | undefined;
  otherName: string;
  empty: boolean;
  onPrefill: (text: string) => void;
  onSend: (text: string) => void;
}) => {
  const { data: ctx } = useChatMeetContext(otherId);
  const together = !!ctx?.together;

  // U KLUBU: igrice za nalaženje — jedan tap šalje.
  if (together) {
    const venue = ctx?.venue_name || 'ovde';
    const games: string[] = [
      'Kod šanka sam 🍸',
      'Napolju na cigari 🚬',
      'Na podijumu 🕺',
      'Nosim crno 🖤',
      'Nosim belo 🤍',
      'Nađimo se kod ulaza',
    ];
    return (
      <div style={{ borderTop: `1px solid ${AB.line}`, padding: '9px 12px 0' }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '.1em', color: AB.acid, marginBottom: 7 }}>
          OBOJE STE U {venue.toUpperCase()} · NAĐITE SE
        </div>
        <div className="os-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3 }}>
          {games.map((g) => (
            <button key={g} onClick={() => onSend(g)} className="os-press" type="button"
              style={{ ...CHIP, border: `1px solid ${AB.acidDim}`, background: hexA('#34d399', 0.1), color: AB.ink }}>
              {g}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PRE IZLASKA: samo dok je nit prazna — posle prve poruke nestaje.
  if (!empty) return null;
  const starters = dayStarters(otherName);
  return (
    <div style={{ borderTop: `1px solid ${AB.line}`, padding: '9px 12px 0' }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '.1em', color: AB.ink3, marginBottom: 7 }}>
        ZA POČETAK
      </div>
      <div className="os-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3 }}>
        {starters.map((s) => (
          <button key={s} onClick={() => onPrefill(s)} className="os-press" type="button"
            style={{ ...CHIP, border: `1px solid ${hexA(G.community, 0.4)}`, background: hexA(G.community, 0.08), color: AB.ink2 }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};
