import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Settings, Edit2, Camera, Star, Music, 
  Calendar, Heart, Trophy, LogOut 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { BottomNav } from '@/components/BottomNav';
import { Lucky100ProfileSection } from '@/components/Lucky100ProfileSection';
import { Lucky100Modal } from '@/components/Lucky100Modal';
import { getXPProgress, ACHIEVEMENTS, getUserAchievements } from '@/services/gamification';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLucky100ModalOpen, setIsLucky100ModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user && profile) {
      fetchAchievements();
    }
  }, [user, profile, navigate]);

  const fetchAchievements = async () => {
    if (!user) return;
    
    try {
      const achievements = await getUserAchievements(user.id);
      setUserAchievements(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Signed out successfully');
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
              className="w-28 h-28 rounded-full object-cover border-4 border-primary mx-auto"
            />
            <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-2xl font-bold mt-4">
            <span className="flex items-center justify-center gap-2">
              {profile.display_name}
              {profile.instagram_verified && (
                <span className="text-sm text-primary" title="Instagram verified">📸✓</span>
              )}
              {profile.age && <span className="text-muted-foreground ml-1">{profile.age}</span>}
            </span>
          </h2>
          {profile.instagram_handle && (
            <p className="text-sm text-muted-foreground">@{profile.instagram_handle}</p>
          )}
          <p className="text-muted-foreground">{profile.city}</p>

          {/* Instagram connect button */}
          {!profile.instagram_verified && (
            <button
              onClick={() => toast.info('Instagram connection coming soon!')}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 border border-pink-500/30 text-foreground"
            >
              📸 Connect Instagram
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
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
          
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div>
              <div className="text-2xl font-bold">{profile.events_attended || 0}</div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">{profile.total_matches || 0}</div>
              <div className="text-xs text-muted-foreground">Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{userAchievements.length}</div>
              <div className="text-xs text-muted-foreground">Badges</div>
            </div>
          </div>
        </GlassCard>

        {/* Lucky 100 Section */}
        <Lucky100ProfileSection onOpenModal={() => setIsLucky100ModalOpen(true)} />

        {/* Music Preferences */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Music Preferences</h3>
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

        {/* Achievements */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-bold">Achievements</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = userAchievements.some(ua => ua?.id === achievement.id);
              
              return (
                <GlassCard
                  key={achievement.id}
                  className={cn(
                    'p-4 text-center',
                    !isUnlocked && 'opacity-50'
                  )}
                  hoverable={false}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <h4 className="font-bold text-sm">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  {isUnlocked && (
                    <span className="text-xs text-success mt-2 block">✓ Unlocked</span>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </section>

        {/* Bio */}
        {profile.bio && (
          <section>
            <h3 className="font-bold mb-2">About</h3>
            <p className="text-muted-foreground">{profile.bio}</p>
          </section>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <BottomNav />

      {/* Lucky 100 Modal */}
      <Lucky100Modal 
        isOpen={isLucky100ModalOpen} 
        onClose={() => setIsLucky100ModalOpen(false)} 
      />
    </div>
  );
};

export default Profile;
