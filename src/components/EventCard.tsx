import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { HeatBadge, getHeatLevel } from './HeatBadge';
import { AvatarStack } from './AvatarStack';

const VENUE_TYPE_BADGES: Record<string, { label: string; emoji: string; color: string }> = {
  club: { label: 'Club', emoji: '🎵', color: 'bg-purple-500/20 text-purple-300' },
  splav: { label: 'Splav', emoji: '🚢', color: 'bg-blue-500/20 text-blue-300' },
  cafe_bar: { label: 'Cafe', emoji: '☕', color: 'bg-amber-500/20 text-amber-300' },
  afterplace: { label: 'After', emoji: '🌙', color: 'bg-slate-500/20 text-slate-300' },
  gallery: { label: 'Gallery', emoji: '🎨', color: 'bg-pink-500/20 text-pink-300' },
  popup: { label: 'Pop-up', emoji: '⚡', color: 'bg-yellow-500/20 text-yellow-300' },
};

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  startTime: string;
  venueName: string;
  imageUrl: string;
  musicGenres: string[];
  price: number;
  capacity: number;
  attendeeCount: number;
  attendeeAvatars?: string[];
  featured?: boolean;
  signalCount?: number;
  venueType?: string;
}

export const EventCard = ({
  id,
  title,
  date,
  startTime,
  venueName,
  imageUrl,
  musicGenres,
  price,
  capacity,
  attendeeCount,
  attendeeAvatars = [],
  featured = false,
  signalCount = 0,
  venueType,
}: EventCardProps) => {
  const navigate = useNavigate();
  const heatLevel = getHeatLevel(attendeeCount, capacity);
  
  const formattedDate = format(new Date(date), 'EEE');
  const formattedTime = startTime.slice(0, 5);
  const badge = venueType ? VENUE_TYPE_BADGES[venueType] : null;
  
  return (
    <div
      onClick={() => navigate(`/event/${id}`)}
      className={`glass-card overflow-hidden cursor-pointer group ${
        featured ? 'col-span-full' : ''
      }`}
    >
      {/* Image Section */}
      <div className={`relative ${featured ? 'h-48' : 'h-32'} overflow-hidden`}>
        <img
          src={imageUrl || '/placeholder.svg'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Heat Badge */}
        <div className="absolute top-3 right-3">
          <HeatBadge level={heatLevel} />
        </div>
        
        {/* Content on Image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-lg text-white truncate">{title}</h3>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>{formattedDate} {formattedTime}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{venueName}</span>
            </div>
            {badge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
                {badge.emoji} {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Section */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AvatarStack 
            avatars={attendeeAvatars.length ? attendeeAvatars : ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg']} 
            total={attendeeCount}
            size="sm"
          />
          <span className="text-sm text-muted-foreground">
            {signalCount > 0 ? `🔥 ${signalCount}` : `${attendeeCount}`} going
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {musicGenres.slice(0, 2).map((genre) => (
            <span key={genre} className="text-xs text-muted-foreground">
              {genre}
            </span>
          ))}
          <span className="text-accent font-bold">
            {price > 0 ? `€${price}` : 'Free'}
          </span>
        </div>
      </div>
    </div>
  );
};