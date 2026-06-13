import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Edit2, Trophy, LogOut, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreak } from '@/hooks/useQuestSystem';
import { GlassCard } from '@/components/GlassCard';
import { GradientImg } from '@/components/GradientImg';
import { BottomNav } from '@/components/BottomNav';
import { Lucky100ProfileSection } from '@/components/Lucky100ProfileSection';
import { NightlifeTimeline } from '@/components/NightlifeTimeline';
import { YourNights } from '@/components/YourNights';
import { MementoRequests } from '@/components/MementoRequests';
import { Lucky100Modal } from '@/components/Lucky100Modal';
import { getXPProgress, ACHIEVEMENTS, getUserAchievements, checkAchievements, MORNING_STAR_ACHIEVEMENT_ID } from '@/services/gamification';
import { hueFromString, avatarGradient, initials } from '@/lib/gradients';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { streak } = useStreak();
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [isLucky100ModalOpen, setIsLucky100ModalOpen] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (user && profile) {
      // re-evaluate achievements (auto-awards MorningStar etc. if criteria met), then load
      checkAchievements(user.id)
        .catch(() => {})
        .finally(() => getUserAchievements(user.id).then(setUserAchievements).catch(() => {}));
    }
  }, [user, profile, navigate]);

  // real counts for the stat row
  const { data: counts } = useQuery({
    queryKey: ['profile-counts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [checkins, reviews] = await Promise.all([
        supabase.from('event_checkins').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('event_reviews').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      return { checkins: checkins.count ?? 0, reviews: reviews.count ?? 0 };
    },
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  const xpProgress = getXPProgress(profile.xp || 0);
  const level = profile.level || 1;
  const hue = hueFromString(profile.display_name || 'AfterBefore');
  const unlocked = ACHIEVEMENTS.filter((a) => userAchievements.some((ua) => ua?.id === a.id));
  const hasMorningStar = unlocked.some((a) => a.id === MORNING_STAR_ACHIEVEMENT_ID);
  const checkinsCount = counts?.checkins ?? profile.events_attended ?? 0;
  const matchesCount = profile.total_matches ?? 0;
  const reviewsCount = counts?.reviews ?? 0;
  const morningStarProgress = Math.min(100, Math.round((
    Math.min(level, 10) / 10 +
    Math.min(checkinsCount, 25) / 25 +
    Math.min(matchesCount, 50) / 50 +
    Math.min(reviewsCount, 10) / 10
  ) / 4 * 100));
  const morningStarRequirements = [
    { label: 'Lv. 10', current: level, target: 10 },
    { label: '25 Check-ins', current: checkinsCount, target: 25 },
    { label: '50 Matches', current: matchesCount, target: 50 },
    { label: '10 Reviews', current: reviewsCount, target: 10 },
  ];

  const stats = [
    { k: checkinsCount, l: 'Check-ins' },
    { k: matchesCount, l: 'Matches' },
    { k: reviewsCount, l: 'Reviews' },
    { k: `${streak.current_streak}d`, l: 'Streak' },
  ];

  const SETTINGS = [
    { icon: '📷', label: 'Photos', sub: 'Manage your photos', onClick: () => toast.info('Photo manager coming soon') },
    { icon: '🔔', label: 'Notifications', sub: 'View your alerts', onClick: () => navigate('/notifications') },
    { icon: '🔒', label: 'Privacy', sub: 'Verified only', onClick: () => toast.info('Privacy settings coming soon') },
    { icon: '💳', label: 'Payment methods', sub: 'Add a card', onClick: () => toast.info('Payments coming soon') },
    { icon: '❓', label: 'Help & support', onClick: () => toast.info('Support: hello@afterbefore.rs') },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Signed out');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Cover + avatar */}
      <GradientImg hue={hue} className="h-[130px] relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,10,0.85) 100%)' }} />
        <button
          onClick={() => navigate('/notifications')}
          className="absolute top-3 right-3 w-[34px] h-[34px] rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white"
        >
          <Settings className="w-4 h-4" />
        </button>
      </GradientImg>

      <div className="px-4 -mt-[42px] relative">
        <div className="flex items-end gap-3">
          <div className="w-[84px] h-[84px] rounded-full border-[3px] border-background overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: avatarGradient(hue) }}>
                {initials(profile.display_name || 'AB')}
              </div>
            )}
          </div>
          <div className="mb-1.5 flex-1 min-w-0">
            <div className="font-extrabold text-[19px] flex items-center gap-1.5">
              {profile.display_name}
              {profile.instagram_verified && <span className="text-blue-500 text-sm">✓</span>}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.instagram_handle ? `@${profile.instagram_handle}` : profile.city || 'Belgrade'}
              {profile.instagram_handle && profile.city ? ` · ${profile.city}` : ''}
            </div>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="border border-border-strong px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
      </div>

      {/* Vibe Archetype */}
      <div className={cn(
        'mx-4 mt-4 mb-3.5 p-4 rounded-3xl border overflow-hidden relative',
        hasMorningStar
          ? 'border-amber-300/50 bg-gradient-to-br from-amber-300/20 via-primary/15 to-secondary/10 shadow-[0_0_38px_rgba(251,191,36,0.16)]'
          : 'border-accent/25 bg-gradient-to-br from-white/[0.06] to-accent/10'
      )}>
        <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="flex items-start justify-between gap-3 relative">
          <div>
            <div className="text-[10px] font-black tracking-[0.18em] text-muted-foreground uppercase">
              Vibe Archetype · Apex Achievement
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-3xl">🌅</span>
              <div>
                <div className={cn('text-2xl font-black leading-none', hasMorningStar ? 'text-amber-200' : 'text-foreground')}>
                  MorningStar
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {hasMorningStar
                    ? 'You survived the night, carried the after and became scene signal.'
                    : 'Locked: the strongest AfterBefore identity status.'}
                </div>
              </div>
            </div>
          </div>
          <div className={cn(
            'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.12em] border',
            hasMorningStar ? 'border-amber-300/50 text-amber-200 bg-amber-300/10' : 'border-border text-muted-foreground bg-black/20'
          )}>
            {hasMorningStar ? 'Unlocked' : `${morningStarProgress}%`}
          </div>
        </div>

        <div className="mt-4 h-1.5 rounded bg-white/[0.08] overflow-hidden relative">
          <div
            className="h-full rounded bg-gradient-to-r from-amber-300 via-primary to-secondary"
            style={{ width: `${hasMorningStar ? 100 : morningStarProgress}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {morningStarRequirements.map((r) => {
            const complete = r.current >= r.target;
            return (
              <div
                key={r.label}
                className={cn(
                  'rounded-2xl border px-3 py-2',
                  complete ? 'border-amber-300/40 bg-amber-300/10' : 'border-border bg-black/10'
                )}
              >
                <div className="text-[10px] text-muted-foreground">{r.label}</div>
                <div className={cn('text-sm font-extrabold', complete && 'text-amber-200')}>
                  {Math.min(r.current, r.target)} / {r.target}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level card */}
      <div className="mx-4 mt-4 mb-3.5 p-3.5 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-secondary/10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground">LEVEL {level} · NIGHT OWL</div>
            <div className="font-extrabold text-xl text-accent mt-0.5">{(profile.xp || 0).toLocaleString()} XP</div>
          </div>
          <button onClick={() => navigate('/leaderboard')} className="bg-white/[0.08] px-3 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1">
            Rank <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="h-1.5 rounded bg-white/[0.08] overflow-hidden">
          <div className="h-full rounded bg-gradient-to-r from-primary to-secondary" style={{ width: `${xpProgress.percentage}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
          <span>{Math.max(xpProgress.required - xpProgress.current, 0).toLocaleString()} to Lv. {level + 1}</span>
          <span>{xpProgress.required.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Stat row */}
      <div className="px-4 pb-3.5 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.l} className="py-2.5 px-2 text-center rounded-2xl bg-card border border-border">
            <div className="font-extrabold text-lg">{s.k}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Pending unlock requests (owner) */}
      <MementoRequests />

      {/* Your nights — party diary with mementos */}
      <YourNights />

      {/* Nightlife Timeline */}
      <NightlifeTimeline />

      {/* Lucky 100 */}
      <div className="px-4 mb-3.5">
        <Lucky100ProfileSection onOpenModal={() => setIsLucky100ModalOpen(true)} />
      </div>

      {/* Badges */}
      <div className="px-4 mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">BADGES</span>
          {unlocked.length > 0 && <span className="text-[11px] text-muted-foreground">{unlocked.length} earned</span>}
        </div>
        {unlocked.length === 0 ? (
          <p className="text-xs text-muted-foreground">No badges yet — earn them by checking in, matching and reviewing.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {unlocked.map((b) => (
              <div key={b.id} className={cn(
                'min-w-[78px] py-3 px-2 rounded-2xl bg-card border text-center',
                b.id === MORNING_STAR_ACHIEVEMENT_ID ? 'border-amber-300/50 bg-amber-300/10' : 'border-border'
              )}>
                <div className="text-[26px] mb-1">{b.icon}</div>
                <div className="text-[10px] text-muted-foreground font-medium leading-tight">{b.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Music taste */}
      <div className="px-4 mb-3.5">
        <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">MUSIC TASTE</span>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {profile.music_preferences?.length ? (
            profile.music_preferences.map((g, i) => (
              <span
                key={g}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-semibold border',
                  i < 3 ? 'bg-accent/15 text-accent border-accent/40' : 'bg-white/[0.06] text-muted-foreground border-border'
                )}
              >
                {g}
              </span>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No preferences set</p>
          )}
        </div>
      </div>

      {/* All achievements */}
      <div className="px-4 mb-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-accent" />
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">ALL ACHIEVEMENTS</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlocked.some((u) => u.id === a.id);
            const isMorningStar = a.id === MORNING_STAR_ACHIEVEMENT_ID;
            return (
              <GlassCard
                key={a.id}
                className={cn(
                  'p-3 text-center',
                  !isUnlocked && 'opacity-50',
                  isMorningStar && 'border-amber-300/40 bg-amber-300/10'
                )}
                hoverable={false}
              >
                <div className="text-2xl mb-1">{a.icon}</div>
                <h4 className={cn('font-bold text-[13px]', isMorningStar && 'text-amber-200')}>{a.name}</h4>
                <p className="text-[11px] text-muted-foreground">{a.description}</p>
                {isUnlocked && <span className="text-[10px] text-success mt-1.5 block">✓ Unlocked</span>}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Settings list */}
      <div className="px-4 mb-3.5">
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          {SETTINGS.map((r, i) => (
            <button
              key={r.label}
              onClick={r.onClick}
              className={cn('flex w-full items-center gap-3 px-3.5 py-3 text-left', i > 0 && 'border-t border-border')}
            >
              <span className="text-lg">{r.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-medium">{r.label}</div>
                {r.sub && <div className="text-[11px] text-muted-foreground">{r.sub}</div>}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-faint" />
            </button>
          ))}
        </div>
      </div>

      {/* Connect Instagram (real feature) */}
      {!profile.instagram_verified && (
        <div className="px-4 mb-3.5">
          <button
            onClick={() => toast.info('Instagram connection coming soon!')}
            className="w-full py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 border border-pink-500/30"
          >
            📸 Connect Instagram
          </button>
        </div>
      )}

      {/* Sign out */}
      <div className="px-4">
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>
      <BottomNav />
      <Lucky100Modal isOpen={isLucky100ModalOpen} onClose={() => setIsLucky100ModalOpen(false)} />
    </div>
  );
};

export default Profile;