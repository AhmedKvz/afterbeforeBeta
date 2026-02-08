import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Music, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistance, getDistanceColor } from '@/services/geolocation';

interface SwipeCardProps {
  profile: {
    id: string;
    displayName: string;
    age: number;
    avatarUrl: string;
    bio: string;
    musicPreferences: string[];
    distance: number;
    trustScore?: number;
  };
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop?: boolean;
}

export const SwipeCard = ({ profile, onSwipe, isTop = false }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);
  
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
  
  const distanceColor = getDistanceColor(profile.distance);
  
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
        src={profile.avatarUrl || '/placeholder.svg'}
        alt={profile.displayName}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      
      {/* Like/Nope/SuperLike Indicators */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-8 left-8 px-6 py-2 border-4 border-success text-success font-bold text-2xl rounded-lg rotate-[-20deg]"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute top-8 right-8 px-6 py-2 border-4 border-destructive text-destructive font-bold text-2xl rounded-lg rotate-[20deg]"
            style={{ opacity: nopeOpacity }}
          >
            NOPE
          </motion.div>
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 border-4 border-accent text-accent font-bold text-2xl rounded-lg"
            style={{ opacity: superLikeOpacity }}
          >
            SUPER LIKE ⭐
          </motion.div>
        </>
      )}
      
      {/* Profile Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-end gap-2 mb-2">
          <h2 className="text-3xl font-bold text-white">
            {profile.displayName}
          </h2>
          <span className="text-2xl text-white/80">{profile.age}</span>
        </div>
        
        <div className={cn('flex items-center gap-1 mb-3', distanceColor)}>
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">
            {formatDistance(profile.distance)} away
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Music className="w-4 h-4 text-primary" />
          {profile.musicPreferences?.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90"
            >
              {genre}
            </span>
          ))}
        </div>
        
        {profile.bio && (
          <p className="text-white/80 text-sm line-clamp-2 mb-3">
            "{profile.bio}"
          </p>
        )}
        
        {profile.trustScore && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < profile.trustScore! ? 'text-accent fill-accent' : 'text-white/30'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
