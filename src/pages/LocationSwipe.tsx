import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ghost, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SwipeCard } from '@/components/SwipeCard';
import { SwipeActions } from '@/components/SwipeActions';
import { MatchModal } from '@/components/MatchModal';
import { getCurrentPosition, calculateDistance } from '@/services/geolocation';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { incrementQuestProgress } from '@/services/questProgress';
import { toast } from 'sonner';

interface SwipeProfile {
  id: string;
  displayName: string;
  age: number;
  avatarUrl: string;
  bio: string;
  musicPreferences: string[];
  distance: number;
  trustScore: number;
}

const LocationSwipe = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<SwipeProfile | null>(null);

  useEffect(() => {
    if (user) init();
  }, [user]);

  const init = async () => {
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      // Upsert own presence
      await supabase.from('location_presence').upsert(
        {
          user_id: user!.id,
          latitude,
          longitude,
          is_visible: true,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // Fetch nearby users from location_presence
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: nearby } = await supabase
        .from('location_presence')
        .select('user_id, latitude, longitude')
        .eq('is_visible', true)
        .neq('user_id', user!.id)
        .gte('last_seen', twoHoursAgo);

      if (!nearby || nearby.length === 0) {
        setProfiles([]);
        setNearbyCount(0);
        setLoading(false);
        return;
      }

      // Filter within 200m
      const withinRange = nearby.filter((u) => {
        const dist = calculateDistance(latitude, longitude, u.latitude, u.longitude);
        return dist <= 200;
      });

      // Get already swiped
      const { data: swiped } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user!.id)
        .is('event_id', null);

      const swipedIds = swiped?.map((s) => s.swiped_id) || [];
      const unswipedIds = withinRange
        .filter((u) => !swipedIds.includes(u.user_id))
        .map((u) => u.user_id);

      if (unswipedIds.length === 0) {
        setProfiles([]);
        setNearbyCount(withinRange.length);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name, age, avatar_url, bio, music_preferences')
        .in('user_id', unswipedIds);

      const mapped: SwipeProfile[] = (profileData || []).map((p) => {
        const loc = withinRange.find((u) => u.user_id === p.user_id)!;
        return {
          id: p.user_id,
          displayName: p.display_name || 'Anonymous',
          age: p.age || 25,
          avatarUrl: p.avatar_url || '/placeholder.svg',
          bio: p.bio || '',
          musicPreferences: p.music_preferences || [],
          distance: calculateDistance(latitude, longitude, loc.latitude, loc.longitude),
          trustScore: Math.floor(Math.random() * 2) + 3,
        };
      }).sort((a, b) => a.distance - b.distance);

      setProfiles(mapped);
      setNearbyCount(withinRange.length);
    } catch (error) {
      console.error('Error initializing location swipe:', error);
      toast.error('Failed to load nearby people');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
    if (!user || currentIndex >= profiles.length) return;
    const current = profiles[currentIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';

    try {
      await supabase.from('swipes').insert({
        swiper_id: user.id,
        swiped_id: current.id,
        event_id: null,
        action,
      });

      if (action === 'superlike') {
        await awardXP(user.id, XP_AWARDS.superLike, 'Sent a SuperLike');
        toast.success('+25 XP ⭐');
      }

      if (action === 'like' || action === 'superlike') {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('swiper_id', current.id)
          .eq('swiped_id', user.id)
          .is('event_id', null)
          .in('action', ['like', 'superlike'])
          .maybeSingle();

        if (theirSwipe) {
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: current.id,
            event_id: null,
          });
          await awardXP(user.id, XP_AWARDS.match, 'Got a match!');
          await incrementQuestProgress(user.id, 'match');

          // Notifications for both
          await supabase.from('notifications').insert([
            {
              user_id: user.id,
              type: 'match',
              title: 'New Match! 💜',
              body: `You matched with ${current.displayName}`,
              data: { matchedUserId: current.id },
            },
            {
              user_id: current.id,
              type: 'match',
              title: 'New Match! 💜',
              body: `You matched with ${profile?.display_name || 'someone'}`,
              data: { matchedUserId: user.id },
            },
          ]);

          setMatchedProfile(current);
          setShowMatchModal(true);
        }
      }

      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.error('Swipe error:', error);
    }
  }, [user, profiles, currentIndex, profile]);

  const handleSendWave = async () => {
    if (!matchedProfile || !user) return;
    const { data: matchData } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .or(`user1_id.eq.${matchedProfile.id},user2_id.eq.${matchedProfile.id}`)
      .is('event_id', null)
      .maybeSingle();

    if (matchData) {
      await supabase.from('waves').insert({
        sender_id: user.id,
        receiver_id: matchedProfile.id,
        match_id: matchData.id,
      });
      toast.success('Wave sent! 👋');
    }
    setShowMatchModal(false);
    setMatchedProfile(null);
  };

  const toggleGhostMode = async () => {
    const newMode = !ghostMode;
    setGhostMode(newMode);
    if (user) {
      await supabase
        .from('location_presence')
        .update({ is_visible: !newMode })
        .eq('user_id', user.id);
    }
    toast.success(newMode ? 'Ghost mode enabled 👻' : 'Ghost mode disabled');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Scanning nearby...</p>
        </div>
      </div>
    );
  }

  const hasMore = currentIndex < profiles.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Swipe Nearby
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{nearbyCount} people within 200m</span>
                <div className="pulse-dot" />
              </div>
            </div>
          </div>
          <button
            onClick={toggleGhostMode}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              ghostMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Ghost className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Swipe Area */}
      <div className="flex-1 relative px-4 py-6">
        {/* Radar pulse behind cards */}
        {hasMore && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full border border-primary/10 animate-ping opacity-20" />
            <div className="absolute w-48 h-48 rounded-full border border-primary/20 animate-ping opacity-30" style={{ animationDelay: '0.5s' }} />
          </div>
        )}

        {hasMore ? (
          <div className="relative h-[60vh] max-h-[500px]">
            <AnimatePresence>
              {profiles.slice(currentIndex, currentIndex + 3).map((p, index) => (
                <SwipeCard
                  key={p.id}
                  profile={p}
                  onSwipe={handleSwipe}
                  isTop={index === 0}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[60vh] flex flex-col items-center justify-center text-center"
          >
            <div className="text-6xl mb-4">📍</div>
            <h2 className="text-2xl font-bold mb-2">No more people nearby</h2>
            <p className="text-muted-foreground mb-6">
              Try again later or head to an event!
            </p>
            <button onClick={() => navigate('/')} className="btn-gradient px-6 py-3 rounded-xl">
              Browse Events
            </button>
          </motion.div>
        )}
      </div>

      {hasMore && (
        <div className="pb-8">
          <SwipeActions
            onPass={() => handleSwipe('left')}
            onSuperLike={() => handleSwipe('up')}
            onLike={() => handleSwipe('right')}
            disabled={!hasMore}
          />
        </div>
      )}

      <MatchModal
        isOpen={showMatchModal}
        onClose={() => { setShowMatchModal(false); setMatchedProfile(null); }}
        onSendWave={handleSendWave}
        matchedProfile={matchedProfile ? {
          displayName: matchedProfile.displayName,
          avatarUrl: matchedProfile.avatarUrl,
        } : null}
        currentUserAvatar={profile?.avatar_url || undefined}
      />
    </div>
  );
};

export default LocationSwipe;
