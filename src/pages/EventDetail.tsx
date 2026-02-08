import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ArrowLeft, Heart, Calendar, MapPin, ExternalLink, 
  Loader2, MapPinCheck, Clock, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { getCurrentPosition, isWithinRadius } from '@/services/geolocation';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string | null;
  venue_name: string;
  address: string;
  latitude: number;
  longitude: number;
  image_url: string;
  music_genres: string[];
  price: number;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [heatScore, setHeatScore] = useState(0);

  useEffect(() => {
    if (id) {
      fetchEvent();
      checkCheckinStatus();
      checkWishlistStatus();
      fetchHeatScore();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Event not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchHeatScore = async () => {
    if (!id) return;
    
    const { count: wishlistCount } = await supabase
      .from('event_wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);
    
    const { count: checkinCount } = await supabase
      .from('event_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);
    
    const score = Math.min(100, ((wishlistCount || 0) * 5 + (checkinCount || 0) * 15) + 20);
    setHeatScore(score);
  };

  const checkCheckinStatus = async () => {
    if (!user || !id) return;
    
    const { data } = await supabase
      .from('event_checkins')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsCheckedIn(!!data);
  };

  const checkWishlistStatus = async () => {
    if (!user || !id) return;
    
    const { data } = await supabase
      .from('event_wishlists')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsSaved(!!data);
  };

  const handleCheckIn = async () => {
    if (!user || !event) return;
    
    setCheckingIn(true);
    
    try {
      const position = await getCurrentPosition();
      const userCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      
      const eventCoords = {
        latitude: Number(event.latitude),
        longitude: Number(event.longitude),
      };
      
      const isNear = isWithinRadius(userCoords, eventCoords, 100);
      
      if (!isNear) {
        toast.error('You must be at the venue to check in!');
        setCheckingIn(false);
        return;
      }
      
      const { error: checkinError } = await supabase
        .from('event_checkins')
        .insert({
          event_id: event.id,
          user_id: user.id,
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        });
      
      if (checkinError) throw checkinError;
      
      await supabase
        .from('active_users')
        .upsert({
          event_id: event.id,
          user_id: user.id,
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          last_seen: new Date().toISOString(),
        });
      
      await awardXP(user.id, XP_AWARDS.checkIn, 'GPS Check-in');
      
      setIsCheckedIn(true);
      toast.success('Checked in! +50 XP 🎉');
    } catch (error: any) {
      if (error.code === 1) {
        toast.error('Please enable location access');
      } else {
        console.error('Check-in error:', error);
        toast.error('Failed to check in');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !id) return;
    
    if (isSaved) {
      await supabase
        .from('event_wishlists')
        .delete()
        .eq('event_id', id)
        .eq('user_id', user.id);
      setIsSaved(false);
      toast.success('Removed from saved');
    } else {
      await supabase
        .from('event_wishlists')
        .insert({ event_id: id, user_id: user.id });
      
      await awardXP(user.id, XP_AWARDS.superLike, 'Saved event');
      
      setIsSaved(true);
      toast.success('Saved! +25 XP ✨');
    }
    fetchHeatScore();
  };

  const getHeatLabel = () => {
    if (heatScore >= 80) return '🔥 On Fire';
    if (heatScore >= 60) return '🔥 Hot';
    if (heatScore >= 40) return 'Warming Up';
    return 'Chill';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  const formattedDate = format(new Date(event.date), 'EEEE, MMM d');
  const formattedTime = event.start_time?.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Image */}
      <div className="relative h-64">
        <img
          src={event.image_url || '/placeholder.svg'}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <motion.button
            onClick={handleToggleSave}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            whileTap={{ scale: 0.85 }}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-secondary text-secondary' : ''}`} />
          </motion.button>
        </div>
        
        {/* Title */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">{event.venue_name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Quick Info */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{formattedDate}</p>
                <p className="text-sm text-muted-foreground">{formattedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium">{getHeatLabel()}</p>
                <p className="text-sm text-muted-foreground">Heat level</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Map Pin */}
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{event.venue_name}</p>
              <p className="text-sm text-muted-foreground">{event.address}</p>
            </div>
            <button 
              onClick={() => window.open(`https://maps.google.com/?q=${event.latitude},${event.longitude}`, '_blank')}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>

        {/* Description */}
        {event.description && (
          <div>
            <h3 className="font-bold mb-2">About</h3>
            <p className="text-muted-foreground text-sm">{event.description}</p>
          </div>
        )}

        {/* Music Tags */}
        {event.music_genres?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.music_genres.map((genre) => (
              <span key={genre} className="genre-chip selected text-xs">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* External Link */}
        <button
          onClick={() => toast.info('Ticket links coming soon!')}
          className="w-full py-3 rounded-xl border border-border flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Get Tickets
        </button>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <motion.button
          onClick={handleCheckIn}
          disabled={checkingIn || isCheckedIn}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
            isCheckedIn 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'btn-gradient'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {checkingIn ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isCheckedIn ? (
            <>
              <MapPinCheck className="w-5 h-5" />
              Checked In
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              Check In at Venue
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default EventDetail;
