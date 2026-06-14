import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Star, MessageSquarePlus, Flame, Users, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VenueReviewsSection } from '@/components/reviews/VenueReviewsSection';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { VenueTypeBadge } from '@/components/VenueTypeBadge';
import { VenueClaimBanner } from '@/components/VenueClaimBanner';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { XPRewardCard } from '@/components/gamification/XPRewardCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const VenueDetail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { venueName: encoded } = useParams<{ venueName: string }>();
  const venueName = decodeURIComponent(encoded || '');
  const [writeOpen, setWriteOpen] = useState(false);

  const { data: venueProfile } = useQuery({
    queryKey: ['venue-profile', venueName],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('venue_name, venue_type, venue_description, venue_address, venue_logo_url, neighborhood, venue_instagram, venue_capacity, venue_music_genres')
        .eq('account_type', 'club_venue')
        .eq('venue_name', venueName)
        .maybeSingle();
      return data;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['venue-events', venueName],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, date, start_time, image_url, venue_type, music_genres')
        .eq('venue_name', venueName)
        .order('date', { ascending: false })
        .limit(40);
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['venue-stats-detail', venueName],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_venue_review_stats', { p_venue_name: venueName });
      return data as any;
    },
  });

  const { data: heat } = useQuery({
    queryKey: ['venue-heat-single', venueName],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_venue_heat', { days_back: 7 });
      return ((data as any[]) || []).find((v) => v.venue_name === venueName) || null;
    },
  });

  const { data: checkinCount = 0 } = useQuery({
    queryKey: ['venue-checkins-count', venueName, events.length],
    queryFn: async () => {
      if (!events.length) return 0;
      const eventIds = events.map((e) => e.id);
      const { count } = await supabase
        .from('event_checkins')
        .select('*', { count: 'exact', head: true })
        .in('event_id', eventIds);
      return count || 0;
    },
  });

  const venueType =
    venueProfile?.venue_type ||
    events.find((e) => e.venue_type)?.venue_type ||
    'club';

  const today = new Date().toISOString().split('T')[0];
  const upcoming = useMemo(
    () => events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [events, today]
  );
  const past = useMemo(() => events.filter((e) => e.date < today), [events, today]);

  const avgRating = Number(stats?.avg_rating || 0);
  const reviewCount = Number(stats?.review_count || 0);
  const verifiedCount = Number(stats?.verified_count || 0);

  const scrollToReviews = () => {
    const tab = document.querySelector<HTMLButtonElement>('[data-tab="reviews"]');
    tab?.click();
    setTimeout(() => {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-purple-900 via-pink-900/60 to-background">
        {venueProfile?.venue_logo_url && (
          <img
            src={venueProfile.venue_logo_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="absolute bottom-4 left-4 right-4">
          <VenueTypeBadge type={venueType} size="md" />
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">{venueName}</h1>
          {(venueProfile?.venue_address || venueProfile?.neighborhood) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <MapPin className="h-3 w-3" />
              {venueProfile?.venue_address || venueProfile?.neighborhood}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-5">
        {/* Claim your venue */}
        <VenueClaimBanner venueName={venueName} />

        {/* Rating summary header */}
        <div className="mb-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="text-center">
            <div className="text-3xl font-black text-yellow-300">{avgRating.toFixed(1)}</div>
            <div className="mt-0.5 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3 w-3 ${
                    s <= Math.round(avgRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 border-l border-border pl-4 text-sm">
            <div>
              <span className="font-bold">{reviewCount}</span>{' '}
              <span className="text-muted-foreground">reviews</span>
              {verifiedCount > 0 && (
                <span className="ml-2 text-xs text-success">· {verifiedCount} verified</span>
              )}
            </div>
            {heat && (
              <div className="mt-1 flex items-center gap-1 text-xs text-orange-400">
                <Flame className="h-3 w-3" />
                Heat {heat.total_heat} this week
              </div>
            )}
          </div>
          <button
            onClick={() => setWriteOpen(true)}
            disabled={!user}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <MessageSquarePlus className="mr-1 inline h-3.5 w-3.5" />
            Write review
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="reviews" data-tab="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-5">
            {venueProfile?.venue_description && (
              <div>
                <SectionHeading label="About" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {venueProfile.venue_description}
                </p>
              </div>
            )}

            {user && <XPRewardCard onReview={scrollToReviews} />}

            <div className="grid grid-cols-3 gap-2">
              <StatTile icon="⭐" value={avgRating.toFixed(1)} label="Rating" />
              <StatTile icon="🔥" value={heat?.total_heat ?? 0} label="Heat" />
              <StatTile icon="📍" value={checkinCount} label="Check-ins" />
            </div>

            {upcoming.length > 0 && (
              <div>
                <SectionHeading label="Upcoming here" />
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {upcoming.slice(0, 8).map((e) => (
                    <EventChip key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Events */}
          <TabsContent value="events" className="space-y-4">
            {upcoming.length > 0 && (
              <div>
                <SectionHeading label="Upcoming" />
                <div className="space-y-2">
                  {upcoming.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <SectionHeading label="Past events" />
                <div className="space-y-2">
                  {past.slice(0, 20).map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}
            {!events.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No events listed yet.
              </p>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews">
            <div id="reviews" className="scroll-mt-20">
              <VenueReviewsSection venueName={venueName} venueType={venueType} />
            </div>
          </TabsContent>

          {/* Community */}
          <TabsContent value="community" className="space-y-4">
            <CommunityPanel
              checkinCount={checkinCount}
              reviewCount={reviewCount}
              verifiedCount={verifiedCount}
              heat={heat}
              topTags={stats?.top_tags}
            />
          </TabsContent>
        </Tabs>
      </div>

      <WriteReviewModal
        open={writeOpen}
        onOpenChange={setWriteOpen}
        venueName={venueName}
        venueType={venueType}
        eventId={null}
      />
    </div>
  );
};

const StatTile = ({ icon, value, label }: { icon: string; value: any; label: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
    <div className="text-xl">{icon}</div>
    <div className="text-sm font-bold">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

const EventChip = ({ event }: { event: any }) => (
  <Link
    to={`/event/${event.id}`}
    className="w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-primary/40"
  >
    {event.image_url && <img src={event.image_url} alt="" className="h-20 w-full object-cover" />}
    <div className="p-2">
      <p className="line-clamp-1 text-xs font-semibold">{event.title}</p>
      <p className="text-[10px] text-muted-foreground">{event.date}</p>
    </div>
  </Link>
);

const EventRow = ({ event }: { event: any }) => (
  <Link
    to={`/event/${event.id}`}
    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 transition hover:border-primary/40"
  >
    <img
      src={event.image_url || '/placeholder.svg'}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg object-cover"
    />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">{event.title}</p>
      <p className="text-[11px] text-muted-foreground">
        {format(new Date(event.date), 'EEE, MMM d')} · {event.start_time?.slice(0, 5)}
      </p>
    </div>
  </Link>
);

const CommunityPanel = ({
  checkinCount,
  reviewCount,
  verifiedCount,
  heat,
  topTags,
}: {
  checkinCount: number;
  reviewCount: number;
  verifiedCount: number;
  heat: any;
  topTags?: any[];
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <CommunityStat icon={<Users className="h-4 w-4 text-primary" />} value={checkinCount} label="Total check-ins" />
      <CommunityStat icon={<Sparkles className="h-4 w-4 text-accent" />} value={verifiedCount} label="Verified visits" />
      <CommunityStat icon={<Flame className="h-4 w-4 text-orange-400" />} value={heat?.signal_count || 0} label="Going signals (7d)" />
      <CommunityStat icon={<Trophy className="h-4 w-4 text-yellow-400" />} value={heat?.total_heat || 0} label="Heat score (7d)" />
    </div>

    {topTags && topTags.length > 0 && (
      <div>
        <SectionHeading label="What people say" />
        <div className="flex flex-wrap gap-1.5">
          {topTags.slice(0, 12).map((t: any) => (
            <span
              key={t.tag}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary"
            >
              {t.tag} <span className="text-muted-foreground">· {t.count}</span>
            </span>
          ))}
        </div>
      </div>
    )}

    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Ranking impact
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Every check-in, verified review and going-signal here lifts this venue on the{' '}
        <span className="font-bold text-foreground">Club Board</span> leaderboard.
      </p>
      <p className="mt-1 text-xs">
        Current heat: <span className="font-bold text-orange-400">{heat?.total_heat || 0} 🔥</span> ·{' '}
        Reviews: <span className="font-bold text-foreground">{reviewCount}</span>
      </p>
    </div>
  </div>
);

const CommunityStat = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
    <div className="mb-1 flex items-center gap-2">{icon}<span className="text-lg font-bold">{value}</span></div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

export default VenueDetail;
