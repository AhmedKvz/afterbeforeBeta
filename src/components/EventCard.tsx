import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { HeatBadge, getHeatLevel } from './HeatBadge';
import { AvatarStack } from './AvatarStack';

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
}: EventCardProps) => {
  const navigate = useNavigate();
  const heatLevel = getHeatLevel(attendeeCount, capacity);
  
  const formattedDate = format(new Date(date), 'EEE');
  const formattedTime = startTime.slice(0, 5);
  
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
            €{price}
          </span>
        </div>
      </div>
    </div>
  );
};
