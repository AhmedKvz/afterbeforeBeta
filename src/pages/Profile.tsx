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
import { InviteCard } from '@/components/InviteCard';
import { Lucky100Modal } from '@/components/Lucky100Modal';
import { getXPProgress, ACHIEVEMENTS, getUserAchievements, checkAchievements, MORNING_STAR_ACHIEVEMENT_ID } from '@/services/gamification';
import { hueFromString, avatarGradient, initials, genreHue } from '@/lib/gradients';
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
  // Cover hue follows the user's primary genre (culture color); falls back to a name-derived hue.
  const primaryGenre = profile.music_preferences?.[0];
  const genreH = primaryGenre ? genreHue(primaryGenre) : 285;
  const hue = genreH !== 285 ? genreH : hueFromString(profile.display_name || 'AfterBefore');
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
  // Show the single NEAREST unmet milestone, not a wall of locked requirements.
  const msReqs = [
    { noun: 'nivoa', current: level, target: 10 },
    { noun: 'check-ina', current: checkinsCount, target: 25 },
    { noun: 'mečeva', current: matchesCount, target: 50 },
    { noun: 'recenzija', current: reviewsCount, target: 10 },
  ];
  const nextMs = msReqs
    .filter((r) => r.current < r.target)
    .sort((a, b) => (b.current / b.target) - (a.current / a.target))[0];

  const stats = [
    { k: checkinsCount, l: 'Mesta' },
    { k: matchesCount, l: 'Veze' },
    { k: reviewsCount, l: 'Recenzije' },
    { k: `${streak.current_streak}🔥`, l: 'Streak' },
  ];

  // Only real, implemented settings — no "coming soon" placeholders.
  const SETTINGS = [
    { icon: '🔔', label: 'Notifikacije', sub: 'Tvoja obaveštenja', onClick: () => navigate('/notifications') },
    { icon: '❓', label: 'Pomoć i podrška', sub: 'hello@afterbefore.rs', onClick: () => toast.info('Podrška: hello@afterbefore.rs') },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Signed out');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Vibe Card hero: cover (genre hue) + identity ───────────── */}
      <GradientImg hue={hue} className="h-[140px] relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 25%, var(--ab-void) 100%)' }} />
        <button
          onClick={() => navigate('/notifications')}
          className="absolute top-3 right-3 w-[34px] h-[34px] rounded-full backdrop-blur flex items-center justify-center"
          style={{ background: 'oklch(0.1 0.01 285 / 0.55)', color: 'var(--ab-ink)' }}
        >
          <Settings className="w-4 h-4" />
        </button>
      </GradientImg>

      <div className="px-[18px] -mt-[44px] relative">
        <div className="flex items-end gap-3">
          <div
            className="w-[84px] h-[84px] rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '3px solid var(--ab-void)' }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: avatarGradient(hue) }}>
                {initials(profile.display_name || 'AB')}
              </div>
            )}
          </div>
          <div className="mb-1 flex-1 min-w-0">
            <div className="font-extrabold text-[20px] flex items-center gap-1.5 flex-wrap leading-tight" style={{ color: 'var(--ab-ink)', letterSpacing: '-0.01em' }}>
              <span className="truncate">{profile.display_name}</span>
              {profile.instagram_verified && <span className="text-blue-400 text-sm">✓</span>}
              {profile.is_founding_raver && (
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 align-middle"
                  style={{ background: 'oklch(0.62 0.25 300 / 0.18)', color: 'oklch(0.78 0.18 300)', border: '1px solid oklch(0.62 0.25 300 / 0.45)' }}
                >
                  🏴 {profile.founding_raver_number ? `#${profile.founding_raver_number}` : 'OG'}
                </span>
              )}
            </div>
            <div className="text-xs truncate mt-0.5" style={{ color: 'var(--ab-ink-3)' }}>
              {profile.instagram_handle ? `@${profile.instagram_handle}` : profile.city || 'Belgrade'}
              {profile.instagram_handle && profile.city ? ` · ${profile.city}` : ''}
            </div>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            style={{ border: '1px solid var(--ab-hairline-strong)', color: 'var(--ab-ink-2)' }}
          >
            <Edit2 className="w-3 h-3" /> Izmeni
          </button>
        </div>

        {/* Genre tags — the vibe, colored by the culture wheel */}
        {profile.music_preferences?.length ? (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {profile.music_preferences.slice(0, 5).map((g) => {
              const gh = genreHue(g);
              return (
                <span
                  key={g}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ color: `oklch(0.80 0.13 ${gh})`, background: `oklch(0.64 0.18 ${gh} / 0.12)`, border: `1px solid oklch(0.64 0.18 ${gh} / 0.4)` }}
                >
                  {g}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Stat row — human language */}
      <div className="px-[18px] pt-4 pb-3.5 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.l} className="py-2.5 px-2 text-center rounded-2xl" style={{ background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }}>
            <div className="font-extrabold text-lg tabular-nums" style={{ color: 'var(--ab-ink)' }}>{s.k}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ab-ink-3)' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Archetype — slim strip, shows the NEXT milestone (amber is the archetype's culture color) */}
      <div
        className="mx-[18px] mb-3 p-3.5 rounded-2xl overflow-hidden relative"
        style={
          hasMorningStar
            ? { background: 'linear-gradient(135deg, oklch(0.30 0.14 75 / 0.35), oklch(0.20 0.06 75 / 0.2))', border: '1px solid oklch(0.55 0.16 75 / 0.5)', boxShadow: '0 0 32px oklch(0.80 0.15 75 / 0.14)' }
            : { background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }
        }
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">🌅</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[15px] font-extrabold" style={{ color: hasMorningStar ? 'oklch(0.85 0.14 75)' : 'var(--ab-ink)' }}>
                MorningStar
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                style={hasMorningStar
                  ? { color: 'oklch(0.85 0.14 75)', background: 'oklch(0.55 0.16 75 / 0.18)' }
                  : { color: 'var(--ab-ink-3)' }}>
                {hasMorningStar ? 'Otključano' : `${morningStarProgress}%`}
              </div>
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ab-ink-3)' }}>
              {hasMorningStar
                ? 'Preživeo si noć, izneo after i postao scene signal.'
                : nextMs
                  ? `Još ${nextMs.target - nextMs.current} ${nextMs.noun} do najjačeg statusa`
                  : 'Najjači AfterBefore identitet.'}
            </div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ab-hairline)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${hasMorningStar ? 100 : morningStarProgress}%`,
                  background: 'linear-gradient(90deg, oklch(0.80 0.15 75), oklch(0.85 0.16 60))',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Level — slim, acid is the single hero glow here */}
      <div className="mx-[18px] mb-3.5 p-3.5 rounded-2xl" style={{ background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }}>
        <div className="flex items-end justify-between mb-2">
          <div className="text-[11px] font-extrabold tracking-[0.1em] uppercase" style={{ color: 'var(--ab-ink-3)' }}>Nivo {level}</div>
          <div className="font-extrabold text-base tabular-nums" style={{ color: 'var(--ab-ink)' }}>{(profile.xp || 0).toLocaleString()} XP</div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--ab-hairline)' }}>
          <div className="h-full rounded-full ab-acid-fill" style={{ width: `${xpProgress.percentage}%` }} />
        </div>
        <div className="flex justify-between text-[10px] mt-1.5" style={{ color: 'var(--ab-ink-3)' }}>
          <span className="tabular-nums">{Math.max(xpProgress.required - xpProgress.current, 0).toLocaleString()} do Lv. {level + 1}</span>
          <span className="tabular-nums">{xpProgress.required.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Share-to-earn — invite the crew */}
      <div className="px-4 mb-3.5">
        <InviteCard />
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

      {/* Founding Raver badge */}
      {/* Badges */}
      <div className="px-[18px] mb-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold tracking-[0.12em]" style={{ color: 'var(--ab-ink-3)' }}>BEDŽEVI</span>
          {unlocked.length > 0 && <span className="text-[11px]" style={{ color: 'var(--ab-ink-3)' }}>{unlocked.length} zarađeno</span>}
        </div>
        {unlocked.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ab-ink-3)' }}>Još nema bedževa — zaradi ih kroz check-in, veze i recenzije.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {unlocked.map((b) => {
              const isMs = b.id === MORNING_STAR_ACHIEVEMENT_ID;
              return (
                <div
                  key={b.id}
                  className="min-w-[78px] py-3 px-2 rounded-2xl text-center"
                  style={isMs
                    ? { background: 'oklch(0.55 0.16 75 / 0.12)', border: '1px solid oklch(0.55 0.16 75 / 0.45)' }
                    : { background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }}
                >
                  <div className="text-[26px] mb-1">{b.icon}</div>
                  <div className="text-[10px] font-medium leading-tight" style={{ color: 'var(--ab-ink-3)' }}>{b.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All achievements */}
      <div className="px-[18px] mb-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4" style={{ color: 'var(--ab-acid-dim)' }} />
          <span className="text-[11px] font-extrabold tracking-[0.12em]" style={{ color: 'var(--ab-ink-3)' }}>SVA POSTIGNUĆA</span>
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
                {isUnlocked && <span className="text-[10px] mt-1.5 block" style={{ color: 'var(--ab-acid)' }}>✓ Otključano</span>}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Settings list */}
      <div className="px-[18px] mb-3.5">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)' }}>
          {SETTINGS.map((r, i) => (
            <button
              key={r.label}
              onClick={r.onClick}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              style={i > 0 ? { borderTop: '1px solid var(--ab-hairline)' } : undefined}
            >
              <span className="text-lg">{r.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--ab-ink)' }}>{r.label}</div>
                {r.sub && <div className="text-[11px]" style={{ color: 'var(--ab-ink-3)' }}>{r.sub}</div>}
              </div>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--ab-ink-3)' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="px-[18px]">
        <button
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{ background: 'oklch(0.64 0.22 22 / 0.1)', color: 'oklch(0.70 0.20 22)' }}
        >
          <LogOut className="w-5 h-5" /> Odjavi se
        </button>
      </div>
      <BottomNav />
      <Lucky100Modal isOpen={isLucky100ModalOpen} onClose={() => setIsLucky100ModalOpen(false)} />
    </div>
  );
};

export default Profile;