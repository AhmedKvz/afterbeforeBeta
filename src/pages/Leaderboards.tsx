import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Flame, Users, Crown, Medal, Award, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface EventRanking {
  id: string;
  title: string;
  venue_name: string;
  image_url: string;
  wishlist_count: number;
  checkin_count: number;
  total_score: number;
}

interface RaverRanking {
  user_id: string;
  display_name: string;
  avatar_url: string;
  xp: number;
  level: number;
  checkin_count: number;
  wishlist_count: number;
  total_score: number;
}

const Leaderboards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventRankings, setEventRankings] = useState<EventRanking[]>([]);
  const [raverRankings, setRaverRankings] = useState<RaverRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    
    // Get date range for current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    try {
      // Fetch events with wishlist and checkin counts
      const { data: events } = await supabase
        .from('events')
        .select('id, title, venue_name, image_url');

      if (events) {
        const eventScores = await Promise.all(
          events.map(async (event) => {
            const { count: wishlistCount } = await supabase
              .from('event_wishlists')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .gte('created_at', startOfWeek.toISOString());

            const { count: checkinCount } = await supabase
              .from('event_checkins')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .gte('checked_in_at', startOfWeek.toISOString());

            return {
              ...event,
              wishlist_count: wishlistCount || 0,
              checkin_count: checkinCount || 0,
              total_score: (wishlistCount || 0) * 10 + (checkinCount || 0) * 50,
            };
          })
        );

        setEventRankings(
          eventScores
            .filter(e => e.total_score > 0)
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 10)
        );
      }

      // Fetch user rankings
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, xp, level');

      if (profiles) {
        const raverScores = await Promise.all(
          profiles.map(async (profile) => {
            const { count: checkinCount } = await supabase
              .from('event_checkins')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.user_id)
              .gte('checked_in_at', startOfWeek.toISOString());

            const { count: wishlistCount } = await supabase
              .from('event_wishlists')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.user_id)
              .gte('created_at', startOfWeek.toISOString());

            return {
              ...profile,
              checkin_count: checkinCount || 0,
              wishlist_count: wishlistCount || 0,
              total_score: (profile.xp || 0) + (checkinCount || 0) * 100 + (wishlistCount || 0) * 25,
            };
          })
        );

        setRaverRankings(
          raverScores
            .filter(r => r.total_score > 0)
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 20)
        );
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const getWeekLabel = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-xl flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Leaderboards
            </h1>
            <p className="text-xs text-muted-foreground">{getWeekLabel()}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="events" className="flex-1 gap-2">
              <Flame className="w-4 h-4" />
              Weekly Events
            </TabsTrigger>
            <TabsTrigger value="ravers" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              Weekly Ravers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse-glow w-12 h-12 rounded-full bg-primary/20" />
              </div>
            ) : eventRankings.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No event activity this week yet</p>
              </GlassCard>
            ) : (
              eventRankings.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    className={cn(
                      'p-4 flex items-center gap-4 cursor-pointer',
                      index < 3 && 'border-accent/30 bg-accent/5'
                    )}
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    <img
                      src={event.image_url || '/placeholder.svg'}
                      alt={event.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{event.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{event.venue_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>❤️ {event.wishlist_count}</span>
                        <span>📍 {event.checkin_count}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">{event.total_score}</div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="ravers" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse-glow w-12 h-12 rounded-full bg-primary/20" />
              </div>
            ) : raverRankings.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No raver activity this week yet</p>
              </GlassCard>
            ) : (
              raverRankings.map((raver, index) => (
                <motion.div
                  key={raver.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    className={cn(
                      'p-4 flex items-center gap-4',
                      index < 3 && 'border-accent/30 bg-accent/5',
                      user?.id === raver.user_id && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    <img
                      src={raver.avatar_url || '/placeholder.svg'}
                      alt={raver.display_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">
                        {raver.display_name}
                        {user?.id === raver.user_id && (
                          <span className="text-primary ml-2">(You)</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>⭐ Lvl {raver.level || 1}</span>
                        <span>📍 {raver.checkin_count}</span>
                        <span>❤️ {raver.wishlist_count}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">{raver.total_score}</div>
                      <div className="text-xs text-muted-foreground">XP</div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Your Ranking */}
        {user && activeTab === 'ravers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <GlassCard className="p-4 bg-primary/10 border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-medium">Your Rank</span>
                </div>
                <span className="text-2xl font-bold">
                  #{raverRankings.findIndex(r => r.user_id === user.id) + 1 || '-'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Keep checking in and saving events to climb the leaderboard!
              </p>
            </GlassCard>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Leaderboards;
