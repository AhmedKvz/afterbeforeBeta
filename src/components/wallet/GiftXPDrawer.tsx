import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useGiftXP } from '@/hooks/useGiftXP';
import { useXPLimits } from '@/hooks/useXPLimits';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ProfileLite {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export const GiftXPDrawer = ({ open, onClose }: Props) => {
  const [search, setSearch] = useState('');
  const [recipient, setRecipient] = useState<ProfileLite | null>(null);
  const [amount, setAmount] = useState(50);
  const [message, setMessage] = useState('');

  const { data: wallet } = useWallet();
  const { data: limits } = useXPLimits();
  const giftMutation = useGiftXP();

  const { data: profiles } = useQuery({
    queryKey: ['profile-search', search],
    enabled: open && search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${search}%`)
        .limit(8);
      return (data ?? []) as ProfileLite[];
    },
  });

  const maxAllowed = Math.min(
    wallet?.xpBalance ?? 0,
    limits?.dailyRemaining ?? 0,
    limits?.monthlyRemaining ?? 0,
  );

  const handleSubmit = async () => {
    if (!recipient) return;
    await giftMutation.mutateAsync({
      recipientId: recipient.user_id,
      amount,
      message: message || undefined,
    });
    setRecipient(null);
    setAmount(50);
    setMessage('');
    setSearch('');
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-[#0c0c12] border-white/5">
        <DrawerHeader>
          <DrawerTitle className="text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Pošalji XP
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5">
          {!recipient ? (
            <>
              <Input
                placeholder="Pretraži po imenu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0f0f14] border-white/10 text-white"
              />
              <div className="space-y-1 max-h-64 overflow-y-auto">
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
                {search.length >= 2 && (profiles?.length ?? 0) === 0 && (
                  <p className="font-mono text-xs text-white/40 px-2">Nema rezultata.</p>
                )}
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
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                    Iznos
                  </span>
                  <span
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: '#EF9F27', fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {formatNumber(amount)} XP
                  </span>
                </div>
                <Slider
                  value={[amount]}
                  onValueChange={(v) => setAmount(v[0])}
                  min={10}
                  max={Math.max(10, maxAllowed)}
                  step={10}
                  disabled={maxAllowed < 10}
                />
                <div className="flex justify-between mt-2 font-mono text-[10px] text-white/40">
                  <span>
                    Dnevno: {formatNumber(limits?.dailyUsed ?? 0)} / {formatNumber(limits?.dailyCap ?? 0)}
                  </span>
                  <span>
                    Mes.: {formatNumber(limits?.monthlyUsed ?? 0)} / {formatNumber(limits?.monthlyCap ?? 0)}
                  </span>
                </div>
              </div>

              <Input
                placeholder="Poruka (opciono)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={100}
                className="bg-[#0f0f14] border-white/10 text-white"
              />

              <Button
                onClick={handleSubmit}
                disabled={giftMutation.isPending || amount > maxAllowed || amount < 10}
                className="w-full h-12 bg-[#7F77DD] hover:bg-[#6e66cc] text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {giftMutation.isPending ? 'Šaljem...' : `Pošalji ${formatNumber(amount)} XP`}
              </Button>

              {maxAllowed < 10 && (
                <p className="font-mono text-[11px] text-center text-[#D85A30]">
                  Nemaš dovoljno XP ili si dostigao limit.
                </p>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
