import { useState, useEffect, useRef } from 'react';
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
import { AB, OS, G, hexA, MONO, genreCol, CONIC } from '../osTheme';

const APP_URL = 'https://ahmedkvz.github.io/afterbeforeBeta/app/';

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n: number) => ROMAN[n] || `${n}`;

const db = supabase as any;

export const OSProfile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { streak } = useStreak();
  const { data: referral } = useMyReferral();
  const [ach, setAch] = useState<any[]>([]);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editIntro, setEditIntro] = useState(false);
  const [introForm, setIntroForm] = useState({ bio: '', link: '' });

  // Cover/avatar upload — isti media bucket i šablon kao venue self-serve.
  const uploadImage = async (file: File | undefined, kind: 'cover' | 'avatar') => {
    if (!file || !user) return;
    setUploading(kind);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      // storage polisa: prvi folder MORA biti auth.uid() (media own upload)
      const path = `${user.id}/profile/${kind}-${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
      if (up.error) { toast.error('Upload nije uspeo — pokušaj ponovo.'); return; }
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      const col = kind === 'cover' ? 'cover_url' : 'avatar_url';
      const { error } = await db.from('profiles').update({ [col]: pub.publicUrl }).eq('user_id', user.id);
      if (error) { toast.error('Čuvanje nije uspelo.'); return; }
      track('profile_image_set', { kind });
      toast.success(kind === 'cover' ? 'Cover postavljen ✓' : 'Slika postavljena ✓');
      await refreshProfile();
    } finally { setUploading(null); }
  };

  const saveIntro = async () => {
    if (!user) return;
    const link = introForm.link.trim();
    const normalized = link && !/^https?:\/\//i.test(link) ? `https://${link}` : link;
    const { error } = await db.from('profiles').update({ bio: introForm.bio.trim() || null, link_url: normalized || null }).eq('user_id', user.id);
    if (error) { toast.error('Čuvanje nije uspelo.'); return; }
    setEditIntro(false);
    toast.success('Intro sačuvan ✓');
    await refreshProfile();
  };

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
        supabase.from('venue_checkins').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
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
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', background: AB.void, paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      {/* cover — cinematic hero kao na venue sheetu; 📷 za upload */}
      <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(e.target.files?.[0], 'cover')} />
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(e.target.files?.[0], 'avatar')} />
      <div style={{ position: 'relative', height: 172, marginTop: -14, background: (profile as any).cover_url ? `center/cover url(${(profile as any).cover_url})` : 'linear-gradient(160deg, oklch(0.62 0.25 300 / 0.22), oklch(0.135 0.012 285) 72%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.135 0.012 285) 4%, oklch(0.135 0.012 285 / 0.2) 45%, transparent 70%)' }} />
        <button onClick={() => coverRef.current?.click()} disabled={uploading === 'cover'} className="os-press" aria-label="Promeni cover" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', right: 14, minHeight: 34, padding: '7px 13px', borderRadius: 999, border: `1px solid ${AB.line2}`, cursor: 'pointer', background: 'rgba(11,11,13,.62)', backdropFilter: 'blur(8px)', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: AB.ink2 }}>{uploading === 'cover' ? '…' : (profile as any).cover_url ? '📷 COVER' : '📷 DODAJ COVER'}</button>
      </div>

      {/* identity — vibe card: pročitaš je za 3 sekunde (kanon §9) */}
      <div style={{ padding: '0 18px', display: 'flex', alignItems: 'flex-end', gap: 15, marginTop: -37 }}>
        <button onClick={() => avatarRef.current?.click()} disabled={uploading === 'avatar'} className="os-press" aria-label="Promeni sliku" style={{ width: 84, height: 84, borderRadius: 24, flex: 'none', background: CONIC, padding: 2, border: 0, cursor: 'pointer', position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 22, background: profile.avatar_url ? `center/cover url(${profile.avatar_url})` : AB.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{!profile.avatar_url && (uploading === 'avatar' ? '…' : '📷')}</div>
        </button>
        <div style={{ minWidth: 0, paddingBottom: 4 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: '30px', color: AB.ink, textShadow: '0 2px 14px rgba(0,0,0,.55)' }}>{profile.display_name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', color: AB.uv, marginTop: 4 }}>
            EXPLORER RANK {roman(level)}{profile.founding_raver_number ? ` · 🏴 BG #${profile.founding_raver_number}` : ''}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: AB.ink3, marginTop: 3 }}>
            {profile.instagram_handle ? `📸 @${profile.instagram_handle} · ` : ''}{(profile.city || 'BEOGRAD').toUpperCase()}
          </div>
        </div>
      </div>

      {/* žanr tagovi odmah pod imenom (kanon: genre tags under the name) */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '12px 18px 0' }}>
          {tags.slice(0, 6).map((m) => { const c = genreCol(m); return <span key={m} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: c, border: `1px solid ${hexA(c, 0.4)}`, borderRadius: 999, padding: '6px 12px' }}>{m.toUpperCase()}</span>; })}
        </div>
      )}

      {/* intro — bio + link (uredi inline) */}
      <div style={{ padding: '12px 18px 0' }}>
        {!editIntro ? (
          <>
            {(profile as any).bio && <div style={{ fontSize: 14, lineHeight: 1.55, color: AB.ink2 }}>{(profile as any).bio}</div>}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: (profile as any).bio ? 10 : 0 }}>
              {(profile as any).link_url && (
                <a href={(profile as any).link_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, color: AB.ink2, border: `1px solid ${AB.line2}`, borderRadius: 999, padding: '7px 13px', textDecoration: 'none' }}>
                  🔗 {(() => { try { return new URL((profile as any).link_url).hostname.replace('www.', ''); } catch { return (profile as any).link_url; } })()}
                </a>
              )}
              <button onClick={() => { setIntroForm({ bio: (profile as any).bio || '', link: (profile as any).link_url || '' }); setEditIntro(true); }} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: AB.ink3, padding: '7px 0' }}>
                ✎ {(profile as any).bio || (profile as any).link_url ? 'UREDI INTRO' : 'DODAJ INTRO + LINK'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}` }}>
            <textarea value={introForm.bio} onChange={(e) => setIntroForm({ ...introForm, bio: e.target.value })} maxLength={160} rows={3} placeholder="Ko si na sceni? (do 160 znakova)" style={{ width: '100%', resize: 'none', background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, color: AB.ink, outline: 'none', fontFamily: 'inherit' }} />
            <input value={introForm.link} onChange={(e) => setIntroForm({ ...introForm, link: e.target.value })} placeholder="Link (IG, SoundCloud, sajt…)" style={{ width: '100%', marginTop: 8, background: AB.void, border: `1px solid ${AB.line2}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: AB.ink, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setEditIntro(false)} className="os-press" style={{ flex: 'none', padding: '9px 14px', borderRadius: 999, background: 'transparent', border: `1px solid ${AB.line2}`, color: AB.ink3, fontSize: 13, cursor: 'pointer' }}>Otkaži</button>
              <button onClick={saveIntro} className="os-press" style={{ flex: 1, padding: '9px', borderRadius: 999, background: AB.raised, border: `1px solid ${AB.line2}`, color: AB.ink, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Sačuvaj</button>
            </div>
          </div>
        )}
      </div>

      {/* rank — tanka acid traka ka SLEDEĆEM milestone-u (kanon §9) */}
      <div style={{ margin: '16px 18px 0', padding: 15, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, marginBottom: 9 }}>
          <span style={{ fontWeight: 600, letterSpacing: '.08em', color: AB.ink3 }}>RANK {roman(level)} → {roman(level + 1)}</span>
          <span style={{ color: AB.acidDim }}>{xpProg.current} / {xpProg.required} REP</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div className="ab-acid-fill" style={{ height: '100%', width: `${xpProg.percentage}%`, borderRadius: 999, transition: 'width .22s cubic-bezier(.16,1,.3,1)' }} /></div>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, padding: '16px 18px 0' }}>
        {stats.map((p) => (
          <div key={p.label} style={{ padding: 13, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}`, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 20, color: p.color }}>{p.value}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: AB.ink3, marginTop: 4 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* achievements */}
      <div style={{ margin: '20px 18px 0' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3, marginBottom: 11 }}>ACHIEVEMENTS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {achList.map((a) => (
            <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 16, background: AB.surface, border: `1px solid ${a.border}`, opacity: a.locked ? 0.66 : 1 }}>
              <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: a.iconFg }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', color: a.titleCol }}>{a.title}</div>
                <div style={{ fontSize: 12, color: AB.ink2, marginTop: 2 }}>{a.desc}</div>
              </div>
              {a.locked && <span style={{ fontFamily: MONO, fontSize: 10, color: AB.ink3 }}>🔒</span>}
            </div>
          ))}
        </div>
      </div>

      {/* invite — share to earn */}
      {referral?.code && (
        <div style={{ margin: '20px 18px 0', padding: 16, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${G.afterparty}` }}>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: G.afterparty, marginBottom: 8 }}>POZOVI EKIPU</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, letterSpacing: '.08em', color: AB.ink }}>{referral.code}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: AB.ink3, marginTop: 4 }}>{referral.invited} POZVANO · {referral.converted} STIGLO · +{referral.afc_per_convert} AFC</div>
            </div>
            <button onClick={shareInvite} className="os-press" style={{ flex: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#0B0B0D', background: G.afterparty, border: 0, borderRadius: 999, padding: '12px 20px' }}>Podeli</button>
          </div>
        </div>
      )}

      {/* actions */}
      <div style={{ margin: '16px 18px 0', borderRadius: 16, overflow: 'hidden', background: AB.surface, border: `1px solid ${AB.line}` }}>
        {[
          ...(isFounder(user) ? [{ icon: '⚡', label: 'War Room (founder)', onClick: () => navigate('/warroom') }] : []),
          { icon: '✎', label: 'Izmeni profil', onClick: () => navigate('/onboarding') },
          { icon: '🔔', label: 'Notifikacije', onClick: () => navigate('/notifications') },
        ].map((r, i) => (
          <button key={r.label} onClick={r.onClick} className="os-press" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', background: 'transparent', border: 0, borderTop: i > 0 ? `1px solid ${AB.line}` : 'none', cursor: 'pointer' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: AB.ink3, width: 18 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 14.5, color: AB.ink }}>{r.label}</span>
            <span style={{ color: AB.ink3 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 18px 0' }}>
        <button onClick={handleSignOut} className="os-press" style={{ width: '100%', padding: 14, borderRadius: 999, background: 'transparent', color: AB.ink3, fontWeight: 600, fontSize: 14, border: `1px solid ${AB.line2}`, cursor: 'pointer' }}>Odjavi se</button>
      </div>
    </div>
  );
};
