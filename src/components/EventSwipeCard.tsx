import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/services/geolocation';
import { format } from 'date-fns';

interface EventSwipeCardProps {
  event: {
    id: string;
    title: string;
    venue_name: string;
    date: string;
    start_time: string;
    image_url: string;
    music_genres: string[];
    price: number;
    description: string;
    distance: number | null;
    signalCount: number;
  };
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop?: boolean;
}

export const EventSwipeCard = ({ event, onSwipe, isTop = false }: EventSwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const goingOpacity = useTransform(x, [0, 100], [0, 1]);
  const skipOpacity = useTransform(x, [-100, 0], [1, 0]);
  const shareOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
    } else if (info.offset.y < -threshold) {
      onSwipe('up');
    }
  };

  const formattedDate = (() => {
    try {
      return format(new Date(event.date), 'EEE, MMM d');
    } catch {
      return event.date;
    }
  })();

  return (
    <motion.div
      className={cn(
        'absolute w-full aspect-[3/4] rounded-3xl overflow-hidden',
        isTop ? 'cursor-grab active:cursor-grabbing z-10' : 'z-0'
      )}
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotate: isTop ? rotate : 0,
        scale: isTop ? 1 : 0.95,
        filter: isTop ? 'none' : 'blur(2px)',
      }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
    >
      {/* Background Image */}
      <img
        src={event.image_url || '/placeholder.svg'}
        alt={event.title}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

      {/* Distance Badge - Top Left */}
      {event.distance !== null && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-white">
            {formatDistance(event.distance)}
          </span>
        </div>
      )}

      {/* Price Badge - Top Right */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
        <span className="text-xs font-bold text-white">
          {event.price > 0 ? `€${event.price}` : 'FREE'}
        </span>
      </div>

      {/* Swipe Stamps */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-8 left-8 px-6 py-2 border-4 border-green-500 text-green-500 font-bold text-2xl rounded-lg rotate-[-20deg]"
            style={{ opacity: goingOpacity }}
          >
            GOING 🔥
          </motion.div>
          <motion.div
            className="absolute top-8 right-8 px-6 py-2 border-4 border-destructive text-destructive font-bold text-2xl rounded-lg rotate-[20deg]"
            style={{ opacity: skipOpacity }}
          >
            SKIP
          </motion.div>
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 border-4 border-accent text-accent font-bold text-2xl rounded-lg"
            style={{ opacity: shareOpacity }}
          >
            SHARE ⚡
          </motion.div>
        </>
      )}

      {/* Event Info - Bottom 40% */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h2 className="text-2xl font-bold text-white mb-1 line-clamp-2">
          {event.title}
        </h2>

        <div className="flex items-center gap-2 mb-2 text-white/80">
          <span className="text-sm">{event.venue_name}</span>
        </div>

        <div className="flex items-center gap-3 mb-3 text-white/70">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{event.start_time?.slice(0, 5)}</span>
          </div>
        </div>

        {/* Genre Pills */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {event.music_genres?.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 bg-primary/20 backdrop-blur-sm rounded-full text-xs text-primary-foreground font-medium"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Signal Count */}
        {event.signalCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-white/90">
              🔥 {event.signalCount} going
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
