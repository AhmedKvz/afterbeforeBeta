import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getCurrentPosition, Coordinates, calculateDistance } from '@/services/geolocation';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { EventSwipeCard } from '@/components/EventSwipeCard';
import { SwipeActions } from '@/components/SwipeActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP } from '@/services/gamification';
import { toast } from 'sonner';

type ExploreMode = 'people' | 'events' | 'clubs' | 'map';

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
  const { user } = useAuth();
  const [mode, setMode] = useState<ExploreMode>('events');
  const [ghostMode, setGhostMode] = useState(false);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [eventIndex, setEventIndex] = useState(0);

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

  // Reset index when switching modes
  useEffect(() => {
    setEventIndex(0);
  }, [mode]);

  const { data: swipeEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['explore-events', userPosition?.latitude, userPosition?.longitude, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const today = new Date().toISOString().split('T')[0];

      // Fetch events, user's swipe actions, and signal counts in parallel
      const [eventsRes, swipedRes, signalsRes] = await Promise.all([
        supabase.from('events').select('*').gte('date', today).order('date', { ascending: true }),
        supabase.from('swipe_actions').select('target_id').eq('user_id', user.id).eq('target_type', 'event'),
        supabase.from('event_signals').select('event_id'),
      ]);

      const events = eventsRes.data || [];
      const swipedIds = new Set((swipedRes.data || []).map((s) => s.target_id));

      // Count signals per event
      const signalCounts: Record<string, number> = {};
      (signalsRes.data || []).forEach((s) => {
        signalCounts[s.event_id] = (signalCounts[s.event_id] || 0) + 1;
      });

      // Filter out already-swiped events and enrich with distance + signal count
      const enriched = events
        .filter((e) => !swipedIds.has(e.id))
        .map((e) => {
          let distance: number | null = null;
          if (userPosition && e.latitude && e.longitude) {
            distance = calculateDistance(
              userPosition.latitude,
              userPosition.longitude,
              Number(e.latitude),
              Number(e.longitude)
            );
          }
          return {
            id: e.id,
            title: e.title,
            venue_name: e.venue_name || 'TBA',
            date: e.date,
            start_time: e.start_time,
            image_url: e.image_url || '/placeholder.svg',
            music_genres: e.music_genres || [],
            price: Number(e.price) || 0,
            description: e.description || '',
            distance,
            signalCount: signalCounts[e.id] || 0,
          };
        });

      // Sort by distance (closest first), nulls last
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

  const handleEventSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!user || eventIndex >= swipeEvents.length) return;
    const event = swipeEvents[eventIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'superlike' : 'like';

    // Optimistically advance
    setEventIndex((prev) => prev + 1);

    await supabase.from('swipe_actions').insert({
      user_id: user.id,
      target_type: 'event',
      target_id: event.id,
      action,
      context: 'event_stack',
      latitude: userPosition?.latitude ?? null,
      longitude: userPosition?.longitude ?? null,
    });

    if (action === 'like' || action === 'superlike') {
      await supabase.from('event_signals').insert({
        event_id: event.id,
        user_id: user.id,
        signal_type: 'going',
      });
      await awardXP(user.id, 25, 'Swiped going on event');
      toast.success("+25 XP 🔥 You're going!");
    }
  };

  const currentEvents = swipeEvents.slice(eventIndex, eventIndex + 3);
  const allEventsSwiped = mode === 'events' && !eventsLoading && eventIndex >= swipeEvents.length;

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
            <Switch checked={!ghostMode} onCheckedChange={(v) => setGhostMode(!v)} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-8">
          {MODE_SUBTITLES[mode]}
        </p>
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
                mode === m.key
                  ? 'bg-primary/15 border-primary/40'
                  : 'bg-muted/30 border-border'
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

      {/* Content Area */}
      {mode === 'events' ? (
        <div className="px-4">
          {eventsLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Loading events...</p>
            </div>
          ) : allEventsSwiped ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-3xl">🎵</p>
              <p className="text-muted-foreground text-sm">You've seen all upcoming events</p>
              <button
                onClick={() => setMode('clubs')}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
              >
                Explore Clubs →
              </button>
            </div>
          ) : (
            <>
              {/* Card Stack */}
              <div className="relative w-full aspect-[3/4] mb-6">
                <AnimatePresence>
                  {currentEvents.map((e, i) => (
                    <EventSwipeCard
                      key={e.id}
                      event={e}
                      onSwipe={handleEventSwipe}
                      isTop={i === 0}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Swipe Actions */}
              <SwipeActions
                onPass={() => handleEventSwipe('left')}
                onSuperLike={() => handleEventSwipe('up')}
                onLike={() => handleEventSwipe('right')}
                disabled={eventIndex >= swipeEvents.length}
              />
            </>
          )}
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">{MODE_PLACEHOLDERS[mode]}</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Explore;
