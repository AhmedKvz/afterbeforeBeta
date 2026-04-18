import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useTopupSC } from '@/hooks/useTopupSC';
import { formatEurCents } from '@/lib/format';
import { Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [1000, 2500, 5000]; // €10, €25, €50

export const TopupDrawer = ({ open, onClose }: Props) => {
  const topup = useTopupSC();

  const handleTopup = async (cents: number) => {
    await topup.mutateAsync(cents);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-[#0c0c12] border-white/5">
        <DrawerHeader>
          <DrawerTitle className="text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Dopuni Scene Credits
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[#7F77DD]/10 border border-[#7F77DD]/20">
            <Zap className="w-3.5 h-3.5 text-[#7F77DD]" />
            <span className="font-mono text-[11px] text-white/60 uppercase tracking-wider">
              Mock režim — pravo plaćanje uskoro
            </span>
          </div>

          {PRESETS.map((cents) => (
            <Button
              key={cents}
              onClick={() => handleTopup(cents)}
              disabled={topup.isPending}
              className="w-full h-14 justify-between bg-[#0f0f14] hover:bg-[#13131a] text-white border border-white/5"
            >
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                Simuliraj uplatu
              </span>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: '#5DCAA5', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {formatEurCents(cents)}
              </span>
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
