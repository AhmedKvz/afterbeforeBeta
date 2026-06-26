import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStreak } from '@/hooks/useQuestSystem';
import { useMyReferral } from '@/hooks/useReferral';
import { isFounder } from '@/lib/founder';
import { getXPProgress, ACHIEVEMENTS, getUserAchievements, MORNING_STAR_ACHIEVEMENT_ID } from '@/services/gamification';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { OS, G, hexA, MONO, genreCol, CONIC } from '../osTheme';

const APP_URL = 'https://ahmedkvz.github.io/afterbeforeBeta/app/';

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n: number) => ROMAN[n] || `${n}`;

export const OSProfile = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { streak } = useStreak();
  const { data: referral } = useMyReferral();
  const [ach, setAch] = useState<any[]>([]);

  useEffect(() => { if (user) getUserAchievements(user.id).then(setAch).catch(() => {}); }, [user]);

  const shareInvite = async () => {
    const code = referral?.code;
    if (!code) return;
    const url = `${APP_URL}#/?ref=${code}`;
    const text = `Uđi u AfterBefore — Nightlife OS za Beograd. Kod: ${code}`;
    track('referral_share', { code });
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'AfterBefore', text, url }); }
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast.success('Link kopiran ✓'); }
    } catch { /* user cancelled */ }
  };

  const handleSignOut = async () => { await signOut(); navigate('/auth'); toast.success('Odjavljen/a'); };

  const { data: counts } = useQuery({
    queryKey: ['os-profile-counts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [ci, rv] = await Promise.all([
        supabase.from('event_checkins').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('event_reviews').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      return { checkins: ci.count ?? 0, reviews: rv.count ?? 0 };
    },
  });

  if (!profile) return null;
  const xpProg = getXPProgress(profile.xp || 0);
  const level = profile.level || 1;
  const unlocked = ACHIEVEMENTS.filter((a) => ach.some((ua) => ua?.id === a.id));

  const stats = [
    { value: String(counts?.checkins ?? (profile as any).events_attended ?? 0), label: 'MESTA', color: G.techno },
    { value: String((profile as any).total_matches ?? 0), label: 'VEZE', color: G.underground },
    { value: String(streak.current_streak), label: 'STREAK', color: G.festival },
    { value: String(counts?.reviews ?? 0), label: 'RECENZIJE', color: G.community },
    { value: roman(level), label: 'RANK', color: G.house },
    { value: profile.founding_raver_number ? `#${profile.founding_raver_number}` : '—', label: 'GRAD', color: G.afterparty },
  ];

  const tags: string[] = (profile.music_preferences as any) || [];

  const achList = ACHIEVEMENTS.slice(0, 4).map((a) => {
    const isUnlocked = unlocked.some((u) => u.id === a.id);
    const isMs = a.id === MORNING_STAR_ACHIEVEMENT_ID;
    const col = isMs ? G.house : G.community;
    return {
      icon: a.icon, title: a.name, desc: a.description, locked: !isUnlocked,
      iconBg: isUnlocked ? hexA(col, 0.14) : 'rgba(255,255,255,.05)', iconFg: isUnlocked ? col : OS.ink7,
      border: isUnlocked ? hexA(col, 0.25) : OS.line, titleCol: isUnlocked ? OS.ink : OS.ink5,
    };
  });

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      {/* identity */}
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 15 }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, flex: 'none', background: CONIC, padding: 2 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 20, background: profile.avatar_url ? `center/cover url(${profile.avatar_url})` : OS.surface2 }} />
        </div>
        <div>
          <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-.02em', color: OS.ink }}>{profile.display_name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: G.underground, marginTop: 3 }}>
            EXPLORER RANK {roman(level)}{profile.founding_raver_number ? ` · 🏴 BG #${profile.founding_raver_number}` : ''}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: OS.ink5, marginTop: 3 }}>
            {profile.instagram_handle ? `📸 @${profile.instagram_handle} · ` : ''}{(profile.city || 'BEOGRAD').toUpperCase()}
          </div>
        </div>
      </div>

      {/* rank bar */}
      <div style={{ margin: '18px 16px 0', padding: 15, borderRadius: 16, background: OS.surface, border: `1px solid ${OS.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, marginBottom: 9 }}>
          <span style={{ color: OS.ink4 }}>RANK {roman(level)} → {roman(level + 1)}</span>
          <span style={{ color: G.underground }}>{xpProg.current} / {xpProg.required} XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${xpProg.percentage}%`, background: 'linear-gradient(90deg,#a64dff,#56d6e6)', borderRadius: 4 }} /></div>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, padding: '16px 16px 0' }}>
        {stats.map((p) => (
          <div key={p.label} style={{ padding: 13, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}`, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 20, color: p.color }}>{p.value}</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', color: OS.ink6, marginTop: 4 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* music DNA */}
      {tags.length > 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 10 }}>[ MUSIC DNA ]</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.slice(0, 6).map((m) => { const c = genreCol(m); return <span key={m} style={{ fontFamily: MONO, fontSize: 11, color: c, border: `1px solid ${hexA(c, 0.4)}`, borderRadius: 999, padding: '6px 12px' }}>{m.toUpperCase()}</span>; })}
          </div>
        </div>
      )}

      {/* achievements */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 11 }}>[ ACHIEVEMENTS ]</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {achList.map((a) => (
            <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 14, background: OS.surface, border: `1px solid ${a.border}` }}>
              <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: a.iconFg }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 560, color: a.titleCol }}>{a.title}</div>
                <div style={{ fontSize: 11, color: OS.ink5, marginTop: 2 }}>{a.desc}</div>
              </div>
              {a.locked && <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink7 }}>🔒</span>}
            </div>
          ))}
        </div>
      </div>

      {/* invite — share to earn */}
      {referral?.code && (
        <div style={{ margin: '20px 16px 0', padding: 16, borderRadius: 18, background: `linear-gradient(140deg,${hexA(G.afterparty, 0.12)},transparent)`, border: `1px solid ${hexA(G.afterparty, 0.25)}` }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: G.afterparty, marginBottom: 8 }}>[ POZOVI EKIPU ]</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, letterSpacing: '.08em', color: OS.ink }}>{referral.code}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 4 }}>{referral.invited} POZVANO · {referral.converted} STIGLO · +{referral.afc_per_convert} AFC</div>
            </div>
            <button onClick={shareInvite} style={{ flex: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#0B0B0D', background: G.afterparty, border: 0, borderRadius: 13, padding: '12px 18px' }}>Podeli</button>
          </div>
        </div>
      )}

      {/* actions */}
      <div style={{ margin: '16px 16px 0', borderRadius: 16, overflow: 'hidden', background: OS.surface, border: `1px solid ${OS.line}` }}>
        {[
          ...(isFounder(user) ? [{ icon: '⚡', label: 'War Room (founder)', onClick: () => navigate('/warroom') }] : []),
          { icon: '✎', label: 'Izmeni profil', onClick: () => navigate('/onboarding') },
          { icon: '🔔', label: 'Notifikacije', onClick: () => navigate('/notifications') },
        ].map((r, i) => (
          <button key={r.label} onClick={r.onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', background: 'transparent', border: 0, borderTop: i > 0 ? `1px solid ${OS.line}` : 'none', cursor: 'pointer' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: OS.ink5, width: 18 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 14, color: OS.ink }}>{r.label}</span>
            <span style={{ color: OS.ink6 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <button onClick={handleSignOut} style={{ width: '100%', padding: 14, borderRadius: 14, background: hexA(G.afterparty, 0.1), color: G.afterparty, fontWeight: 600, fontSize: 14, border: 0, cursor: 'pointer' }}>Odjavi se</button>
      </div>
    </div>
  );
};
