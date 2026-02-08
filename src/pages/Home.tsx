import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventCard } from '@/components/EventCard';
import { BottomNav } from '@/components/BottomNav';
import { Lucky100Banner } from '@/components/Lucky100Banner';
import { Lucky100Modal } from '@/components/Lucky100Modal';
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
}

const FILTER_OPTIONS = ['All', 'Techno', 'House', 'Hip Hop', 'Tonight', 'This Weekend'];

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLucky100ModalOpen, setIsLucky100ModalOpen] = useState(false);

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
  }, [user, profile, authLoading, navigate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Tonight') {
      const today = new Date().toISOString().split('T')[0];
      return event.date === today;
    }
    if (activeFilter === 'This Weekend') {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      const friday = new Date(today);
      friday.setDate(today.getDate() + daysUntilFriday);
      const sunday = new Date(friday);
      sunday.setDate(friday.getDate() + 2);
      
      const eventDate = new Date(event.date);
      return eventDate >= friday && eventDate <= sunday;
    }
    return event.music_genres?.includes(activeFilter);
  });

  const featuredEvent = filteredEvents[0];
  const otherEvents = filteredEvents.slice(1);

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
          <div className="flex items-center gap-4">
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

      {/* Location */}
      <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">{profile?.city || 'Belgrade'}</span>
      </div>

      {/* Lucky 100 Banner */}
      <div className="px-4 mb-4">
        <Lucky100Banner onClick={() => setIsLucky100ModalOpen(true)} />
      </div>

      {/* Featured Event */}
      {featuredEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-6"
        >
          <EventCard
            {...{
              id: featuredEvent.id,
              title: featuredEvent.title,
              date: featuredEvent.date,
              startTime: featuredEvent.start_time,
              venueName: featuredEvent.venue_name || '',
              imageUrl: featuredEvent.image_url || '',
              musicGenres: featuredEvent.music_genres || [],
              price: featuredEvent.price || 0,
              capacity: featuredEvent.capacity || 100,
              attendeeCount: Math.floor(Math.random() * 100) + 20, // Mock data
              featured: true,
            }}
          />
        </motion.div>
      )}

      {/* Filters */}
      <div className="px-4 mb-6">
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

      {/* Events Grid */}
      <div className="px-4">
        <h2 className="font-bold text-lg mb-4">Upcoming Events</h2>
        <div className="grid grid-cols-1 gap-4">
          {otherEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <EventCard
                id={event.id}
                title={event.title}
                date={event.date}
                startTime={event.start_time}
                venueName={event.venue_name || ''}
                imageUrl={event.image_url || ''}
                musicGenres={event.music_genres || []}
                price={event.price || 0}
                capacity={event.capacity || 100}
                attendeeCount={Math.floor(Math.random() * 80) + 10}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">No events found</p>
        </div>
      )}

      <BottomNav />

      {/* Lucky 100 Modal */}
      <Lucky100Modal 
        isOpen={isLucky100ModalOpen} 
        onClose={() => setIsLucky100ModalOpen(false)} 
      />
    </div>
  );
};

export default Home;
