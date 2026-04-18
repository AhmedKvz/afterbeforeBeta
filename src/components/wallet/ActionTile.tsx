import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionTileProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick: () => void;
  accentColor?: string;
  disabled?: boolean;
}

export const ActionTile = ({
  icon: Icon,
  label,
  sublabel,
  onClick,
  accentColor = '#7F77DD',
  disabled,
}: ActionTileProps) => {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-start gap-3 p-4 rounded-[14px] border border-white/5 bg-[#0f0f14] text-left transition-colors',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/10 active:bg-[#13131a]',
      )}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center"
        style={{ background: `${accentColor}1A`, color: accentColor }}
      >
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {label}
        </div>
        {sublabel && (
          <div className="font-mono text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
            {sublabel}
          </div>
        )}
      </div>
    </motion.button>
  );
};
