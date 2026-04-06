import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ghost, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SwipeCard } from '@/components/SwipeCard';
import { SwipeActions } from '@/components/SwipeActions';
import { MatchModal } from '@/components/MatchModal';
import { getCurrentPosition, calculateDistance } from '@/services/geolocation';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { incrementQuestProgress } from '@/services/questProgress';
import { logTrainingEvent } from '@/services/aiTracker';
import { toast } from 'sonner';

interface ActiveUser {
  user_id: string;
  latitude: number;
  longitude: number;
  profiles: {
    display_name: string;
    age: number;
    avatar_url: string;
    bio: string;
    music_preferences: string[];
  };
}

interface SwipeProfile {
  id: string;
  displayName: string;
  age: number;
  avatarUrl: string;
  bio: string;
  musicPreferences: string[];
  distance: number;
  trustScore: number;
  matchScore?: number;
}

const CircleSwipe = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [event, setEvent] = useState<any>(null);
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Match modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<SwipeProfile | null>(null);

  useEffect(() => {
    if (eventId && user) {
      init();
    }
  }, [eventId, user]);

  const init = async () => {
    try {
      // Get user position
      const position = await getCurrentPosition();
      setUserPosition({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      
      // Fetch event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      setEvent(eventData);
      
      // Update user's active status
      await supabase
        .from('active_users')
        .upsert({
          event_id: eventId,
          user_id: user!.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          last_seen: new Date().toISOString(),
          is_visible: !ghostMode,
        });
      
      // Fetch active users
      await fetchActiveUsers(position.coords);
    } catch (error) {
      console.error('Error initializing:', error);
      toast.error('Failed to load. Please try again.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveUsers = async (userCoords: { latitude: number; longitude: number }) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('active_users')
      .select(`
        user_id,
        latitude,
        longitude,
        profiles (
          display_name,
          age,
          avatar_url,
          bio,
          music_preferences
        )
      `)
      .eq('event_id', eventId)
      .eq('is_visible', true)
      .neq('user_id', user!.id)
      .gte('last_seen', fiveMinutesAgo) as { data: ActiveUser[] | null };
    
    if (!data) {
      setProfiles([]);
      setActiveUserCount(0);
      return;
    }
    
    // Get already swiped users
    const { data: swipedData } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', user!.id)
      .eq('event_id', eventId);
    
    const swipedIds = swipedData?.map(s => s.swiped_id) || [];
    
    // Filter out already swiped users and calculate distances
    const availableProfiles: SwipeProfile[] = data
      .filter(u => !swipedIds.includes(u.user_id) && u.profiles)
      .map(u => ({
        id: u.user_id,
        displayName: u.profiles.display_name || 'Anonymous',
        age: u.profiles.age || 25,
        avatarUrl: u.profiles.avatar_url || '/placeholder.svg',
        bio: u.profiles.bio || '',
        musicPreferences: u.profiles.music_preferences || [],
        distance: calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          Number(u.latitude),
          Number(u.longitude)
        ),
        trustScore: Math.floor(Math.random() * 2) + 3,
      }));

    // Compute AI match scores for each profile
    const scoredProfiles = await Promise.all(
      availableProfiles.map(async (p) => {
        try {
          const { data: scoreData } = await supabase.rpc('compute_match_score', {
            p_user_id: user!.id,
            p_target_id: p.id,
            p_event_id: eventId,
          });
          return { ...p, matchScore: scoreData?.match_score ?? undefined };
        } catch {
          return p;
        }
      })
    );

    // Sort by match score (best first), fallback to distance
    scoredProfiles.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    
    setProfiles(scoredProfiles);
    setActiveUserCount(data.length);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
    if (!user || profiles.length === 0 || currentIndex >= profiles.length) return;
    
    const currentProfile = profiles[currentIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';
    
    try {
      // Save swipe with predicted score
      await supabase.from('swipes').insert({
        swiper_id: user.id,
        swiped_id: currentProfile.id,
        event_id: eventId,
        action,
        predicted_score: currentProfile.matchScore ?? null,
      });

      // Log training event
      logTrainingEvent('swipe', user.id, currentProfile.id, {
        matchScore: currentProfile.matchScore,
        distance: currentProfile.distance,
        musicOverlap: currentProfile.musicPreferences,
        eventId,
      }, action);
      
      // Award XP for superlike
      if (action === 'superlike') {
        await awardXP(user.id, XP_AWARDS.superLike, 'Sent a SuperLike');
        toast.success('+25 XP ⭐');
      }
      
      // Check for match
      if (action === 'like' || action === 'superlike') {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('swiper_id', currentProfile.id)
          .eq('swiped_id', user.id)
          .eq('event_id', eventId)
          .in('action', ['like', 'superlike'])
          .maybeSingle();
        
        if (theirSwipe) {
          // It's a match!
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: currentProfile.id,
            event_id: eventId,
          });
          
          // Award XP
          await awardXP(user.id, XP_AWARDS.match, 'Got a match!');
          await incrementQuestProgress(user.id, 'match');
          
          // Update total matches
          await supabase
            .from('profiles')
            .update({ total_matches: (profile?.total_matches || 0) + 1 })
            .eq('user_id', user.id);
          
          // Show match modal
          setMatchedProfile(currentProfile);
          setShowMatchModal(true);
        }
      }
      
      // Move to next profile
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Swipe error:', error);
    }
  }, [user, profiles, currentIndex, eventId, profile]);

  const handleSendWave = async () => {
    if (!matchedProfile || !user) return;
    
    // Get the match ID
    const { data: matchData } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .or(`user1_id.eq.${matchedProfile.id},user2_id.eq.${matchedProfile.id}`)
      .eq('event_id', eventId)
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
    
    if (user && eventId) {
      await supabase
        .from('active_users')
        .update({ is_visible: !newMode })
        .eq('user_id', user.id)
        .eq('event_id', eventId);
    }
    
    toast.success(newMode ? 'Ghost mode enabled 👻' : 'Ghost mode disabled');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Finding people nearby...</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

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
              <h1 className="font-bold truncate">🎵 {event?.title || 'Event'}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{activeUserCount} people here now</span>
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
        {hasMoreProfiles ? (
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
            <div className="text-6xl mb-4">🌙</div>
            <h2 className="text-2xl font-bold mb-2">No more people nearby</h2>
            <p className="text-muted-foreground mb-6">
              Check back later or explore other events
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-gradient px-6 py-3 rounded-xl"
            >
              Browse Events
            </button>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      {hasMoreProfiles && (
        <div className="pb-8">
          <SwipeActions
            onPass={() => handleSwipe('left')}
            onSuperLike={() => handleSwipe('up')}
            onLike={() => handleSwipe('right')}
            disabled={!hasMoreProfiles}
          />
        </div>
      )}

      {/* Match Modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => {
          setShowMatchModal(false);
          setMatchedProfile(null);
        }}
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

export default CircleSwipe;
