import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export const VerifiedVisitBadge = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <motion.div
    initial={{ scale: 0.85, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className={`inline-flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-yellow-300 ${
      size === 'sm' ? 'text-[10px]' : 'text-xs'
    }`}
  >
    <ShieldCheck className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    <span className="font-semibold uppercase tracking-wider">Verified Visit</span>
  </motion.div>
);
