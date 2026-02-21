import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ArrowLeft, Heart, Calendar, MapPin, Users, 
  DollarSign, Music, Loader2, MapPinCheck, Sparkles, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HeatBadge, getHeatLevel } from '@/components/HeatBadge';
import { AvatarStack } from '@/components/AvatarStack';
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
  capacity: number;
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
  const [isGoing, setIsGoing] = useState(false);
  const [signalCount, setSignalCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchEvent();
      checkCheckinStatus();
      checkWishlistStatus();
      checkSignalStatus();
      fetchSignalCount();
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

  const checkSignalStatus = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('event_signals')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsGoing(!!data);
  };

  const fetchSignalCount = async () => {
    if (!id) return;
    const { count } = await supabase
      .from('event_signals')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);
    setSignalCount(count || 0);
  };

  const toggleSignal = async () => {
    if (!user || !id) return;
    if (isGoing) {
      await supabase.from('event_signals').delete()
        .eq('event_id', id).eq('user_id', user.id);
      setSignalCount(prev => Math.max(0, prev - 1));
      setIsGoing(false);
      toast.success('Signal removed');
    } else {
      await supabase.from('event_signals').insert({
        event_id: id, user_id: user.id, signal_type: 'going'
      });
      setSignalCount(prev => prev + 1);
      setIsGoing(true);
      toast.success('+25 XP 🔥 You\'re going!');
    }
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
        toast.error('You must be at the event location to check in!');
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
      await awardXP(user.id, XP_AWARDS.checkIn, 'Checked in to event');
      setIsCheckedIn(true);
      toast.success('Checked in! +50 XP 🎉');
    } catch (error: any) {
      if (error.code === 1) {
        toast.error('Please enable location access to check in');
      } else {
        console.error('Check-in error:', error);
        toast.error('Failed to check in. Please try again.');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !id) return;
    if (isSaved) {
      await supabase.from('event_wishlists').delete()
        .eq('event_id', id).eq('user_id', user.id);
      setIsSaved(false);
      toast.success('Removed from saved');
    } else {
      await supabase.from('event_wishlists')
        .insert({ event_id: id, user_id: user.id });
      setIsSaved(true);
      toast.success('Saved to wishlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  const heatLevel = getHeatLevel(signalCount, event.capacity || 100);
  const formattedDate = format(new Date(event.date), 'EEEE, MMM d');
  const formattedTime = event.start_time?.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-72">
        <img
          src={event.image_url || '/placeholder.svg'}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleToggleSave}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-secondary text-secondary' : ''}`} />
          </button>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <GlassCard className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{event.title}</h1>
                <p className="text-muted-foreground text-sm">{event.venue_name}</p>
              </div>
              <HeatBadge level={heatLevel} />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Info Pills */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{formattedDate} • {formattedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{event.venue_name}</span>
          </div>
          <motion.div
            key={signalCount}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 text-sm"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-medium">{signalCount} going</span>
          </motion.div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-accent font-bold">€{event.price}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="font-bold mb-2">About</h2>
          <p className="text-muted-foreground">{event.description}</p>
        </div>

        {/* Music Genres */}
        <div className="flex items-center gap-2 flex-wrap">
          <Music className="w-4 h-4 text-primary" />
          {event.music_genres?.map((genre) => (
            <span key={genre} className="genre-chip selected">
              {genre}
            </span>
          ))}
        </div>

        {/* Who's Going */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Who's Going ({signalCount})</h2>
            <button className="text-sm text-primary">See all →</button>
          </div>
          <AvatarStack
            avatars={['/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg']}
            total={signalCount}
            size="lg"
          />
        </div>

        {/* Check-in Notice */}
        {!isCheckedIn && (
          <GlassCard className="bg-primary/10 border-primary/30">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Check in when you arrive to unlock Circle Swipe!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You must be at the event location to check in
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* CTA Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-3">
          {/* I'm Going Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleSignal}
            className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              isGoing
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                : 'border border-orange-500/50 text-orange-400'
            }`}
          >
            <Flame className="w-5 h-5" />
            {isGoing ? 'Going ✓' : "I'm Going"}
          </motion.button>

          <button
            onClick={handleCheckIn}
            disabled={checkingIn || isCheckedIn}
            className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              isCheckedIn 
                ? 'bg-success/20 text-success border border-success/50'
                : 'btn-gradient'
            }`}
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
                Check In
              </>
            )}
          </button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => isCheckedIn && navigate(`/circle-swipe/${id}`)}
            disabled={!isCheckedIn}
            className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              isCheckedIn 
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            💜 Circle Swipe
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
