import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

interface Location {
  id: string;
  title: string;
  venueName: string;
  latitude: number;
  longitude: number;
  heatScore: number;
  onClick: () => void;
}

interface MapViewProps {
  locations: Location[];
  userLocation?: { latitude: number; longitude: number } | null;
}

export const MapView = ({ locations, userLocation }: MapViewProps) => {
  // Simple placeholder map - in production, integrate with Mapbox/Google Maps
  const getHeatColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-muted';
  };

  return (
    <div className="relative h-[60vh] bg-muted/20 rounded-2xl overflow-hidden border border-border">
      {/* Map Background Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="absolute inset-0 opacity-10">
          {/* Grid lines for map effect */}
          <svg width="100%" height="100%" className="text-primary/20">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Location Pins */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full p-8">
          {locations.map((location, index) => {
            // Distribute pins in a grid pattern for demo
            const row = Math.floor(index / 3);
            const col = index % 3;
            const top = 20 + row * 25;
            const left = 15 + col * 30;

            return (
              <motion.button
                key={location.id}
                onClick={location.onClick}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${top}%`, left: `${left}%` }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="relative">
                  {/* Pulse effect for hot locations */}
                  {location.heatScore >= 60 && (
                    <div className={`absolute inset-0 rounded-full ${getHeatColor(location.heatScore)} animate-ping opacity-75`} />
                  )}
                  <div className={`relative w-10 h-10 rounded-full ${getHeatColor(location.heatScore)} flex items-center justify-center shadow-lg`}>
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  {/* Venue label */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-xs font-medium whitespace-nowrap">
                    {location.venueName}
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* User Location */}
          {userLocation && (
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-50" />
                <div className="relative w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-4 ring-primary/30">
                  <Navigation className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass-card p-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>On Fire</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Hot</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Warm</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span>Chill</span>
          </div>
        </div>
      </div>
    </div>
  );
};
