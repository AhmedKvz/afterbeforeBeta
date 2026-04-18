import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSendSC } from '@/hooks/useSendSC';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatEurCents } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ProfileLite {
  user_id: string;
  display_name: string;
}

interface PartnerVenue {
  id: string;
  venue_name: string;
  brand_color: string | null;
}

const DRINK_PRESETS = [
  { cents: 500, label: 'Pivo' },
  { cents: 700, label: 'Koktel' },
  { cents: 1000, label: 'Runda' },
];

export const BuyDrinkDrawer = ({ open, onClose }: Props) => {
  const [search, setSearch] = useState('');
  const [recipient, setRecipient] = useState<ProfileLite | null>(null);
  const [venue, setVenue] = useState<PartnerVenue | null>(null);
  const [amountCents, setAmountCents] = useState(700);

  const { data: wallet } = useWallet();
  const sendSC = useSendSC();

  const { data: profiles } = useQuery({
    queryKey: ['profile-search-bd', search],
    enabled: open && search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .ilike('display_name', `%${search}%`)
        .limit(6);
      return (data ?? []) as ProfileLite[];
    },
  });

  const { data: venues } = useQuery({
    queryKey: ['partner-venues'],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_venues_sc')
        .select('id, venue_name, brand_color')
        .eq('active', true)
        .order('venue_name');
      return (data ?? []) as PartnerVenue[];
    },
  });

  const handleSend = async () => {
    if (!recipient || !venue) return;
    await sendSC.mutateAsync({
      recipientId: recipient.user_id,
      amountCents,
      venueId: venue.id,
      description: `Piće u ${venue.venue_name}`,
    });
    setRecipient(null);
    setVenue(null);
    setSearch('');
    onClose();
  };

  const insufficientBalance = (wallet?.scBalanceCents ?? 0) < amountCents;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-[#0c0c12] border-white/5">
        <DrawerHeader>
          <DrawerTitle className="text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Pošalji piće
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5">
          {!recipient ? (
            <>
              <Input
                placeholder="Kome šalješ?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0f0f14] border-white/10 text-white"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(profiles ?? []).map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => setRecipient(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-[10px] bg-[#0f0f14] hover:bg-[#13131a] text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/60 text-sm">
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white text-sm">{p.display_name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#0f0f14]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/60 text-sm">
                    {recipient.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{recipient.display_name}</span>
                </div>
                <button
                  onClick={() => setRecipient(null)}
                  className="font-mono text-[10px] text-white/40 uppercase tracking-wider"
                >
                  Promeni
                </button>
              </div>

              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-white/40 mb-2">
                  Klub
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(venues ?? []).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVenue(v)}
                      className={cn(
                        'p-3 rounded-[10px] border text-sm transition-colors',
                        venue?.id === v.id
                          ? 'border-white/30 bg-[#13131a] text-white'
                          : 'border-white/5 bg-[#0f0f14] text-white/70 hover:border-white/10',
                      )}
                      style={{
                        fontFamily: 'Space Grotesk, sans-serif',
                        ...(venue?.id === v.id && v.brand_color
                          ? { borderColor: v.brand_color, color: v.brand_color }
                          : {}),
                      }}
                    >
                      {v.venue_name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-white/40 mb-2">
                  Iznos
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DRINK_PRESETS.map((p) => (
                    <button
                      key={p.cents}
                      onClick={() => setAmountCents(p.cents)}
                      className={cn(
                        'p-3 rounded-[10px] border transition-colors',
                        amountCents === p.cents
                          ? 'border-[#5DCAA5] bg-[#5DCAA5]/10'
                          : 'border-white/5 bg-[#0f0f14] hover:border-white/10',
                      )}
                    >
                      <div
                        className="text-base font-bold tabular-nums"
                        style={{ color: '#5DCAA5', fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {formatEurCents(p.cents)}
                      </div>
                      <div className="font-mono text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                        {p.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSend}
                disabled={!venue || sendSC.isPending || insufficientBalance}
                className="w-full h-12 bg-[#5DCAA5] hover:bg-[#4cb893] text-[#050507] font-semibold"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {sendSC.isPending
                  ? 'Šaljem...'
                  : insufficientBalance
                    ? 'Nedovoljan saldo'
                    : `Pošalji ${formatEurCents(amountCents)}`}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
