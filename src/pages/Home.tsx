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
import { ReviewModal } from '@/components/ReviewModal';
import { NotificationBell } from '@/components/NotificationBell';
import { TrendingEventCard } from '@/components/TrendingEventCard';
import { StoriesRail } from '@/components/StoriesRail';
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

// value = filter logic key (unchanged), label = Serbian display. First 5 are primary; rest behind "Više".
const FILTERS: { v: string; l: string }[] = [
  { v: 'All', l: 'Sve' },
  { v: 'Tonight', l: 'Večeras' },
  { v: 'This Weekend', l: 'Vikend' },
  { v: 'Clubs', l: 'Klubovi' },
  { v: 'Bars', l: 'Barovi' },
  { v: 'Events', l: 'Događaji' },
  { v: 'Restaurants', l: 'Restorani' },
  { v: 'Cafes', l: 'Kafići' },
  { v: 'Splavs', l: 'Splavovi' },
  { v: 'After Food', l: 'After hrana' },
  { v: 'Galleries', l: 'Galerije' },
  { v: 'Secret 🔒', l: 'Tajno 🔒' },
  { v: 'Pop-Up ⚡', l: 'Pop-Up ⚡' },
];
const PRIMARY_FILTERS = 5;

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAllFilters, setShowAllFilters] = useState(false);
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

  const shownFilters = showAllFilters ? FILTERS : FILTERS.slice(0, PRIMARY_FILTERS);

  const potEventId = partyOfMonth?.event?.id;
  const regularEvents = potEventId
    ? filteredEvents.filter(e => e.id !== potEventId)
    : filteredEvents;

  // ambient header signal — how many events are on tonight
  const todayStr = new Date().toISOString().split('T')[0];
  const tonightCount = events.filter((e) => e.date === todayStr && e.venue_type !== 'afterplace').length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full" style={{ background: 'oklch(0.88 0.19 158 / 0.2)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header — logo + ambient city signal */}
      <header className="sticky top-0 z-40 backdrop-blur-lg px-[18px] py-3.5" style={{ background: 'oklch(0.135 0.012 285 / 0.92)', borderBottom: '1px solid var(--ab-hairline)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">🌙</span>
            <div className="min-w-0">
              <span className="font-extrabold text-xl gradient-text">AfterBefore</span>
              <div className="text-[11px] -mt-0.5 flex items-center gap-1" style={{ color: 'var(--ab-ink-3)' }}>
                <MapPin className="w-3 h-3" />
                {profile?.city || 'Beograd'}
                {tonightCount > 0 && <span style={{ color: 'var(--ab-acid-dim)' }}> · {tonightCount} večeras</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <NotificationBell />
            <button onClick={() => navigate('/profile')}>
              <img
                src={profile?.avatar_url || '/placeholder.svg'}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                style={{ border: '1px solid var(--ab-hairline-strong)' }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Stories rail */}
      <div className="pt-3"><StoriesRail /></div>

      {/* Quest Progress Compact */}
      {totalCount > 0 && (
        <div className="px-[18px] mb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/quests')}
            className="w-full p-3 rounded-2xl flex items-center justify-between"
            style={{ background: 'oklch(0.62 0.25 300 / 0.08)', border: '1px solid oklch(0.62 0.25 300 / 0.3)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--ab-ink)' }}>{completedCount}/{totalCount} questova završeno</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--ab-uv)' }}>Otvori →</span>
          </motion.button>
        </div>
      )}

      {/* Party of the Month */}
      {partyOfMonth?.event && (
        <div className="px-[18px] mb-4">
          <PartyOfMonthCard
            event={partyOfMonth.event}
            voteCount={partyOfMonth.vote_count || 0}
            avgRating={partyOfMonth.avg_rating || 0}
            reviewCount={partyOfMonth.review_count || 0}
            userVoted={partyOfMonth.user_voted || false}
          />
        </div>
      )}


      {/* Filters — 5 primary + Više */}
      <div className="px-[18px] mb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {shownFilters.map((f) => (
            <button
              key={f.v}
              onClick={() => setActiveFilter(f.v)}
              className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
              style={activeFilter === f.v
                ? { background: 'var(--ab-acid)', color: 'var(--ab-acid-ink)' }
                : { background: 'var(--ab-surface)', color: 'var(--ab-ink-3)', border: '1px solid var(--ab-hairline)' }}
            >
              {f.l}
            </button>
          ))}
          <button
            onClick={() => setShowAllFilters((s) => !s)}
            className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0"
            style={{ color: 'var(--ab-ink-2)', border: '1px solid var(--ab-hairline-strong)' }}
          >
            {showAllFilters ? 'Manje ⌃' : 'Više ⌄'}
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="px-[18px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>🎟️</span>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--ab-ink-3)' }}>
              Uskoro
            </h2>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--ab-ink-3)' }}>{regularEvents.length} u listi</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {regularEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.045, 0.4), ease: [0.16, 1, 0.3, 1], duration: 0.36 }}
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
        <div className="px-[18px] py-12 text-center">
          <p style={{ color: 'var(--ab-ink-3)' }}>Nema događaja za sad</p>
        </div>
      )}

      {/* Lucky 100 — moved below the fold (declutter the top) */}
      <div className="px-[18px] mt-4 mb-2">
        <Lucky100Banner onClick={() => setIsLucky100ModalOpen(true)} />
      </div>

      {/* ───────── More to explore — sekcije van prototipa, ispod evenata ───────── */}
      <div className="px-[18px] mt-4 mb-3 flex items-center gap-2">
        <span>✨</span>
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--ab-ink-3)' }}>
          Još za istraživanje
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
    <div className="px-[18px] mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4" style={{ color: 'var(--ab-uv)' }} />
        <h2 className="font-extrabold text-lg" style={{ color: 'var(--ab-ink)' }}>🤖 Za tebe večeras</h2>
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
              className="w-full rounded-2xl overflow-hidden text-left"
              style={{ background: 'var(--ab-surface)', border: '1px solid oklch(0.62 0.25 300 / 0.3)' }}
            >
              <div className="relative h-24">
                <img src={event.image_url || '/placeholder.svg'} alt={event.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--ab-surface), transparent)' }} />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--ab-uv)', color: '#fff' }}>
                  🤖 AI
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--ab-ink)' }}>{event.title}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--ab-ink-3)' }}>{event.venue_name}</p>
                {event.reasons?.[0] && (
                  <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--ab-uv)' }}>{event.reasons[0]}</p>
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
    <div className="px-[18px] mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🔥</span>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--ab-ink-3)' }}>
            Trending večeras
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--ab-ink-3)' }}>{tonight.length} uživo</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {tonight.map((e) => (
          <button
            key={e.id}
            onClick={() => navigate(`/event/${e.id}`)}
            className="min-w-[240px] max-w-[240px] flex-shrink-0 rounded-2xl overflow-hidden text-left transition"
            style={{ background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }}
          >
            <div className="relative h-28">
              <img
                src={e.image_url || '/placeholder.svg'}
                alt={e.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, oklch(0.135 0.012 285 / 0.85), transparent)' }} />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'oklch(0.66 0.25 18 / 0.9)', color: '#fff' }}>
                🔥 {signalCounts[e.id] || 0} ide
              </div>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--ab-ink)' }}>{e.title}</p>
              <p className="truncate text-[11px]" style={{ color: 'var(--ab-ink-3)' }}>{e.venue_name}</p>
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
    <div className="px-[18px] mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--ab-ink-3)' }}>
            Otkrij mesta
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--ab-ink-3)' }}>{venues.length} mesta</span>
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
    <div className="px-[18px] mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--ab-ink-3)' }}>
            Ocenila zajednica
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
            className="min-w-[240px] max-w-[240px] flex-shrink-0 rounded-2xl p-3 text-left transition"
            style={{ background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="truncate text-xs font-bold" style={{ color: 'var(--ab-ink)' }}>{r.venue_name}</span>
              <span className="flex items-center gap-0.5 text-xs" style={{ color: 'oklch(0.80 0.15 75)' }}>
                ⭐ {r.rating}
              </span>
            </div>
            {r.review_text && (
              <p className="line-clamp-3 text-[11px] italic" style={{ color: 'var(--ab-ink-2)' }}>
                "{r.review_text}"
              </p>
            )}
            {r.verified_visit && (
              <span className="mt-2 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: 'oklch(0.78 0.18 152 / 0.15)', color: 'var(--ab-acid)' }}>
                ✓ Posećeno
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;
