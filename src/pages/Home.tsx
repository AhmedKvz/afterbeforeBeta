import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MapPin, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { EventCard } from '@/components/EventCard';
import { BottomNav } from '@/components/BottomNav';
import { Lucky100Banner } from '@/components/Lucky100Banner';
import { Lucky100Modal } from '@/components/Lucky100Modal';
import { PartyOfMonthCard } from '@/components/PartyOfMonthCard';
import { LeaderboardPreview } from '@/components/LeaderboardPreview';
import { VenueHeatBoard } from '@/components/VenueHeatBoard';
import { ReviewModal } from '@/components/ReviewModal';
import { NotificationBell } from '@/components/NotificationBell';
import { SceneBanner } from '@/components/SceneBanner';
import { TrendingEventCard } from '@/components/TrendingEventCard';
import { usePartyOfMonth } from '@/hooks/usePartyOfMonth';
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
  venue_type: string;
  neighborhood: string;
  event_type: string;
  is_secret: boolean;
  access_price_rsd: number;
  requires_verified_profile: boolean;
  secret_location_reveal_at: string | null;
  max_guests: number | null;
}

const FILTER_OPTIONS = ['All', 'Tonight', 'This Weekend', 'Events', 'Clubs', 'Restaurants', 'Cafes', 'Bars', 'Splavs', 'After Food', 'Galleries', 'Secret 🔒', 'Pop-Up ⚡'];

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLucky100ModalOpen, setIsLucky100ModalOpen] = useState(false);
  const [signalCounts, setSignalCounts] = useState<Record<string, number>>({});

  const { data: partyOfMonth } = usePartyOfMonth();
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
    // Afterplaces only included when "After Food" filter is on
    if (event.venue_type === 'afterplace' && activeFilter !== 'After Food') return false;

    if (activeFilter === 'All') return true;
    if (activeFilter === 'Events') return true;
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
    if (activeFilter === 'Clubs') return event.venue_type === 'club';
    if (activeFilter === 'Splavs') return event.venue_type === 'splav';
    if (activeFilter === 'Cafes') return event.venue_type === 'cafe_bar' || event.venue_type === 'cafe';
    if (activeFilter === 'Bars') return event.venue_type === 'bar';
    if (activeFilter === 'Restaurants') return event.venue_type === 'restaurant';
    if (activeFilter === 'After Food') return event.venue_type === 'afterplace';
    if (activeFilter === 'Galleries') return event.venue_type === 'gallery';
    if (activeFilter === 'Secret 🔒') return event.event_type === 'secret';
    if (activeFilter === 'Pop-Up ⚡') return event.event_type === 'popup';
    return event.music_genres?.includes(activeFilter);
  });

  const visibleFilters = FILTER_OPTIONS;

  const potEventId = partyOfMonth?.event?.id;
  const regularEvents = potEventId
    ? filteredEvents.filter(e => e.id !== potEventId)
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

      {/* After Mode / Food Corner banner disabled for now */}

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

      {/* Party of the Month */}
      {partyOfMonth?.event && (
        <div className="px-4 mb-4">
          <PartyOfMonthCard
            event={partyOfMonth.event}
            voteCount={partyOfMonth.vote_count || 0}
            avgRating={partyOfMonth.avg_rating || 0}
            reviewCount={partyOfMonth.review_count || 0}
            userVoted={partyOfMonth.user_voted || false}
          />
        </div>
      )}

      {/* This Week's Heat — moved up to match prototype order */}
      <div className="px-4 mb-6">
        <VenueHeatBoard compact />
      </div>

      {/* Filters */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {visibleFilters.map((filter) => (
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-primary">🎟️</span>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Upcoming events
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground">{regularEvents.length} listed</span>
        </div>
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
                venueType={event.venue_type}
                eventType={event.event_type}
                isSecret={event.is_secret}
                accessPriceRsd={event.access_price_rsd}
                requiresVerifiedProfile={event.requires_verified_profile}
                secretLocationRevealAt={event.secret_location_reveal_at}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {regularEvents.length === 0 && !partyOfMonth?.event && (
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">No events found</p>
        </div>
      )}

      {/* ───────── More to explore — sekcije van prototipa, ispod evenata ───────── */}
      <div className="px-4 mt-2 mb-3 flex items-center gap-2">
        <span>✨</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          More to explore
        </h2>
      </div>

      {/* AI "Tonight For You" Section */}
      <TonightForYou userId={user?.id} events={events} navigate={navigate} />

      {/* Trending Tonight */}
      <TrendingTonight events={events} signalCounts={signalCounts} navigate={navigate} />

      {/* Discover Places (venue cards) */}
      <DiscoverPlaces navigate={navigate} />

      {/* Community Reviewed */}
      <CommunityReviewed navigate={navigate} />

      {/* Scene Banner */}
      <div className="px-4 mb-4">
        <SceneBanner />
      </div>

      {/* Leaderboard Preview */}
      <div className="px-4 mb-6">
        <LeaderboardPreview />
      </div>

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

// AI "Tonight For You" component
const TonightForYou = ({ userId, events, navigate }: { userId?: string; events: Event[]; navigate: any }) => {
  const { data: personalizedEvents } = useQuery({
    queryKey: ['personalized-events', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_personalized_events', {
        p_user_id: userId,
        p_limit: 5,
      });
      if (error) throw error;
      return (data || []).filter((d: any) => d.relevance_score > 0);
    },
    enabled: !!userId,
  });

  if (!personalizedEvents?.length) return null;

  const matchedEvents = personalizedEvents
    .map((pe: any) => {
      const event = events.find(e => e.id === pe.event_id);
      return event ? { ...event, relevanceScore: pe.relevance_score, reasons: pe.relevance_reasons } : null;
    })
    .filter(Boolean);

  if (!matchedEvents.length) return null;

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-lg">🤖 Tonight For You</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {matchedEvents.map((event: any) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-[200px] max-w-[200px] flex-shrink-0"
          >
            <button
              onClick={() => navigate(`/event/${event.id}`)}
              className="w-full rounded-2xl bg-muted/30 backdrop-blur-xl border border-primary/20 overflow-hidden text-left"
            >
              <div className="relative h-24">
                <img src={event.image_url || '/placeholder.svg'} alt={event.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/80 text-[10px] font-bold text-primary-foreground">
                  🤖 AI Pick
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{event.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{event.venue_name}</p>
                {event.reasons?.[0] && (
                  <p className="text-[10px] text-primary mt-1 truncate">{event.reasons[0]}</p>
                )}
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ──────────────────── Trending Tonight ────────────────────
const TrendingTonight = ({
  events,
  signalCounts,
  navigate,
}: {
  events: Event[];
  signalCounts: Record<string, number>;
  navigate: any;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const tonight = events
    .filter((e) => e.date === today && e.venue_type !== 'afterplace')
    .sort((a, b) => (signalCounts[b.id] || 0) - (signalCounts[a.id] || 0))
    .slice(0, 6);

  if (!tonight.length) return null;

  return (
    <div className="px-4 mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🔥</span>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Trending tonight
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{tonight.length} live</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {tonight.map((e) => (
          <button
            key={e.id}
            onClick={() => navigate(`/event/${e.id}`)}
            className="min-w-[240px] max-w-[240px] flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 text-left transition hover:border-primary/40"
          >
            <div className="relative h-28">
              <img
                src={e.image_url || '/placeholder.svg'}
                alt={e.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500/90 text-[10px] font-bold text-white">
                🔥 {signalCounts[e.id] || 0} going
              </div>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold">{e.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{e.venue_name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ──────────────────── Discover Places ────────────────────
const DiscoverPlaces = ({ navigate }: { navigate: any }) => {
  const { data: venues = [] } = useQuery({
    queryKey: ['discover-venues'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('venue_name, venue_type, venue_logo_url, neighborhood')
        .eq('account_type', 'club_venue')
        .not('venue_name', 'is', null)
        .limit(12);
      return data || [];
    },
  });

  if (!venues.length) return null;

  const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
    club: { emoji: '🎵', label: 'Club', color: 'from-purple-500/30 to-purple-900/10' },
    splav: { emoji: '🚢', label: 'Splav', color: 'from-blue-500/30 to-blue-900/10' },
    cafe: { emoji: '☕', label: 'Cafe', color: 'from-amber-500/30 to-amber-900/10' },
    cafe_bar: { emoji: '☕', label: 'Cafe', color: 'from-amber-500/30 to-amber-900/10' },
    bar: { emoji: '🍸', label: 'Bar', color: 'from-rose-500/30 to-rose-900/10' },
    restaurant: { emoji: '🍽️', label: 'Restaurant', color: 'from-emerald-500/30 to-emerald-900/10' },
    afterplace: { emoji: '🍔', label: 'After Food', color: 'from-orange-500/30 to-orange-900/10' },
    gallery: { emoji: '🎨', label: 'Gallery', color: 'from-pink-500/30 to-pink-900/10' },
  };

  return (
    <div className="px-4 mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Discover places
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{venues.length} venues</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {venues.map((v: any) => {
          const meta = TYPE_META[v.venue_type || 'club'] || TYPE_META.club;
          return (
            <button
              key={v.venue_name}
              onClick={() => navigate(`/venue/${encodeURIComponent(v.venue_name)}`)}
              className={cn(
                'min-w-[160px] max-w-[160px] flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br text-left transition hover:border-primary/40',
                meta.color
              )}
            >
              <div className="relative h-20">
                {v.venue_logo_url ? (
                  <img src={v.venue_logo_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-70" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    {meta.emoji}
                  </div>
                )}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur">
                  {meta.emoji} {meta.label}
                </div>
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-bold">{v.venue_name}</p>
                {v.neighborhood && (
                  <p className="truncate text-[10px] text-muted-foreground">{v.neighborhood}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────── Community Reviewed ────────────────────
const CommunityReviewed = ({ navigate }: { navigate: any }) => {
  const { data: reviews = [] } = useQuery({
    queryKey: ['community-reviewed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_reviews')
        .select('id, venue_name, rating, review_text, verified_visit, created_at, event_id')
        .neq('moderation_status', 'flagged')
        .not('venue_name', 'is', null)
        .order('helpful_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  if (!reviews.length) return null;

  return (
    <div className="px-4 mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Community reviewed
          </h2>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {reviews.map((r: any) => (
          <button
            key={r.id}
            onClick={() =>
              r.venue_name && navigate(`/venue/${encodeURIComponent(r.venue_name)}#reviews`)
            }
            className="min-w-[240px] max-w-[240px] flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-primary/40"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="truncate text-xs font-bold">{r.venue_name}</span>
              <span className="flex items-center gap-0.5 text-xs text-yellow-300">
                ⭐ {r.rating}
              </span>
            </div>
            {r.review_text && (
              <p className="line-clamp-3 text-[11px] text-muted-foreground italic">
                "{r.review_text}"
              </p>
            )}
            {r.verified_visit && (
              <span className="mt-2 inline-block rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold text-success">
                ✓ Verified Visit
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;
