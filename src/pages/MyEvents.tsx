import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventCard } from '@/components/EventCard';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';

type Tab = 'upcoming' | 'past';

const MyEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchEvents();
  }, [user, activeTab, navigate]);

  const fetchEvents = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Get events the user has checked into
      const { data: checkins } = await supabase
        .from('event_checkins')
        .select('event_id')
        .eq('user_id', user.id);
      
      const eventIds = checkins?.map(c => c.event_id) || [];
      
      if (eventIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('events')
        .select('*')
        .in('id', eventIds);
      
      if (activeTab === 'upcoming') {
        query = query.gte('date', today);
      } else {
        query = query.lt('date', today);
      }
      
      const { data, error } = await query.order('date', { ascending: activeTab === 'upcoming' });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Ticket className="w-6 h-6 text-primary" />
          <h1 className="font-bold text-xl">My Events</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-4">
        <div className="flex gap-2">
          {(['upcoming', 'past'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 rounded-xl font-medium transition-all capitalize',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card h-48 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">
              {activeTab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === 'upcoming' 
                ? 'Check in at events to see them here'
                : "You haven't attended any events yet"}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-gradient px-6 py-3 rounded-xl"
            >
              Browse Events
            </button>
          </motion.div>
        ) : (
          events.map((event, index) => (
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
                attendeeCount={Math.floor(Math.random() * 50) + 20}
              />
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyEvents;
