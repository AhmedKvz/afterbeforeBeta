import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Beer, Ticket, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useWalletActivity } from '@/hooks/useWalletActivity';
import { BalanceCard } from '@/components/wallet/BalanceCard';
import { ActionTile } from '@/components/wallet/ActionTile';
import { WalletActivityItem } from '@/components/wallet/WalletActivityItem';
import { GiftXPDrawer } from '@/components/wallet/GiftXPDrawer';
import { TopupDrawer } from '@/components/wallet/TopupDrawer';
import { BuyDrinkDrawer } from '@/components/wallet/BuyDrinkDrawer';
import { BottomNav } from '@/components/BottomNav';
import { toast } from 'sonner';

const Wallet = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: wallet } = useWallet();
  const { data: activity } = useWalletActivity(30);

  const [giftOpen, setGiftOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [buyDrinkOpen, setBuyDrinkOpen] = useState(false);

  if (!loading && !user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050507] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#050507]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1
            className="text-lg font-bold text-white"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Wallet
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Balances */}
        <div className="grid grid-cols-1 gap-3">
          <BalanceCard
            variant="xp"
            amount={wallet?.xpBalance ?? 0}
            subtitle={`Level ${wallet?.level ?? 1} · status valuta`}
          />
          <BalanceCard
            variant="sc"
            amount={wallet?.scBalanceCents ?? 0}
            subtitle="Funkcionalna valuta · partneri u Beogradu"
          />
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <ActionTile
            icon={Send}
            label="Pošalji XP"
            sublabel="Poklon prijatelju"
            accentColor="#EF9F27"
            onClick={() => setGiftOpen(true)}
          />
          <ActionTile
            icon={Beer}
            label="Pošalji piće"
            sublabel="Scene Credits → klub"
            accentColor="#5DCAA5"
            onClick={() => setBuyDrinkOpen(true)}
          />
          <ActionTile
            icon={Ticket}
            label="Iskoristi u klubu"
            sublabel="QR kod · uskoro"
            accentColor="#7F77DD"
            disabled
            onClick={() => toast.info('QR redemption uskoro')}
          />
          <ActionTile
            icon={Plus}
            label="Dopuni"
            sublabel="Top-up SC"
            accentColor="#D85A30"
            onClick={() => setTopupOpen(true)}
          />
        </div>

        {/* Activity */}
        <section className="pt-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Aktivnost
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              poslednjih 30
            </span>
          </div>
          <div className="rounded-[14px] border border-white/5 bg-[#0f0f14] overflow-hidden">
            {(activity ?? []).length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/60 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Nula na računu.
                </p>
                <p className="font-mono text-[11px] text-white/30 mt-1">
                  Ali nula XP je tek početak.
                </p>
              </div>
            ) : (
              activity!.map((item) => <WalletActivityItem key={item.id} item={item} />)
            )}
          </div>
        </section>
      </main>

      <GiftXPDrawer open={giftOpen} onClose={() => setGiftOpen(false)} />
      <TopupDrawer open={topupOpen} onClose={() => setTopupOpen(false)} />
      <BuyDrinkDrawer open={buyDrinkOpen} onClose={() => setBuyDrinkOpen(false)} />

      <BottomNav />
    </div>
  );
};

export default Wallet;
