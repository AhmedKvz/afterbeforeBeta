import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, Map, List, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SceneCard } from '@/components/SceneCard';
import { MapView } from '@/components/MapView';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  venue_name: string;
  image_url: string;
  music_genres: string[];
  price: number;
  capacity: number;
  latitude: number;
  longitude: number;
}

interface WishlistStatus {
  [eventId: string]: boolean;
}

const FILTER_OPTIONS = ['All', 'Techno', 'House', 'Hip Hop', 'Tonight', 'Hot 🔥'];

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [wishlistStatus, setWishlistStatus] = useState<WishlistStatus>({});
  const [heatScores, setHeatScores] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!authLoading && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
      return;
    }
    
    fetchEvents();
    if (user) {
      fetchWishlistStatus();
    }
  }, [user, profile, authLoading, navigate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      setEvents(data || []);
      
      // Calculate heat scores
      if (data) {
        const scores: { [id: string]: number } = {};
        for (const event of data) {
          const { count: wishlistCount } = await supabase
            .from('event_wishlists')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);
          
          const { count: checkinCount } = await supabase
            .from('event_checkins')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);
          
          // Calculate heat score (0-100)
          const baseScore = ((wishlistCount || 0) * 5 + (checkinCount || 0) * 15);
          scores[event.id] = Math.min(100, baseScore + Math.floor(Math.random() * 30));
        }
        setHeatScores(scores);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlistStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('event_wishlists')
      .select('event_id')
      .eq('user_id', user.id);
    
    const status: WishlistStatus = {};
    data?.forEach(w => { status[w.event_id] = true; });
    setWishlistStatus(status);
  };

  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Tonight') {
      const today = new Date().toISOString().split('T')[0];
      return event.date === today;
    }
    if (activeFilter === 'Hot 🔥') {
      return (heatScores[event.id] || 0) >= 60;
    }
    return event.music_genres?.includes(activeFilter);
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <span className="font-bold text-xl gradient-text">AfterBefore</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/leaderboards')}
              className="relative p-2"
            >
              <Trophy className="w-5 h-5 text-accent" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full text-xs flex items-center justify-center">
                3
              </span>
            </button>
            <button onClick={() => navigate('/profile')}>
              <User className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Scene Panel Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">The Scene</h2>
            <p className="text-sm text-muted-foreground">{profile?.city || 'Belgrade'} tonight</p>
          </div>
          
          {/* Map/List Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Leaderboard Teaser */}
        <GlassCard 
          className="p-4 mb-4 cursor-pointer bg-accent/5 border-accent/30"
          onClick={() => navigate('/leaderboards')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-accent" />
              <div>
                <h3 className="font-bold text-sm">Weekly Leaderboards</h3>
                <p className="text-xs text-muted-foreground">See top events & ravers →</p>
              </div>
            </div>
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-background" />
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeFilter === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {viewMode === 'map' ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MapView
                locations={filteredEvents.map(event => ({
                  id: event.id,
                  title: event.title,
                  venueName: event.venue_name,
                  latitude: event.latitude || 44.8176,
                  longitude: event.longitude || 20.4633,
                  heatScore: heatScores[event.id] || 30,
                  onClick: () => navigate(`/event/${event.id}`),
                }))}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-4"
            >
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SceneCard
                    id={event.id}
                    title={event.title}
                    venueName={event.venue_name || ''}
                    date={event.date}
                    startTime={event.start_time}
                    imageUrl={event.image_url || ''}
                    musicGenres={event.music_genres || []}
                    price={event.price || 0}
                    heatScore={heatScores[event.id] || 30}
                    isSaved={wishlistStatus[event.id] || false}
                    onWishlistChange={fetchWishlistStatus}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No events found</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
