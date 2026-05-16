import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VenueReviewsSection } from '@/components/reviews/VenueReviewsSection';
import { VENUE_TYPE_LABEL } from '@/components/reviews/reviewTags';

const VenueDetail = () => {
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-purple-900 via-pink-900/60 to-background">
        {venueProfile?.venue_logo_url && (
          <img
            src={venueProfile.venue_logo_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <Link
          to="/"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {VENUE_TYPE_LABEL[venueType] || 'Venue'}
          </span>
          <h1 className="mt-1 text-2xl font-black text-white">{venueName}</h1>
          {(venueProfile?.venue_address || venueProfile?.neighborhood) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <MapPin className="h-3 w-3" />
              {venueProfile?.venue_address || venueProfile?.neighborhood}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {venueProfile?.venue_description && (
          <p className="mb-4 text-sm text-muted-foreground">{venueProfile.venue_description}</p>
        )}

        {events && events.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Recent events
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {events.map((e) => (
                <Link
                  key={e.id}
                  to={`/event/${e.id}`}
                  className="w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5"
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

        <VenueReviewsSection venueName={venueName} venueType={venueType} />
      </div>
    </div>
  );
};

export default VenueDetail;
