import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass, Shield, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP } from '@/services/gamification';
import { incrementQuestProgress } from '@/services/questProgress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/GlassCard';
import { BottomNav } from '@/components/BottomNav';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

const VIBE_OPTIONS = [
  { type: 'energy_high', emoji: '🔥', label: 'High Energy' },
  { type: 'energy_low', emoji: '😴', label: 'Low' },
  { type: 'good_music', emoji: '🎵', label: 'Great Music' },
  { type: 'great_sound', emoji: '🔊', label: 'Great Sound' },
  { type: 'long_queue', emoji: '🚶', label: 'Queue' },
  { type: 'bad_vibes', emoji: '⚠️', label: 'Bad Vibes' },
];

const SAFETY_TIPS = [
  'Stay hydrated — most venues have free water',
  'Look out for your crew — check in with friends',
  'Trust your instincts — if it feels wrong, leave',
];

const ScenePanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('raverboard');

  // Raverboard — all-time top users
  const { data: raverboard = [], isLoading: raverLoading } = useQuery({
    queryKey: ['raverboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, xp, level, events_attended')
        .order('xp', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Tonight's events for vibe tab
  const today = new Date().toISOString().split('T')[0];
  const { data: tonightEvents = [] } = useQuery({
    queryKey: ['tonight-events', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, venue_name, image_url')
        .eq('date', today);
      if (error) throw error;
      return data || [];
    },
    enabled: tab === 'vibe',
  });

  // Vibe signals for tonight
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: vibeSignals = [], refetch: refetchVibes } = useQuery({
    queryKey: ['vibe-signals', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vibe_signals')
        .select('*')
        .gte('created_at', twoHoursAgo);
      if (error) throw error;
      return data || [];
    },
    enabled: tab === 'vibe',
    refetchInterval: 30000,
  });

  // Safety stats
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: safetyStats } = useQuery({
    queryKey: ['safety-stats'],
    queryFn: async () => {
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('date', weekAgo.split('T')[0]);

      const { data: badVibes } = await supabase
        .from('vibe_signals')
        .select('event_id')
        .eq('signal_type', 'bad_vibes')
        .gte('created_at', weekAgo);

      const badEventIds = new Set(badVibes?.map((v: any) => v.event_id) || []);
      const safeEvents = (totalEvents || 0) - badEventIds.size;
      const trustScore = totalEvents ? Math.round((safeEvents / totalEvents) * 100) : 100;

      return { trustScore, totalEvents: totalEvents || 0, incidentFree: safeEvents };
    },
    enabled: tab === 'safety',
  });

  const submitVibe = async (eventId: string, venueName: string, signalType: string) => {
    if (!user) return;
    try {
      await supabase.from('vibe_signals').insert({
        user_id: user.id,
        event_id: eventId,
        venue_name: venueName,
        signal_type: signalType,
      });
      await awardXP(user.id, 15, 'Vibe signal');
      await incrementQuestProgress(user.id, 'vibe');
      refetchVibes();
      toast.success('+15 XP 🔥 Vibe submitted!');
    } catch {
      toast.error('Failed to submit vibe');
    }
  };

  const getVibeLabel = (eventId: string) => {
    const signals = vibeSignals.filter((v: any) => v.event_id === eventId);
    const high = signals.filter((v: any) => v.signal_type === 'energy_high').length;
    const low = signals.filter((v: any) => v.signal_type === 'energy_low').length;
    if (signals.length === 0) return 'No vibes yet';
    if (high > low * 2) return '🔥 Peak energy';
    if (high > low) return 'The vibe is building';
    if (low > high) return '😴 Chill night';
    return 'Mixed vibes';
  };

  const userRaverRank = raverboard.findIndex((r: any) => r.user_id === user?.id) + 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-xl">Scene Panel</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="raverboard">Raverboard</TabsTrigger>
            <TabsTrigger value="vibe">Vibe</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
          </TabsList>

          {/* RAVERBOARD */}
          <TabsContent value="raverboard" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Lifetime contribution to the scene. Never resets.
            </p>
            {raverLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card p-4 animate-pulse"><div className="h-12 bg-muted rounded-lg" /></div>
                ))}
              </div>
            ) : (
              raverboard.map((entry: any, index: number) => {
                const isMe = entry.user_id === user?.id;
                const maxXP = raverboard[0]?.xp || 1;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      'glass-card p-4',
                      isMe && 'border-2 border-primary',
                      index < 3 && 'bg-gradient-to-r from-purple-500/10 to-pink-500/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center">
                        {index < 3 ? <span className="text-2xl">{MEDALS[index]}</span> : <span className="font-bold text-muted-foreground">#{index + 1}</span>}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={entry.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20">{entry.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{entry.display_name}</span>
                          {isMe && <span className="text-xs text-primary">(You)</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Lvl {entry.level || 1}</span>
                          <span>•</span>
                          <span>{entry.events_attended || 0} events</span>
                        </div>
                        <Progress value={((entry.xp || 0) / maxXP) * 100} className="h-1.5 mt-1" />
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{(entry.xp || 0).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">XP</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* VIBE */}
          <TabsContent value="vibe" className="mt-4 space-y-4">
            {tonightEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No events tonight</p>
                <p className="text-sm">Check back when events are happening!</p>
              </div>
            ) : (
              tonightEvents.map((event: any) => (
                <GlassCard key={event.id} className="p-4 border-amber-500/20" hoverable={false}>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={event.image_url || '/placeholder.svg'} alt={event.title} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-bold text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{event.venue_name}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-amber-400 mb-3">{getVibeLabel(event.id)}</p>
                  <div className="flex flex-wrap gap-2">
                    {VIBE_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => submitVibe(event.id, event.venue_name, opt.type)}
                        className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>
                </GlassCard>
              ))
            )}
          </TabsContent>

          {/* SAFETY */}
          <TabsContent value="safety" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <GlassCard className="p-6 text-center border-green-500/20" hoverable={false}>
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-muted" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-green-500" strokeDasharray={`${safetyStats?.trustScore || 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-green-400">{safetyStats?.trustScore || 100}%</span>
                  </div>
                </div>
                <h4 className="font-bold">Trust Score</h4>
                <p className="text-xs text-muted-foreground">Events with 0 incidents this week</p>
              </GlassCard>

              <GlassCard className="p-6 text-center border-teal-500/20" hoverable={false}>
                <Shield className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                <h4 className="font-bold">Community Health</h4>
                <p className="text-sm text-green-400 font-medium">{safetyStats?.totalEvents || 0} events tracked this week</p>
              </GlassCard>
            </div>

            <div>
              <h3 className="font-bold mb-3">Safety Tips</h3>
              <div className="space-y-2">
                {SAFETY_TIPS.map((tip, i) => (
                  <GlassCard key={i} className="p-4 border-teal-500/10" hoverable={false}>
                    <p className="text-sm text-muted-foreground">💚 {tip}</p>
                  </GlassCard>
                ))}
                <GlassCard className="p-4 border-green-500/20" hoverable={false}>
                  <p className="text-sm text-green-400 font-medium">
                    🛡️ AfterBefore community reports {safetyStats?.incidentFree || 0} incident-free events this week
                  </p>
                </GlassCard>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default ScenePanel;
