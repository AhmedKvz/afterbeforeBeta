import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ChevronRight } from 'lucide-react';

export const SceneBanner = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate('/scene')}
      className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border border-primary/30 text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Scene Panel</p>
            <p className="text-xs text-muted-foreground">Raverboard · Vibe · Safety</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </motion.button>
  );
};
