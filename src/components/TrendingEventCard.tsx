import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Star, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { VibeBadge } from './VibeBadge';
import { cn } from '@/lib/utils';

interface TrendingEventCardProps {
  id: string;
  title: string;
  date: string;
  startTime: string;
  venueName: string;
  imageUrl: string;
  avgRating: number;
  reviewCount: number;
  latestReviewSnippet?: string;
}

export const TrendingEventCard = ({
  id,
  title,
  date,
  startTime,
  venueName,
  imageUrl,
  avgRating,
  reviewCount,
  latestReviewSnippet,
}: TrendingEventCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/event/${id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
    >
      {/* Background Image */}
      <div className="aspect-[16/10] relative">
        <img
          src={imageUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Trending Badge */}
      <div className="absolute top-3 left-3">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold shadow-lg"
        >
          <TrendingUp className="w-3 h-3" />
          TRENDING THIS WEEK
        </motion.div>
      </div>

      {/* Vibe Badge */}
      <div className="absolute top-3 right-3">
        <VibeBadge rating={avgRating} size="lg" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

        <div className="flex items-center gap-4 text-white/80 text-sm mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(date), 'EEE, MMM d')}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{venueName}</span>
          </div>
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-3 py-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-white/70">({reviewCount})</span>
          </div>
          
          {latestReviewSnippet && (
            <p className="text-white/60 text-xs italic truncate flex-1">
              "{latestReviewSnippet}"
            </p>
          )}
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};
