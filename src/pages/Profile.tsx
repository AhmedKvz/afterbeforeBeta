import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Settings, Camera, Star, Music, 
  Trophy, LogOut, Heart, MapPinCheck, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { BottomNav } from '@/components/BottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getXPProgress, ACHIEVEMENTS, getUserAchievements } from '@/services/gamification';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SavedEvent {
  id: string;
  event: {
    id: string;
    title: string;
    venue_name: string;
    date: string;
    image_url: string;
  };
  created_at: string;
}

interface AttendedEvent {
  id: string;
  event: {
    id: string;
    title: string;
    venue_name: string;
    date: string;
    image_url: string;
  };
  checked_in_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<AttendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('saved');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user && profile) {
      fetchData();
    }
  }, [user, profile, navigate]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch achievements
      const achievements = await getUserAchievements(user.id);
      setUserAchievements(achievements);

      // Fetch saved events (wishlist)
      const { data: wishlists } = await supabase
        .from('event_wishlists')
        .select(`
          id,
          created_at,
          event:events (id, title, venue_name, date, image_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setSavedEvents((wishlists as any) || []);

      // Fetch attended events (check-ins)
      const { data: checkins } = await supabase
        .from('event_checkins')
        .select(`
          id,
          checked_in_at,
          event:events (id, title, venue_name, date, image_url)
        `)
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false });
      
      setAttendedEvents((checkins as any) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Signed out');
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  const xpProgress = getXPProgress(profile.xp || 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-xl">Profile</h1>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Avatar & Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="relative inline-block">
            <img
              src={profile.avatar_url || '/placeholder.svg'}
              alt={profile.display_name}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary mx-auto"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold mt-3">
            {profile.display_name}
            {profile.age && <span className="text-muted-foreground ml-2">{profile.age}</span>}
          </h2>
          <p className="text-sm text-muted-foreground">{profile.city}</p>
        </motion.div>

        {/* XP & Level Card */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-accent" />
              <span className="font-bold">Level {profile.level || 1}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {profile.xp || 0} XP
            </span>
          </div>
          
          <div className="progress-bar mb-2">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${xpProgress.percentage}%` }}
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-right">
            {xpProgress.current} / {xpProgress.required} XP to Level {(profile.level || 1) + 1}
          </p>
          
          <div className="grid grid-cols-3 gap-4 mt-5 text-center">
            <div>
              <div className="text-xl font-bold">{savedEvents.length}</div>
              <div className="text-xs text-muted-foreground">Saved</div>
            </div>
            <div>
              <div className="text-xl font-bold text-primary">{attendedEvents.length}</div>
              <div className="text-xs text-muted-foreground">Attended</div>
            </div>
            <div>
              <div className="text-xl font-bold text-accent">{userAchievements.length}</div>
              <div className="text-xs text-muted-foreground">Badges</div>
            </div>
          </div>
        </GlassCard>

        {/* Events Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="saved" className="flex-1 gap-2">
              <Heart className="w-4 h-4" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="attended" className="flex-1 gap-2">
              <MapPinCheck className="w-4 h-4" />
              Attended
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex-1 gap-2">
              <Trophy className="w-4 h-4" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-4 space-y-3">
            {savedEvents.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No saved events yet</p>
                <button 
                  onClick={() => navigate('/')}
                  className="mt-3 text-sm text-primary"
                >
                  Browse events →
                </button>
              </GlassCard>
            ) : (
              savedEvents.map((item) => (
                <GlassCard
                  key={item.id}
                  className="p-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/event/${item.event.id}`)}
                >
                  <img
                    src={item.event.image_url || '/placeholder.svg'}
                    alt={item.event.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.event.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.event.venue_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(item.event.date), 'MMM d')}</p>
                  </div>
                  <Heart className="w-4 h-4 fill-secondary text-secondary" />
                </GlassCard>
              ))
            )}
          </TabsContent>

          <TabsContent value="attended" className="mt-4 space-y-3">
            {attendedEvents.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <MapPinCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No check-ins yet</p>
                <p className="text-xs text-muted-foreground mt-1">Check in at events to earn XP!</p>
              </GlassCard>
            ) : (
              attendedEvents.map((item) => (
                <GlassCard
                  key={item.id}
                  className="p-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/event/${item.event.id}`)}
                >
                  <img
                    src={item.event.image_url || '/placeholder.svg'}
                    alt={item.event.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.event.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.event.venue_name}</p>
                    <p className="text-xs text-primary">+50 XP earned</p>
                  </div>
                  <MapPinCheck className="w-4 h-4 text-green-500" />
                </GlassCard>
              ))
            )}
          </TabsContent>

          <TabsContent value="badges" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((achievement) => {
                const isUnlocked = userAchievements.some(ua => ua?.id === achievement.id);
                
                return (
                  <GlassCard
                    key={achievement.id}
                    className={cn(
                      'p-4 text-center',
                      !isUnlocked && 'opacity-40'
                    )}
                    hoverable={false}
                  >
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <h4 className="font-bold text-sm">{achievement.name}</h4>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    {isUnlocked && (
                      <span className="text-xs text-green-500 mt-2 block">✓ Unlocked</span>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Music Preferences */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Music Vibe</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.music_preferences?.length ? (
              profile.music_preferences.map((genre) => (
                <span key={genre} className="genre-chip selected">
                  {genre}
                </span>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No preferences set</p>
            )}
          </div>
        </section>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
