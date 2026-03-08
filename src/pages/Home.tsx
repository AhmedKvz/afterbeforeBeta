import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventCard } from '@/components/EventCard';
import { BottomNav } from '@/components/BottomNav';
import { Lucky100Banner } from '@/components/Lucky100Banner';
import { Lucky100Modal } from '@/components/Lucky100Modal';
import { BestPartyCard } from '@/components/BestPartyCard';
import { LeaderboardPreview } from '@/components/LeaderboardPreview';
import { VenueHeatBoard } from '@/components/VenueHeatBoard';
import { ReviewModal } from '@/components/ReviewModal';
import { NotificationBell } from '@/components/NotificationBell';
import { SceneBanner } from '@/components/SceneBanner';
import { useBestPartyThisWeek } from '@/hooks/useEventStats';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { useQuests } from '@/hooks/useQuests';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [signalCounts, setSignalCounts] = useState<Record<string, number>>({});

  const { data: bestParty } = useBestPartyThisWeek();
  const { shouldShowModal: shouldShowReviewModal, eventToReview, dismissPrompt } = useReviewPrompt();
  const { completedCount, totalCount } = useQuests();

  // Realtime notifications toast
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          toast(payload.new.title, { description: payload.new.body });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!authLoading && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    if (!authLoading && profile && profile.account_type === 'club_venue') {
      navigate('/venue-dashboard', { replace: true });
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
      const eventList = data || [];
      setEvents(eventList);

      if (eventList.length > 0) {
        const { data: signals } = await supabase
          .from('event_signals')
          .select('event_id')
          .in('event_id', eventList.map(e => e.id));
        
        if (signals) {
          const counts: Record<string, number> = {};
          signals.forEach(s => {
            counts[s.event_id] = (counts[s.event_id] || 0) + 1;
          });
          setSignalCounts(counts);
        }
      }
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

  const regularEvents = bestParty 
    ? filteredEvents.filter(e => e.id !== bestParty.id)
    : filteredEvents;

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
            <NotificationBell />
            <button onClick={() => navigate('/profile')}>
              <img 
                src={profile?.avatar_url || '/placeholder.svg'} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-border"
              />
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

      {/* Quest Progress Compact */}
      {totalCount > 0 && (
        <div className="px-4 mb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/quests')}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-medium">{completedCount}/{totalCount} quests completed</span>
            </div>
            <span className="text-xs text-primary font-bold">View →</span>
          </motion.button>
        </div>
      )}

      {/* Best Party This Week */}
      {bestParty && (
        <div className="px-4 mb-4">
          <BestPartyCard
            id={bestParty.id}
            title={bestParty.title}
            date={bestParty.date}
            startTime={bestParty.start_time}
            venueName={bestParty.venue_name || ''}
            imageUrl={bestParty.image_url || ''}
            avgRating={bestParty.avgRating}
            reviewCount={bestParty.reviewCount}
          />
        </div>
      )}

      {/* Scene Banner */}
      <div className="px-4 mb-4">
        <SceneBanner />
      </div>

      {/* Leaderboard Preview */}
      <div className="px-4 mb-4">
        <LeaderboardPreview />
      </div>

      {/* Venue Heat Widget */}
      <div className="px-4 mb-6">
        <VenueHeatBoard compact />
      </div>

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
          {regularEvents.map((event, index) => (
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
                attendeeCount={signalCounts[event.id] || 0}
                signalCount={signalCounts[event.id] || 0}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {regularEvents.length === 0 && !bestParty && (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">No events found</p>
        </div>
      )}

      <BottomNav />

      <Lucky100Modal 
        isOpen={isLucky100ModalOpen} 
        onClose={() => setIsLucky100ModalOpen(false)} 
      />

      {eventToReview && (
        <ReviewModal
          isOpen={shouldShowReviewModal}
          onClose={dismissPrompt}
          event={eventToReview}
        />
      )}
    </div>
  );
};

export default Home;
