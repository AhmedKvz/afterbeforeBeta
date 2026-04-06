import { useRef, useEffect, useState } from 'react';

const VENUE_TYPE_COLORS: Record<string, string> = {
  club: 'rgb(168,85,247)',      // purple
  splav: 'rgb(59,130,246)',     // blue
  cafe_bar: 'rgb(245,158,11)', // amber
  afterplace: 'rgb(148,163,184)', // slate
  gallery: 'rgb(236,72,153)',  // pink
  popup: 'rgb(234,179,8)',     // yellow
};

interface CityPulseProps {
  userPosition: { latitude: number; longitude: number };
  venues: Array<{
    venue_name: string;
    latitude: number;
    longitude: number;
    peopleCount: number;
    venue_type?: string;
  }>;
  onSelectVenue: (venue: any) => void;
}

const CityPulse = ({ userPosition, venues, onSelectVenue }: CityPulseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allLats = [...venues.map(v => v.latitude), userPosition.latitude];
  const allLngs = [...venues.map(v => v.longitude), userPosition.longitude];
  const latRange = Math.max(...allLats) - Math.min(...allLats) || 0.01;
  const lngRange = Math.max(...allLngs) - Math.min(...allLngs) || 0.01;
  const pad = 0.15;
  const bounds = {
    minLat: Math.min(...allLats) - pad * latRange,
    maxLat: Math.max(...allLats) + pad * latRange,
    minLng: Math.min(...allLngs) - pad * lngRange,
    maxLng: Math.max(...allLngs) + pad * lngRange,
  };

  const toPixel = (lat: number, lng: number) => ({
    x: ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * dims.w,
    y: dims.h - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * dims.h,
  });

  const userPos = toPixel(userPosition.latitude, userPosition.longitude);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-2xl"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.04), #050508)',
        minHeight: 300,
      }}
    >
      <style>{`
        @keyframes venue-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        @keyframes radar-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      {/* Grid lines */}
      {[25, 50, 75].map(p => (
        <div key={`h-${p}`}>
          <div className="absolute left-0 right-0" style={{ top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.04)' }} />
          <div className="absolute top-0 bottom-0" style={{ left: `${p}%`, width: 1, background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ))}

      {/* Radar sweep */}
      {dims.w > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: userPos.x,
            top: userPos.y,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(168,85,247,0.06) 30deg, transparent 60deg)',
            animation: 'radar-spin 8s linear infinite',
          }}
        />
      )}

      {/* Venue dots */}
      {dims.w > 0 && venues.map(venue => {
        const pos = toPixel(venue.latitude, venue.longitude);
        const active = venue.peopleCount > 0;
        const size = active ? 14 + Math.min(venue.peopleCount * 2, 14) : 10;
        const color = VENUE_TYPE_COLORS[venue.venue_type || 'club'] || VENUE_TYPE_COLORS.club;

        return (
          <div
            key={venue.venue_name}
            className="absolute cursor-pointer"
            style={{ left: pos.x, top: pos.y, zIndex: active ? 10 : 5 }}
            onClick={() => onSelectVenue(venue)}
          >
            {/* Pulse ring for active */}
            {active && (
              <div
                className="absolute rounded-full"
                style={{
                  width: size + 16,
                  height: size + 16,
                  left: '50%',
                  top: '50%',
                  border: `2px solid ${color}`,
                  opacity: 0.4,
                  animation: 'venue-pulse 2s ease-in-out infinite',
                }}
              />
            )}
            {/* Dot */}
            <div
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: active ? color : 'rgba(255,255,255,0.2)',
                opacity: active ? 1 : 0.4,
                boxShadow: active ? `0 0 16px ${color}80` : 'none',
              }}
            />
            {/* Count badge */}
            {active && (
              <div
                className="absolute text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(${size / 2 - 2}px, ${-size / 2 - 8}px)`,
                  background: 'hsl(var(--accent))',
                  color: '#fff',
                  minWidth: 18,
                  height: 16,
                  padding: '0 4px',
                }}
              >
                {venue.peopleCount}
              </div>
            )}
            {/* Label */}
            <div
              className="absolute whitespace-nowrap text-center"
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(-50%, ${size / 2 + 4}px)`,
                fontSize: active ? 10 : 9,
                color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
              }}
            >
              {venue.venue_name}
            </div>
          </div>
        );
      })}

      {/* User dot */}
      {dims.w > 0 && (
        <div className="absolute" style={{ left: userPos.x, top: userPos.y, zIndex: 20 }}>
          <div
            className="absolute rounded-full"
            style={{
              width: 14,
              height: 14,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#fff',
              border: '3px solid hsl(var(--primary))',
              boxShadow: '0 0 20px rgba(168,85,247,0.4)',
            }}
          />
          <div
            className="absolute text-[9px] font-bold tracking-wider"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, 12px)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            YOU
          </div>
        </div>
      )}
    </div>
  );
};

export default CityPulse;