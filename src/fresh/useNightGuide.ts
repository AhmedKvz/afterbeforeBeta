import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHeatVenues, useVenueDirectory } from '@/hooks/useHeatVenues';
import { useQuests } from '@/hooks/useQuests';

export interface GuideEvent {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  venue_name: string;
  image_url: string | null;
  music_genres: string[];
  venue_type: string | null;
  event_type: string | null;
  source?: 'live' | 'sample';
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

const sampleEvents = (): GuideEvent[] => {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
  return [
    {
      id: 'sample-drugstore', title: 'Midnight Circuit', date: iso(now), start_time: '23:30',
      venue_name: 'Drugstore', image_url: null, music_genres: ['Techno'], venue_type: 'club', event_type: 'party', source: 'sample',
    },
    {
      id: 'sample-2044', title: 'Sunrise on the Sava', date: iso(tomorrow), start_time: '01:00',
      venue_name: '20/44', image_url: null, music_genres: ['House', 'Disco'], venue_type: 'splav', event_type: 'party', source: 'sample',
    },
    {
      id: 'sample-karmakoma', title: 'Local Selectors', date: iso(saturday), start_time: '22:00',
      venue_name: 'Karmakoma', image_url: null, music_genres: ['Electronic'], venue_type: 'bar', event_type: 'party', source: 'sample',
    },
  ];
};

export const useNightGuide = () => {
  const today = iso(new Date());
  const { data: heatVenues = [], isLoading: heatLoading } = useHeatVenues();
  const directory = useVenueDirectory();
  const { quests = [], isLoading: questsLoading } = useQuests();

  const eventsQuery = useQuery<GuideEvent[]>({
    queryKey: ['fresh-night-guide-events', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, start_time, venue_name, image_url, music_genres, venue_type, event_type')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(32);
      if (error) throw error;
      return (data || []).map((event) => ({
        ...event,
        start_time: event.start_time || null,
        image_url: event.image_url || null,
        music_genres: event.music_genres || [],
        venue_type: event.venue_type || null,
        event_type: event.event_type || null,
        source: 'live' as const,
      }));
    },
  });

  const dbEvents = eventsQuery.data || [];
  const events = dbEvents.length ? dbEvents : sampleEvents();

  const signalsQuery = useQuery<Record<string, number>>({
    queryKey: ['fresh-event-signals', dbEvents.map((event) => event.id).join(',')],
    enabled: dbEvents.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_signals')
        .select('event_id')
        .in('event_id', dbEvents.map((event) => event.id));
      if (error) throw error;
      return (data || []).reduce<Record<string, number>>((counts, signal) => {
        counts[signal.event_id] = (counts[signal.event_id] || 0) + 1;
        return counts;
      }, {});
    },
  });

  const signalCounts = useMemo(() => signalsQuery.data || {}, [signalsQuery.data]);
  const rankedEvents = useMemo(() => [...events].sort((a, b) => {
    const aToday = a.date === today ? 1 : 0;
    const bToday = b.date === today ? 1 : 0;
    return (bToday - aToday) || ((signalCounts[b.id] || 0) - (signalCounts[a.id] || 0)) || a.date.localeCompare(b.date);
  }), [events, signalCounts, today]);

  const tonightEvents = rankedEvents.filter((event) => event.date === today);
  const featured = tonightEvents[0] || rankedEvents[0] || null;
  const hotVenues = useMemo(() => [...heatVenues].sort((a, b) =>
    (b.here - a.here) || (b.heat - a.heat)
  ), [heatVenues]);
  const cityLive = heatVenues.reduce((total, venue) => total + (venue.here || 0), 0);
  const activeQuest = quests.find((quest) => !quest.xp_claimed) || null;

  return {
    today,
    events: rankedEvents,
    tonightEvents,
    featured,
    signalCounts,
    hotVenues,
    cityLive,
    activeQuest,
    quests,
    directory: directory.data,
    isLoading: eventsQuery.isLoading || heatLoading || questsLoading,
    isFallback: dbEvents.length === 0,
  };
};
