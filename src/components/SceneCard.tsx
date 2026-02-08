import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Heart, MapPin, Clock, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { toast } from 'sonner';

interface SceneCardProps {
  id: string;
  title: string;
  venueName: string;
  date: string;
  startTime: string;
  imageUrl: string;
  musicGenres: string[];
  price: number;
  heatScore: number; // 0-100
  isSaved?: boolean;
  onWishlistChange?: () => void;
}

export const SceneCard = ({
  id,
  title,
  venueName,
  date,
  startTime,
  imageUrl,
  musicGenres,
  price,
  heatScore,
  isSaved = false,
  onWishlistChange,
}: SceneCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(isSaved);
  const [animating, setAnimating] = useState(false);

  const getHeatColor = () => {
    if (heatScore >= 80) return 'text-red-500';
    if (heatScore >= 60) return 'text-orange-500';
    if (heatScore >= 40) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getHeatLabel = () => {
    if (heatScore >= 80) return '🔥 On Fire';
    if (heatScore >= 60) return '🔥 Hot';
    if (heatScore >= 40) return 'Warming Up';
    return 'Chill';
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to save events');
      return;
    }

    setAnimating(true);

    try {
      if (saved) {
        await supabase
          .from('event_wishlists')
          .delete()
          .eq('event_id', id)
          .eq('user_id', user.id);
        setSaved(false);
        toast.success('Removed from saved');
      } else {
        await supabase
          .from('event_wishlists')
          .insert({ event_id: id, user_id: user.id });
        
        // Award XP for wishlist action
        await awardXP(user.id, XP_AWARDS.superLike, 'Added event to wishlist');
        
        setSaved(true);
        toast.success('Saved! +25 XP ✨');
      }
      onWishlistChange?.();
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setTimeout(() => setAnimating(false), 300);
    }
  };

  const formattedDate = format(new Date(date), 'EEE, MMM d');
  const formattedTime = startTime?.slice(0, 5);

  return (
    <motion.div
      onClick={() => navigate(`/event/${id}`)}
      className="glass-card overflow-hidden cursor-pointer group relative"
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={imageUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Heat Badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm ${getHeatColor()}`}>
          <Flame className="w-3 h-3" />
          <span className="text-xs font-medium">{getHeatLabel()}</span>
        </div>

        {/* Wishlist Heart */}
        <motion.button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          whileTap={{ scale: 0.85 }}
          animate={animating ? { scale: [1, 1.3, 1] } : {}}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              saved ? 'fill-secondary text-secondary' : 'text-white'
            }`}
          />
        </motion.button>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-bold text-white truncate">{title}</h3>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{venueName}</span>
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formattedDate} • {formattedTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {musicGenres.slice(0, 1).map((genre) => (
            <span key={genre} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {genre}
            </span>
          ))}
          <span className="text-accent font-bold text-sm">€{price}</span>
        </div>
      </div>
    </motion.div>
  );
};
