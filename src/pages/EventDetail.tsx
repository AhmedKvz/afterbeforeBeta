import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft, Heart, Calendar, MapPin, Users,
  DollarSign, Music, Loader2, MapPinCheck, Sparkles, Flame, Bot, Star,
  Share2, Ticket, UserPlus
} from 'lucide-react';
import { GradientImg } from '@/components/GradientImg';
import { hueFromString, avatarGradient } from '@/lib/gradients';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HeatBadge, getHeatLevel } from '@/components/HeatBadge';
import { AvatarStack } from '@/components/AvatarStack';
import { GlassCard } from '@/components/GlassCard';
import { getCurrentPosition, isWithinRadius } from '@/services/geolocation';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { incrementQuestProgress } from '@/services/questProgress';
import { logTrainingEvent } from '@/services/aiTracker';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { VenueReviewsSection } from '@/components/reviews/VenueReviewsSection';
import { VenueTypeBadge } from '@/components/VenueTypeBadge';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { XPRewardCard } from '@/components/gamification/XPRewardCard';

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
  event_type: string;
  is_secret: boolean;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (location.hash === '#reviews') {
      const t = setTimeout(() => {
        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [location.hash]);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [signalCount, setSignalCount] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [crowdPrediction, setCrowdPrediction] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchEvent();
      checkCheckinStatus();
      checkWishlistStatus();
      checkSignalStatus();
      fetchSignalCount();
      fetchCrowdPrediction();
    }
  }, [id, user]);

  const fetchCrowdPrediction = async () => {
    if (!id) return;
    try {
      const { data } = await supabase.rpc('predict_crowd', { p_event_id: id });
      if (data && !(data as any).error) setCrowdPrediction(data);
    } catch (e) {
      console.error('Crowd prediction error:', e);
    }
  };

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
      if (user) await incrementQuestProgress(user.id, 'signal');
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
      const xpAmount = isSecretEvent ? 200 : XP_AWARDS.checkIn;
      await awardXP(user.id, xpAmount, isSecretEvent ? 'Secret party check-in' : 'Checked in to event');
      await incrementQuestProgress(user.id, 'check_in');
      await incrementQuestProgress(user.id, 'explore');
      
      // Log training event
      logTrainingEvent('checkin', user.id, event.id, {
        dayOfWeek: new Date().getDay(),
        genre: event.music_genres,
        venue: event.venue_name,
        hour: new Date().getHours(),
      }, 'checked_in');
      setIsCheckedIn(true);
      toast.success(`Checked in! +${xpAmount} XP 🎉`);
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

  const handleValidateInviteCode = async () => {
    if (!user || !id || !inviteCode.trim()) return;
    setCheckingCode(true);
    try {
      const { data, error } = await supabase
        .from('secret_party_invites')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .eq('event_id', id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (!data || error) {
        setInviteValid(false);
        toast.error('Invalid or expired code');
        return;
      }

      // Mark invite as used
      await supabase.from('secret_party_invites').update({
        status: 'used',
        used_at: new Date().toISOString(),
      }).eq('id', data.id);

      setInviteValid(true);
      toast.success('Code verified! ✓ You can now check in.');
    } catch (err) {
      console.error(err);
      setInviteValid(false);
      toast.error('Failed to validate code');
    } finally {
      setCheckingCode(false);
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

  const isSecretEvent = event.event_type === 'secret' || event.is_secret;
  const heatLevel = getHeatLevel(signalCount, event.capacity || 100);
  const formattedDate = format(new Date(event.date), 'EEEE, MMM d');
  const formattedTime = event.start_time?.slice(0, 5);
  const lineup: string[] = (event as any).lineup || [];

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: event.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    } catch { /* cancelled */ }
  };

  const handleBuyTicket = () => {
    if (!event.price) toast.success('Free entry — just check in at the door 🎉');
    else toast.info('Ticketing coming soon — for now, entry at the door.');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <GradientImg
        src={event.image_url}
        hue={hueFromString(event.venue_name || event.title)}
        alt={event.title}
        className="relative h-72"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <Share2 className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={handleToggleSave}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-secondary text-secondary' : ''}`} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <GlassCard className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <VenueTypeBadge type={(event as any).venue_type || 'club'} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(new Date(event.date), 'EEE, MMM d')}
                  </span>
                </div>
                <h1 className="truncate text-2xl font-black tracking-tight">{event.title}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/venue/${encodeURIComponent(event.venue_name)}`)}
                    className="text-sm text-muted-foreground transition hover:text-primary"
                  >
                    {event.venue_name}
                  </button>
                  <VenueRatingPill venueName={event.venue_name} />
                  <button
                    onClick={() => navigate(`/venue/${encodeURIComponent(event.venue_name)}`)}
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition hover:bg-primary/20"
                  >
                    Open venue →
                  </button>
                </div>
              </div>
              <HeatBadge level={heatLevel} />
            </div>
          </GlassCard>
        </div>
      </GradientImg>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* XP reward card — prominent inline gamification */}
        {user && (
          <XPRewardCard
            isCheckedIn={isCheckedIn}
            isGoing={isGoing}
            onCheckIn={!isCheckedIn ? handleCheckIn : undefined}
            onGoing={!isGoing ? toggleSignal : undefined}
            onReview={() => {
              document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        )}

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

        {/* Lineup */}
        {lineup.length > 0 && (
          <div>
            <SectionHeading label="Lineup" />
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {lineup.map((dj, i) => (
                <div key={dj + i} className="min-w-[72px] text-center">
                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: avatarGradient(hueFromString(dj)) }}
                  >
                    {dj.split(' ').map((x) => x[0]).join('').slice(0, 2)}
                  </div>
                  <div className="text-[11px] font-medium mt-1.5">{dj}</div>
                  {i === 0 && <div className="text-[9px] text-accent font-semibold">HEADLINER</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buy ticket */}
        <button
          onClick={handleBuyTicket}
          className="w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', boxShadow: '0 12px 32px -10px hsl(var(--primary) / 0.5)' }}
        >
          <Ticket className="w-[18px] h-[18px]" />
          {event.price > 0 ? `Buy ticket · €${event.price}` : 'Free entry'}
        </button>

        {/* Description */}
        <div>
          <SectionHeading label="About" />
          <p className="text-muted-foreground leading-relaxed">{event.description}</p>
        </div>

        {/* AI Crowd Prediction */}
        {crowdPrediction && <CrowdPredictionCard prediction={crowdPrediction} event={event} />}

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
            <h2 className="font-bold">Your circle going ({signalCount})</h2>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>
          <AvatarStack
            avatars={['/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg']}
            total={signalCount}
            size="lg"
          />
        </div>

        {/* Check-in education */}
        {!isCheckedIn && (
          <GlassCard className="bg-primary/10 border-primary/30">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Check in unlocks the full circle.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verified review · Circle Swipe visibility · Weekly quests · +XP & Lucky 100 entry
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Event-specific quest preview */}
        <EventQuestPreview eventId={event.id} isCheckedIn={isCheckedIn} />

        {/* Reviews */}
        <div id="reviews" className="scroll-mt-20">
          <VenueReviewsSection
            venueName={event.venue_name}
            venueType={(event as any).venue_type || 'club'}
            eventId={event.id}
            className="pb-32"
          />
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        {/* Secret event: invite code input */}
        {isSecretEvent && !isCheckedIn && !inviteValid && (
          <div className="mb-3 flex gap-2">
            <input
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteValid(null); }}
              placeholder="AB-XXXX-XXXX"
              maxLength={12}
              className={`flex-1 px-4 py-3 rounded-xl bg-muted/50 border text-center font-mono text-lg tracking-widest placeholder:text-muted-foreground/50 ${
                inviteValid === false ? 'border-destructive animate-shake' : 'border-border/50'
              }`}
            />
            <button
              onClick={handleValidateInviteCode}
              disabled={checkingCode || inviteCode.length < 5}
              className="px-6 py-3 rounded-xl btn-gradient font-semibold text-sm"
            >
              {checkingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
            </button>
          </div>
        )}

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
            disabled={checkingIn || isCheckedIn || (isSecretEvent && !inviteValid)}
            className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              isCheckedIn 
                ? 'bg-success/20 text-success border border-success/50'
                : isSecretEvent && !inviteValid
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
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

// AI Crowd Prediction Card
const CrowdPredictionCard = ({ prediction, event }: { prediction: any; event: any }) => {
  const peakHour = prediction.predicted_peak_hour || '01:00';
  const peakNum = parseInt(peakHour.split(':')[0]);
  const confidencePercent = Math.round((prediction.confidence || 0.5) * 100);
  
  const vibeEmoji: Record<string, string> = {
    packed: '🔥', energetic: '⚡', chill: '😎', intimate: '🌙'
  };
  
  // Generate crowd curve data
  const startHour = parseInt(event.start_time?.split(':')[0] || '22');
  const curveData = [];
  for (let i = 0; i < 8; i++) {
    const hour = (startHour + i) % 24;
    const label = `${hour.toString().padStart(2, '0')}:00`;
    const distFromPeak = Math.abs(hour - peakNum);
    const value = Math.max(10, prediction.predicted_attendance * Math.exp(-0.3 * distFromPeak * distFromPeak));
    curveData.push({ time: label, crowd: Math.round(value) });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-muted/30 backdrop-blur-xl border border-primary/20 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">🤖 AI Prediction</span>
        </div>
        <span className="text-xs text-muted-foreground">{confidencePercent}% conf</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold">~{prediction.predicted_attendance}</p>
          <p className="text-[10px] text-muted-foreground">👥 Expected</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{peakHour}</p>
          <p className="text-[10px] text-muted-foreground">⏰ Peak</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold capitalize">{vibeEmoji[prediction.predicted_vibe] || '🎵'} {prediction.predicted_vibe}</p>
          <p className="text-[10px] text-muted-foreground">Vibe</p>
        </div>
      </div>
      
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData}>
            <defs>
              <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Area type="monotone" dataKey="crowd" stroke="hsl(var(--primary))" fill="url(#crowdGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

// Venue average rating pill shown next to the venue link in the header
const VenueRatingPill = ({ venueName }: { venueName: string }) => {
  const { data } = useQuery({
    queryKey: ['venue-rating-pill', venueName],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_venue_review_stats', { p_venue_name: venueName });
      return data as any;
    },
    enabled: !!venueName,
  });
  const avg = Number(data?.avg_rating || 0);
  const count = Number(data?.review_count || 0);
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
      <Star className="h-2.5 w-2.5 fill-yellow-300" />
      {avg.toFixed(1)} · {count}
    </span>
  );
};

// Show the user 2 weekly quests they can unlock here
const EventQuestPreview = ({ eventId, isCheckedIn }: { eventId: string; isCheckedIn: boolean }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: quests = [] } = useQuery({
    queryKey: ['event-quest-preview', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const week = (() => {
        const now = new Date();
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
      })();
      const { data: uq } = await supabase
        .from('user_quests')
        .select('quest_id, progress, is_completed, quests(title, icon, xp_reward, target_count, quest_type)')
        .eq('user_id', user.id)
        .eq('week_start', week)
        .eq('is_completed', false)
        .limit(3);
      return uq || [];
    },
    enabled: !!user,
  });
  if (!quests.length) return null;
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Quests you can progress here
          </span>
        </div>
        <button
          onClick={() => navigate('/quests')}
          className="text-xs font-bold text-primary"
        >
          All →
        </button>
      </div>
      <div className="space-y-1.5">
        {quests.map((q: any) => (
          <div
            key={q.quest_id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span>{q.quests?.icon || '🎯'}</span>
              <div>
                <p className="text-xs font-semibold">{q.quests?.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {q.progress}/{q.quests?.target_count} · +{q.quests?.xp_reward} XP
                </p>
              </div>
            </div>
            {!isCheckedIn && (
              <span className="text-[10px] text-muted-foreground">Check in to progress</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventDetail;
