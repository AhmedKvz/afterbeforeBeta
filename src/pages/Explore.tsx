import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentPosition, Coordinates } from '@/services/geolocation';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type ExploreMode = 'people' | 'events' | 'clubs' | 'map';

const MODE_CONFIG = [
  { key: 'people' as const, icon: '👤', label: 'People', badge: 'GPS' },
  { key: 'events' as const, icon: '📅', label: 'Events', badge: null },
  { key: 'clubs' as const, icon: '🏢', label: 'Clubs', badge: null },
  { key: 'map' as const, icon: '🗺️', label: 'Pulse', badge: null },
];

const MODE_SUBTITLES: Record<ExploreMode, string> = {
  people: 'Swipe people nearby',
  events: 'Discover upcoming events',
  clubs: 'Find your favorite venues',
  map: 'Live pulse of the scene',
};

const MODE_PLACEHOLDERS: Record<ExploreMode, string> = {
  people: 'People swipe coming...',
  events: 'Event stack coming...',
  clubs: 'Club stack coming...',
  map: 'Map pulse coming...',
};

const Explore = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ExploreMode>('events');
  const [ghostMode, setGhostMode] = useState(false);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setUserPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      })
      .catch(() => {
        toast.error('Location access needed for Explore');
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-xl gradient-text">Explore</span>
          </div>
          <div className="flex items-center gap-2">
            {ghostMode ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-primary" />
            )}
            <Switch checked={!ghostMode} onCheckedChange={(v) => setGhostMode(!v)} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-8">
          {MODE_SUBTITLES[mode]}
        </p>
      </header>

      {/* Mode Selector */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          {MODE_CONFIG.map((m) => (
            <motion.button
              key={m.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode(m.key)}
              className={`relative flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                mode === m.key
                  ? 'bg-primary/15 border-primary/40'
                  : 'bg-muted/30 border-border'
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-xs font-medium">{m.label}</span>
              {m.badge && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
                  {m.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">{MODE_PLACEHOLDERS[mode]}</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;
