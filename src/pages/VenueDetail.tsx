import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VenueReviewsSection } from '@/components/reviews/VenueReviewsSection';
import { VenueTypeBadge } from '@/components/VenueTypeBadge';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { XPRewardCard } from '@/components/gamification/XPRewardCard';

const VenueDetail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { venueName: encoded } = useParams<{ venueName: string }>();
  const venueName = decodeURIComponent(encoded || '');

  const { data: venueProfile } = useQuery({
    queryKey: ['venue-profile', venueName],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('venue_name, venue_type, venue_description, venue_address, venue_logo_url, neighborhood')
        .eq('account_type', 'club_venue')
        .eq('venue_name', venueName)
        .maybeSingle();
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['venue-events', venueName],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, date, image_url, venue_type')
        .eq('venue_name', venueName)
        .order('date', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const venueType =
    venueProfile?.venue_type ||
    events?.find((e) => e.venue_type)?.venue_type ||
    'club';

  const scrollToReviews = () =>
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-purple-900 via-pink-900/60 to-background">
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

      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-5">
        {venueProfile?.venue_description && (
          <div>
            <SectionHeading label="About" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {venueProfile.venue_description}
            </p>
          </div>
        )}

        {/* Inline gamification on the venue surface too */}
        {user && (
          <XPRewardCard
            onReview={scrollToReviews}
          />
        )}

        {events && events.length > 0 && (
          <div>
            <SectionHeading label="Recent events" />
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {events.map((e) => (
                <Link
                  key={e.id}
                  to={`/event/${e.id}`}
                  className="w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-primary/40"
                >
                  {e.image_url && (
                    <img src={e.image_url} alt="" className="h-20 w-full object-cover" />
                  )}
                  <div className="p-2">
                    <p className="line-clamp-1 text-xs font-semibold">{e.title}</p>
                    <p className="text-[10px] text-muted-foreground">{e.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div id="reviews" className="scroll-mt-20">
          <VenueReviewsSection venueName={venueName} venueType={venueType} />
        </div>
      </div>
    </div>
  );
};

export default VenueDetail;
