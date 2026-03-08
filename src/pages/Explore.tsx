import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getCurrentPosition, Coordinates, calculateDistance, formatDistance } from '@/services/geolocation';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { EventSwipeCard } from '@/components/EventSwipeCard';
import { ClubSwipeCard } from '@/components/ClubSwipeCard';
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

type ExploreMode = 'people' | 'events' | 'clubs' | 'map';

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
  { key: 'people' as const, icon: '👤', label: 'People', badge: 'GPS' },
  { key: 'events' as const, icon: '📅', label: 'Events', badge: null },
  { key: 'clubs' as const, icon: '🏢', label: 'Clubs', badge: null },
  { key: 'map' as const, icon: '🗺️', label: 'Pulse', badge: null },
];

const MODE_SUBTITLES: Record<ExploreMode, string> = {
  people: 'Swipe people nearby',
  events: 'Discover upcoming events',
  clubs: 'Find your favorite venues',
  map: 'Live pulse of the scene',
};

const MODE_PLACEHOLDERS: Record<ExploreMode, string> = {
  people: 'People swipe coming...',
  events: 'Event stack coming...',
  clubs: 'Club stack coming...',
  map: 'Map pulse coming...',
};

const Explore = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const [mode, setMode] = useState<ExploreMode>('events');
  const [ghostMode, setGhostMode] = useState(false);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [clubIndex, setClubIndex] = useState(0);
  const [swipedClubs, setSwipedClubs] = useState<Set<string>>(new Set());

  // People mode state
  const [peopleProfiles, setPeopleProfiles] = useState<SwipeProfile[]>([]);
  const [peopleIndex, setPeopleIndex] = useState(0);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<SwipeProfile | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setUserPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      })
      .catch(() => {
        toast.error('Location access needed for Explore');
      });
  }, []);

  // Reset indices when switching modes
  useEffect(() => {
    setEventIndex(0);
    setClubIndex(0);
    setPeopleIndex(0);
  }, [mode]);

  // ── People init ──
  useEffect(() => {
    if (mode === 'people' && user && userPosition) {
      initPeople();
    }
  }, [mode, user, userPosition]);

  const initPeople = async () => {
    if (!user || !userPosition) return;
    setPeopleLoading(true);
    try {
      // Upsert own presence
      await supabase.from('location_presence').upsert(
        {
          user_id: user.id,
          latitude: userPosition.latitude,
          longitude: userPosition.longitude,
          is_visible: !ghostMode,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // Fetch nearby
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: nearby } = await supabase
        .from('location_presence')
        .select('user_id, latitude, longitude')
        .eq('is_visible', true)
        .neq('user_id', user.id)
        .gte('last_seen', twoHoursAgo);

      if (!nearby || nearby.length === 0) {
        setPeopleProfiles([]);
        setNearbyCount(0);
        setPeopleLoading(false);
        return;
      }

      // Filter within 200m
      const withinRange = nearby.filter((u) => {
        const dist = calculateDistance(userPosition.latitude, userPosition.longitude, u.latitude, u.longitude);
        return dist <= 200;
      });

      // Get already swiped
      const { data: swiped } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
        .is('event_id', null);

      const swipedIds = swiped?.map((s) => s.swiped_id) || [];
      const unswipedIds = withinRange
        .filter((u) => !swipedIds.includes(u.user_id))
        .map((u) => u.user_id);

      if (unswipedIds.length === 0) {
        setPeopleProfiles([]);
        setNearbyCount(withinRange.length);
        setPeopleLoading(false);
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
          distance: calculateDistance(userPosition.latitude, userPosition.longitude, loc.latitude, loc.longitude),
          trustScore: Math.floor(Math.random() * 2) + 3,
        };
      }).sort((a, b) => a.distance - b.distance);

      setPeopleProfiles(mapped);
      setNearbyCount(withinRange.length);
      setPeopleIndex(0);
    } catch (error) {
      console.error('Error loading nearby people:', error);
      toast.error('Failed to load nearby people');
    } finally {
      setPeopleLoading(false);
    }
  };

  // ── Ghost mode toggle ──
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

  // ── People swipe handler ──
  const handlePeopleSwipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
    if (!user || peopleIndex >= peopleProfiles.length) return;
    const current = peopleProfiles[peopleIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';

    try {
      // Insert into swipes + swipe_actions in parallel
      await Promise.all([
        supabase.from('swipes').insert({
          swiper_id: user.id,
          swiped_id: current.id,
          event_id: null,
          action,
        }),
        supabase.from('swipe_actions').insert({
          user_id: user.id,
          target_type: 'person',
          target_id: current.id,
          action,
          context: 'location',
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
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: current.id,
            event_id: null,
          });
          await awardXP(user.id, XP_AWARDS.match, 'Got a match!');
          await incrementQuestProgress(user.id, 'match');

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
              body: `You matched with ${authProfile?.display_name || 'someone'}`,
              data: { matchedUserId: user.id },
            },
          ]);

          setMatchedProfile(current);
          setShowMatchModal(true);
        }
      }

      setPeopleIndex((prev) => prev + 1);
    } catch (error) {
      console.error('Swipe error:', error);
    }
  }, [user, peopleProfiles, peopleIndex, authProfile, userPosition]);

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

  // ── Events query ──
  const { data: swipeEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['explore-events', userPosition?.latitude, userPosition?.longitude, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];

      const [eventsRes, swipedRes, signalsRes] = await Promise.all([
        supabase.from('events').select('*').gte('date', today).order('date', { ascending: true }),
        supabase.from('swipe_actions').select('target_id').eq('user_id', user.id).eq('target_type', 'event'),
        supabase.from('event_signals').select('event_id'),
      ]);

      const events = eventsRes.data || [];
      const swipedIds = new Set((swipedRes.data || []).map((s) => s.target_id));
      const signalCounts: Record<string, number> = {};
      (signalsRes.data || []).forEach((s) => {
        signalCounts[s.event_id] = (signalCounts[s.event_id] || 0) + 1;
      });

      const enriched = events
        .filter((e) => !swipedIds.has(e.id))
        .map((e) => {
          let distance: number | null = null;
          if (userPosition && e.latitude && e.longitude) {
            distance = calculateDistance(userPosition.latitude, userPosition.longitude, Number(e.latitude), Number(e.longitude));
          }
          return {
            id: e.id, title: e.title, venue_name: e.venue_name || 'TBA',
            date: e.date, start_time: e.start_time, image_url: e.image_url || '/placeholder.svg',
            music_genres: e.music_genres || [], price: Number(e.price) || 0,
            description: e.description || '', distance, signalCount: signalCounts[e.id] || 0,
          };
        });

      enriched.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
      return enriched;
    },
    enabled: mode === 'events' && !!user,
  });

  // ── Clubs query ──
  const { data: swipeClubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['explore-clubs', userPosition?.latitude, userPosition?.longitude, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];

      const [eventsRes, favsRes, heatRes] = await Promise.all([
        supabase.from('events').select('*'),
        supabase.from('club_favorites').select('venue_name').eq('user_id', user.id),
        supabase.rpc('get_venue_heat', { days_back: 14 }),
      ]);

      const events = eventsRes.data || [];
      const favNames = new Set((favsRes.data || []).map((f) => f.venue_name));

      const heatMap: Record<string, { heat: number; topEventId: string | null; topEventTitle: string | null }> = {};
      ((heatRes.data || []) as Array<{ venue_name: string; total_heat: number; top_event_id: string | null; top_event_title: string | null }>).forEach((h) => {
        heatMap[h.venue_name] = { heat: Number(h.total_heat) || 0, topEventId: h.top_event_id, topEventTitle: h.top_event_title };
      });

      const venueMap = new Map<string, typeof events>();
      events.forEach((e) => {
        if (!e.venue_name) return;
        const list = venueMap.get(e.venue_name) || [];
        list.push(e);
        venueMap.set(e.venue_name, list);
      });

      const clubs: Array<{
        venue_name: string; genres: string[]; capacity: number;
        distance: number | null; image_url: string; heat: number;
        nextEvent: { title: string; id: string } | null; eventCount: number;
      }> = [];

      venueMap.forEach((venueEvents, venueName) => {
        if (favNames.has(venueName)) return;
        const genreSet = new Set<string>();
        venueEvents.forEach((e) => e.music_genres?.forEach((g) => genreSet.add(g)));
        const capacity = Math.max(...venueEvents.map((e) => e.capacity || 0), 0);
        const image_url = venueEvents.find((e) => e.image_url)?.image_url || '';
        let distance: number | null = null;
        const withCoords = venueEvents.find((e) => e.latitude && e.longitude);
        if (userPosition && withCoords) {
          distance = calculateDistance(userPosition.latitude, userPosition.longitude, Number(withCoords.latitude), Number(withCoords.longitude));
        }
        const upcoming = venueEvents.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
        const nextEvent = upcoming[0] ? { title: upcoming[0].title, id: upcoming[0].id } : null;
        const heatData = heatMap[venueName];

        clubs.push({
          venue_name: venueName, genres: Array.from(genreSet), capacity, distance, image_url,
          heat: heatData?.heat || 0, nextEvent, eventCount: venueEvents.length,
        });
      });

      clubs.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
      return clubs;
    },
    enabled: mode === 'clubs' && !!user,
  });

  const visibleClubs = swipeClubs.filter((c) => !swipedClubs.has(c.venue_name));

  // ── Event handler ──
  const handleEventSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!user || eventIndex >= swipeEvents.length) return;
    const event = swipeEvents[eventIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';
    setEventIndex((prev) => prev + 1);

    await supabase.from('swipe_actions').insert({
      user_id: user.id, target_type: 'event', target_id: event.id,
      action, context: 'event_stack',
      latitude: userPosition?.latitude ?? null, longitude: userPosition?.longitude ?? null,
    });

    if (action === 'like' || action === 'superlike') {
      await supabase.from('event_signals').insert({
        event_id: event.id, user_id: user.id, signal_type: 'going',
      });
      await awardXP(user.id, 25, 'Swiped going on event');
      toast.success("+25 XP 🔥 You're going!");
    }
  };

  // ── Club handler ──
  const handleClubSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!user || clubIndex >= visibleClubs.length) return;
    const club = visibleClubs[clubIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';

    setSwipedClubs((prev) => new Set([...prev, club.venue_name]));
    setClubIndex((prev) => prev + 1);

    if (action === 'like' || action === 'superlike') {
      await supabase.from('club_favorites').insert({
        user_id: user.id, venue_name: club.venue_name,
      });
      toast.success('❤️ Added to favorites!');
      if (action === 'superlike' && club.nextEvent) {
        setTimeout(() => navigate(`/event/${club.nextEvent!.id}`), 1000);
      }
    }
  };

  // Derived state
  const currentEvents = swipeEvents.slice(eventIndex, eventIndex + 3);
  const currentClubs = visibleClubs.slice(clubIndex, clubIndex + 3);
  const currentPeople = peopleProfiles.slice(peopleIndex, peopleIndex + 3);
  const allEventsSwiped = mode === 'events' && !eventsLoading && eventIndex >= swipeEvents.length;
  const allClubsSwiped = mode === 'clubs' && !clubsLoading && clubIndex >= visibleClubs.length;
  const hasPeopleCards = peopleIndex < peopleProfiles.length;
  const allPeopleSwiped = mode === 'people' && !peopleLoading && !hasPeopleCards;

  // Dynamic subtitle for people mode
  const currentSubtitle = mode === 'people' && nearbyCount > 0
    ? `${nearbyCount} people within 200m`
    : MODE_SUBTITLES[mode];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-xl gradient-text">Explore</span>
          </div>
          <div className="flex items-center gap-2">
            {ghostMode ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-primary" />
            )}
            <Switch
              checked={!ghostMode}
              onCheckedChange={() => toggleGhostMode()}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-8">
          <p className="text-sm text-muted-foreground">{currentSubtitle}</p>
          {mode === 'people' && nearbyCount > 0 && (
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      </header>

      {/* Mode Selector */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          {MODE_CONFIG.map((m) => (
            <motion.button
              key={m.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode(m.key)}
              className={`relative flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                mode === m.key ? 'bg-primary/15 border-primary/40' : 'bg-muted/30 border-border'
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-xs font-medium">{m.label}</span>
              {m.badge && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
                  {m.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      {mode === 'people' ? (
        <div className="px-4">
          {peopleLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Scanning nearby...</p>
            </div>
          ) : allPeopleSwiped ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center space-y-4"
            >
              <p className="text-5xl">📍</p>
              <p className="text-lg font-semibold">No one nearby right now</p>
              <p className="text-muted-foreground text-sm">Head to an event or try again later</p>
              <button
                onClick={() => setMode('events')}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
              >
                Browse Events →
              </button>
            </motion.div>
          ) : (
            <>
              <div className="relative w-full aspect-[3/4] mb-6">
                {/* Radar pulse */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 rounded-full border border-primary/10 animate-ping opacity-20" />
                  <div className="absolute w-48 h-48 rounded-full border border-primary/20 animate-ping opacity-30" style={{ animationDelay: '0.5s' }} />
                </div>
                <AnimatePresence>
                  {currentPeople.map((p, i) => (
                    <SwipeCard key={p.id} profile={p} onSwipe={handlePeopleSwipe} isTop={i === 0} />
                  ))}
                </AnimatePresence>
              </div>
              <SwipeActions
                onPass={() => handlePeopleSwipe('left')}
                onSuperLike={() => handlePeopleSwipe('up')}
                onLike={() => handlePeopleSwipe('right')}
                disabled={!hasPeopleCards}
              />
            </>
          )}
        </div>
      ) : mode === 'events' ? (
        <div className="px-4">
          {eventsLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Loading events...</p>
            </div>
          ) : allEventsSwiped ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-3xl">🎵</p>
              <p className="text-muted-foreground text-sm">You've seen all upcoming events</p>
              <button onClick={() => setMode('clubs')} className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                Explore Clubs →
              </button>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-[3/4] mb-6">
                <AnimatePresence>
                  {currentEvents.map((e, i) => (
                    <EventSwipeCard key={e.id} event={e} onSwipe={handleEventSwipe} isTop={i === 0} />
                  ))}
                </AnimatePresence>
              </div>
              <SwipeActions onPass={() => handleEventSwipe('left')} onSuperLike={() => handleEventSwipe('up')} onLike={() => handleEventSwipe('right')} disabled={eventIndex >= swipeEvents.length} />
            </>
          )}
        </div>
      ) : mode === 'clubs' ? (
        <div className="px-4">
          {clubsLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Loading clubs...</p>
            </div>
          ) : allClubsSwiped ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-3xl">🏢</p>
              <p className="text-muted-foreground text-sm">You've seen all nearby clubs</p>
              <button onClick={() => setMode('map')} className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                View Pulse Map →
              </button>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-[3/4] mb-6">
                <AnimatePresence>
                  {currentClubs.map((c, i) => (
                    <ClubSwipeCard key={c.venue_name} club={c} onSwipe={handleClubSwipe} isTop={i === 0} />
                  ))}
                </AnimatePresence>
              </div>
              <SwipeActions onPass={() => handleClubSwipe('left')} onSuperLike={() => handleClubSwipe('up')} onLike={() => handleClubSwipe('right')} disabled={clubIndex >= visibleClubs.length} />
            </>
          )}
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">{MODE_PLACEHOLDERS[mode]}</p>
        </div>
      )}

      {/* Match Modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => { setShowMatchModal(false); setMatchedProfile(null); }}
        onSendWave={handleSendWave}
        matchedProfile={matchedProfile ? {
          displayName: matchedProfile.displayName,
          avatarUrl: matchedProfile.avatarUrl,
        } : null}
        currentUserAvatar={authProfile?.avatar_url || undefined}
      />

      <BottomNav />
    </div>
  );
};

export default Explore;
