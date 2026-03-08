import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getCurrentPosition, Coordinates, calculateDistance } from '@/services/geolocation';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { SwipeCard } from '@/components/SwipeCard';
import { SwipeActions } from '@/components/SwipeActions';
import { MatchModal } from '@/components/MatchModal';
import CityPulse from '@/components/CityPulse';
import VenueGate from '@/components/VenueGate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { incrementQuestProgress } from '@/services/questProgress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ExploreMode = 'pulse' | 'active';

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

const MODE_CONFIG = [
  { key: 'pulse' as const, icon: '🗺️', label: 'Pulse', desc: 'See the city live' },
  { key: 'active' as const, icon: '⚡', label: 'Active', desc: '5 free / day' },
];

const Explore = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const [mode, setMode] = useState<ExploreMode>('pulse');
  const [ghostMode, setGhostMode] = useState(false);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);

  // Pulse state
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [gateCleared, setGateCleared] = useState(false);
  const [venueProfiles, setVenueProfiles] = useState<SwipeProfile[]>([]);
  const [venueSwipeIndex, setVenueSwipeIndex] = useState(0);
  const [venueLoading, setVenueLoading] = useState(false);

  // Active state
  const [activeProfiles, setActiveProfiles] = useState<SwipeProfile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeLoading, setActiveLoading] = useState(false);
  const [swipesUsed, setSwipesUsed] = useState(0);

  // Match state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<SwipeProfile | null>(null);

  // Get position
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setUserPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
      .catch(() => toast.error('Location access needed for Explore'));
  }, []);

  // Ghost toggle
  const toggleGhostMode = async () => {
    const newMode = !ghostMode;
    setGhostMode(newMode);
    if (user) {
      await supabase.from('location_presence').update({ is_visible: !newMode }).eq('user_id', user.id);
    }
    toast.success(newMode ? 'Ghost mode enabled 👻' : 'Ghost mode disabled');
  };

  // ── Pulse: CityPulse data ──
  const { data: pulseVenues = [] } = useQuery({
    queryKey: ['pulse-venues', userPosition?.latitude, userPosition?.longitude],
    queryFn: async () => {
      if (!userPosition) return [];
      const { data: events } = await supabase
        .from('events')
        .select('venue_name, latitude, longitude')
        .not('latitude', 'is', null);

      const venueMap = new Map<string, { venue_name: string; latitude: number; longitude: number; peopleCount: number }>();
      (events || []).forEach((e) => {
        if (!e.venue_name || venueMap.has(e.venue_name)) return;
        venueMap.set(e.venue_name, {
          venue_name: e.venue_name,
          latitude: Number(e.latitude),
          longitude: Number(e.longitude),
          peopleCount: 0,
        });
      });

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: presences } = await supabase
        .from('location_presence')
        .select('latitude, longitude')
        .eq('is_visible', true)
        .gte('last_seen', twoHoursAgo);

      venueMap.forEach((v) => {
        v.peopleCount = (presences || []).filter(
          (p) => calculateDistance(v.latitude, v.longitude, p.latitude, p.longitude) <= 150
        ).length;
      });

      return Array.from(venueMap.values());
    },
    enabled: mode === 'pulse' && !!userPosition,
    refetchInterval: 30000,
  });

  // ── Pulse: Load venue profiles ──
  const loadVenueProfiles = useCallback(async (venue: any) => {
    if (!user) return;
    setVenueLoading(true);
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: nearby } = await supabase
        .from('location_presence')
        .select('user_id, latitude, longitude')
        .eq('is_visible', true)
        .neq('user_id', user.id)
        .gte('last_seen', twoHoursAgo);

      const atVenue = (nearby || []).filter(
        (u) => calculateDistance(venue.latitude, venue.longitude, u.latitude, u.longitude) <= 150
      );

      const { data: swiped } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
        .is('event_id', null);

      const swipedIds = new Set(swiped?.map((s) => s.swiped_id) || []);
      const unswiped = atVenue.filter((u) => !swipedIds.has(u.user_id));

      if (!unswiped.length) {
        setVenueProfiles([]);
        setVenueLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, age, avatar_url, bio, music_preferences')
        .in('user_id', unswiped.map((u) => u.user_id));

      setVenueProfiles(
        (profiles || []).map((p) => ({
          id: p.user_id,
          displayName: p.display_name || 'Anonymous',
          age: p.age || 25,
          avatarUrl: p.avatar_url || '/placeholder.svg',
          bio: p.bio || '',
          musicPreferences: p.music_preferences || [],
          distance: 0,
          trustScore: 4,
        }))
      );
      setVenueSwipeIndex(0);
    } catch (err) {
      console.error('Error loading venue profiles:', err);
    } finally {
      setVenueLoading(false);
    }
  }, [user]);

  // ── Active: Load data ──
  useEffect(() => {
    if (mode === 'active' && user) loadActiveData();
  }, [mode, user]);

  const loadActiveData = async () => {
    if (!user) return;
    setActiveLoading(true);
    try {
      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const { data: limitData } = await supabase
        .from('daily_swipe_limits')
        .select('swipe_count')
        .eq('user_id', user.id)
        .eq('swipe_date', today)
        .maybeSingle();
      setSwipesUsed(limitData?.swipe_count || 0);

      // Fetch active users (last 4 hours)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data: active } = await supabase
        .from('location_presence')
        .select('user_id')
        .eq('is_visible', true)
        .neq('user_id', user.id)
        .gte('last_seen', fourHoursAgo);

      if (!active?.length) {
        setActiveProfiles([]);
        setActiveLoading(false);
        return;
      }

      // Exclude swiped
      const { data: swiped } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
        .is('event_id', null);

      const swipedIds = new Set(swiped?.map((s) => s.swiped_id) || []);
      const unswipedIds = active.filter((u) => !swipedIds.has(u.user_id)).map((u) => u.user_id);

      if (!unswipedIds.length) {
        setActiveProfiles([]);
        setActiveLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, age, avatar_url, bio, music_preferences')
        .in('user_id', unswipedIds);

      setActiveProfiles(
        (profiles || []).map((p) => ({
          id: p.user_id,
          displayName: p.display_name || 'Anonymous',
          age: p.age || 25,
          avatarUrl: p.avatar_url || '/placeholder.svg',
          bio: p.bio || '',
          musicPreferences: p.music_preferences || [],
          distance: 0, // hidden in Active mode
          trustScore: 4,
        }))
      );
      setActiveIndex(0);
    } catch (err) {
      console.error('Error loading active data:', err);
    } finally {
      setActiveLoading(false);
    }
  };

  // ── Shared match logic ──
  const handleSwipe = useCallback(
    async (
      direction: 'left' | 'right' | 'up',
      profiles: SwipeProfile[],
      index: number,
      setIndex: React.Dispatch<React.SetStateAction<number>>,
      context: string,
      onAfter?: () => void
    ) => {
      if (!user || index >= profiles.length) return;
      const current = profiles[index];
      const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';

      try {
        await Promise.all([
          supabase.from('swipes').insert({ swiper_id: user.id, swiped_id: current.id, event_id: null, action }),
          supabase.from('swipe_actions').insert({
            user_id: user.id, target_type: 'person', target_id: current.id,
            action, context,
            latitude: userPosition?.latitude ?? null,
            longitude: userPosition?.longitude ?? null,
          }),
        ]);

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
            await supabase.from('matches').insert({ user1_id: user.id, user2_id: current.id, event_id: null });
            await awardXP(user.id, XP_AWARDS.match, 'Got a match!');
            await incrementQuestProgress(user.id, 'match');
            await supabase.from('notifications').insert([
              { user_id: user.id, type: 'match', title: 'New Match! 💜', body: `You matched with ${current.displayName}`, data: { matchedUserId: current.id } },
              { user_id: current.id, type: 'match', title: 'New Match! 💜', body: `You matched with ${authProfile?.display_name || 'someone'}`, data: { matchedUserId: user.id } },
            ]);
            setMatchedProfile(current);
            setShowMatchModal(true);
          }
        }

        setIndex((prev) => prev + 1);
        onAfter?.();
      } catch (err) {
        console.error('Swipe error:', err);
      }
    },
    [user, authProfile, userPosition]
  );

  // ── Venue swipe ──
  const handleVenueSwipe = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      handleSwipe(direction, venueProfiles, venueSwipeIndex, setVenueSwipeIndex, 'venue_pulse');
    },
    [handleSwipe, venueProfiles, venueSwipeIndex]
  );

  // ── Active swipe ──
  const handleActiveSwipe = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (swipesUsed >= 5) return;
      handleSwipe(direction, activeProfiles, activeIndex, setActiveIndex, 'active_mode', async () => {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('daily_swipe_limits').upsert(
          { user_id: user.id, swipe_date: today, swipe_count: swipesUsed + 1 },
          { onConflict: 'user_id,swipe_date' }
        );
        setSwipesUsed((prev) => prev + 1);
      });
    },
    [handleSwipe, activeProfiles, activeIndex, swipesUsed, user]
  );

  // ── Wave handler ──
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
      await supabase.from('waves').insert({ sender_id: user.id, receiver_id: matchedProfile.id, match_id: matchData.id });
      toast.success('Wave sent! 👋');
    }
    setShowMatchModal(false);
    setMatchedProfile(null);
  };

  // ── Midnight countdown ──
  const getTimeToMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const handleUpgradeInterest = async () => {
    if (!user) return;
    await supabase.from('premium_interest').insert({ user_id: user.id, feature: 'unlimited_active_swipes' });
    toast.success('🔔 We'll notify you when Premium launches!');
  };

  // ── Back handler ──
  const handleBack = () => {
    if (mode === 'pulse' && gateCleared) {
      setSelectedVenue(null);
      setGateCleared(false);
      setVenueProfiles([]);
    } else if (mode === 'pulse' && selectedVenue) {
      setSelectedVenue(null);
    } else {
      navigate(-1);
    }
  };

  // ── Derived ──
  const venueCards = venueProfiles.slice(venueSwipeIndex, venueSwipeIndex + 3);
  const activeCards = activeProfiles.slice(activeIndex, activeIndex + 3);
  const hasVenueCards = venueSwipeIndex < venueProfiles.length;
  const hasActiveCards = activeIndex < activeProfiles.length;
  const limitReached = swipesUsed >= 5;

  // ── Subtitle ──
  const getSubtitle = () => {
    if (mode === 'pulse') {
      if (selectedVenue && gateCleared) {
        const count = venueProfiles.length;
        return `📍 ${selectedVenue.venue_name} · ${count} people`;
      }
      return `🗺️ ${pulseVenues.length} venues in Belgrade`;
    }
    return `⚡ ${activeProfiles.length} people online now`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-xl gradient-text">Explore</span>
          </div>
          <div className="flex items-center gap-2">
            {ghostMode ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
            <Switch checked={!ghostMode} onCheckedChange={toggleGhostMode} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-8">{getSubtitle()}</p>
      </header>

      {/* Mode Selector */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {MODE_CONFIG.map((m) => (
            <motion.button
              key={m.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setMode(m.key);
                if (m.key === 'pulse') {
                  setSelectedVenue(null);
                  setGateCleared(false);
                }
              }}
              className={cn(
                'flex flex-col items-center gap-1 py-3 rounded-xl border transition-all',
                mode === m.key ? 'bg-primary/15 border-primary/40' : 'bg-muted/30 border-border'
              )}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-xs font-medium">{m.label}</span>
              <span className="text-[10px] text-muted-foreground">{m.desc}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      {mode === 'pulse' ? (
        <>
          {/* Map view */}
          {!selectedVenue && userPosition && (
            <div className="px-4" style={{ height: 'calc(100vh - 280px)' }}>
              <CityPulse
                userPosition={userPosition}
                venues={pulseVenues}
                onSelectVenue={setSelectedVenue}
              />
            </div>
          )}

          {!selectedVenue && !userPosition && (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Waiting for location...</p>
            </div>
          )}

          {/* Gate overlay */}
          {selectedVenue && !gateCleared && userPosition && user && (
            <VenueGate
              venue={selectedVenue}
              userPosition={userPosition}
              userId={user.id}
              onEnterFree={() => {
                setGateCleared(true);
                loadVenueProfiles(selectedVenue);
              }}
              onEnterPaid={() => {
                setGateCleared(true);
                loadVenueProfiles(selectedVenue);
              }}
              onClose={() => setSelectedVenue(null)}
            />
          )}

          {/* Venue swipe */}
          {selectedVenue && gateCleared && (
            <div className="px-4">
              {venueLoading ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-sm animate-pulse">Loading people...</p>
                </div>
              ) : !hasVenueCards ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-4">
                  <p className="text-5xl">🌙</p>
                  <p className="text-lg font-semibold">No one at {selectedVenue.venue_name} right now</p>
                  <button
                    onClick={() => { setSelectedVenue(null); setGateCleared(false); }}
                    className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                  >
                    ← Back to Map
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="relative w-full aspect-[3/4] mb-6">
                    <AnimatePresence>
                      {venueCards.map((p, i) => (
                        <SwipeCard key={p.id} profile={p} onSwipe={handleVenueSwipe} isTop={i === 0} />
                      ))}
                    </AnimatePresence>
                  </div>
                  <SwipeActions
                    onPass={() => handleVenueSwipe('left')}
                    onSuperLike={() => handleVenueSwipe('up')}
                    onLike={() => handleVenueSwipe('right')}
                    disabled={!hasVenueCards}
                  />
                </>
              )}
            </div>
          )}
        </>
      ) : (
        /* Active Mode */
        <div className="px-4">
          {activeLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Finding active people...</p>
            </div>
          ) : limitReached ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-4">
              <p className="text-5xl">⚡</p>
              <p className="text-lg font-semibold">You've used all 5 free swipes</p>
              <p className="text-sm text-muted-foreground">Resets in {getTimeToMidnight()}</p>
              <button
                onClick={handleUpgradeInterest}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-medium"
              >
                Upgrade for Unlimited →
              </button>
            </motion.div>
          ) : !hasActiveCards ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-4">
              <p className="text-5xl">🌙</p>
              <p className="text-lg font-semibold">No one is active right now</p>
              <p className="text-sm text-muted-foreground">The scene wakes up after dark</p>
              <button
                onClick={() => setMode('pulse')}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
              >
                Switch to Pulse →
              </button>
            </motion.div>
          ) : (
            <>
              {/* Swipe counter */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">⚡ {5 - swipesUsed}/5 free today</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn('w-2 h-2 rounded-full', i < swipesUsed ? 'bg-primary' : 'bg-muted')} />
                  ))}
                </div>
              </div>

              <div className="relative w-full aspect-[3/4] mb-6">
                <AnimatePresence>
                  {activeCards.map((p, i) => (
                    <SwipeCard key={p.id} profile={p} onSwipe={handleActiveSwipe} isTop={i === 0} />
                  ))}
                </AnimatePresence>
              </div>
              <SwipeActions
                onPass={() => handleActiveSwipe('left')}
                onSuperLike={() => handleActiveSwipe('up')}
                onLike={() => handleActiveSwipe('right')}
                disabled={!hasActiveCards || limitReached}
              />
            </>
          )}
        </div>
      )}

      {/* Match Modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => { setShowMatchModal(false); setMatchedProfile(null); }}
        onSendWave={handleSendWave}
        matchedProfile={matchedProfile ? { displayName: matchedProfile.displayName, avatarUrl: matchedProfile.avatarUrl } : null}
        currentUserAvatar={authProfile?.avatar_url || undefined}
      />

      <BottomNav />
    </div>
  );
};

export default Explore;
