import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Star, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { VibeBadge } from './VibeBadge';
import { cn } from '@/lib/utils';

interface BestPartyCardProps {
  id: string;
  title: string;
  date: string;
  startTime: string;
  venueName: string;
  imageUrl: string;
  avgRating: number;
  reviewCount: number;
}

export const BestPartyCard = ({
  id,
  title,
  date,
  startTime,
  venueName,
  imageUrl,
  avgRating,
  reviewCount,
}: BestPartyCardProps) => {
  const navigate = useNavigate();
  
  const formattedDate = format(new Date(date), 'EEE, MMM d');
  const formattedTime = startTime.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      onClick={() => navigate(`/event/${id}`)}
      className="relative overflow-hidden rounded-2xl cursor-pointer group shadow-lg"
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={imageUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Best Party Badge */}
        <div className="absolute top-3 left-3">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              "bg-gradient-to-r from-red-500 to-pink-500",
              "text-white font-bold text-sm shadow-lg"
            )}
          >
            <span>🔥</span>
            <span>BEST PARTY THIS WEEK</span>
          </motion.div>
        </div>
        
        {/* Vibe Badge */}
        {avgRating > 0 && (
          <div className="absolute top-3 right-3">
            <VibeBadge rating={avgRating} size="md" />
          </div>
        )}
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-xl text-white mb-1">{title}</h3>
          
          <div className="flex items-center gap-3 text-white/80 text-sm mb-3">
            <span>{formattedDate} • {formattedTime}</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{venueName}</span>
            </div>
          </div>
          
          {/* Rating & Reviews */}
          <div className="flex items-center gap-4">
            {avgRating > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{avgRating.toFixed(1)}</span>
              </div>
            )}
            {reviewCount > 0 && (
              <div className="flex items-center gap-1 text-white/70">
                <MessageSquare className="w-4 h-4" />
                <span>{reviewCount} reviews</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
