import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReferral } from '@/hooks/useReferral';
import { usePassport, Night } from '@/hooks/usePassport';
import { isFounder } from '@/lib/founder';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { AB, G, hexA, MONO, genreCol, CONIC } from '../osTheme';
import { RoadmapMaker } from '../OSRoadmaps';
import { IrlStreaks } from '../OSGamification';

const APP_URL = 'https://ahmedkvz.github.io/afterbeforeBeta/app/';
const db = supabase as any;

const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const DOW = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Kartica jedne noći (PREDLOG §6): datum → linija rute kao hero → timeline
 *  → pečati utisnuti pod uglom. Piše se sama; nijedna nije "nepotpuna". */
const NightCard = ({ n }: { n: Night }) => {
  const d = new Date(n.key + 'T12:00:00');
  const route = [...new Map(n.visits.map((v) => [v.name, v])).values()];
  return (
    <div style={{ padding: 15, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}` }}>
      <div style={{ ...LABEL }}>{DOW[d.getDay()]} {d.getDate()}. {MON[d.getMonth()]}</div>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.01em', color: AB.ink, marginTop: 6, lineHeight: 1.35 }}>
        {route.map((v, i) => (
          <span key={v.name}>{i > 0 && <span style={{ color: AB.ink3, fontWeight: 400 }}> → </span>}{v.name}</span>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: AB.ink3, marginTop: 6 }}>
        {route.map((v, i) => `${i > 0 ? ' · ' : ''}${hhmm(v.at)} ${v.name.split(' ')[0]}`).join('')}
      </div>
      {n.stamps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>
          {n.stamps.map((s, i) => (
            <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em', color: AB.acid, border: `1.5px solid ${AB.acidDim}`, borderRadius: 10, padding: '5px 10px', transform: `rotate(${i % 2 ? 2 : -2}deg)` }}>
              {s.emoji} {s.name.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** JA = PASOŠ NOĆI (PREDLOG-JA-PASOS, founder „kreni" 2026-07-29).
 *  Moja noć > moji poeni: bez sirovih brojeva, bez nula, bez quest table —
 *  jedna živa kartica (Sledeći izlazak) + dokazi (Moje noći + pečati). */
export const OSProfile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { data: referral } = useMyReferral();
  const { data: pass } = usePassport();
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editIntro, setEditIntro] = useState(false);
  const [introForm, setIntroForm] = useState({ bio: '', link: '' });

  const uploadImage = async (file: File | undefined, kind: 'cover' | 'avatar') => {
    if (!file || !user) return;
    setUploading(kind);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/profile/${kind}-${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
      if (up.error) { toast.error('Upload nije uspeo — pokušaj ponovo.'); return; }
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      const col = kind === 'cover' ? 'cover_url' : 'avatar_url';
      const { error } = await db.from('profiles').update({ [col]: pub.publicUrl }).eq('user_id', user.id);
      if (error) { toast.error('Čuvanje nije uspelo.'); return; }
      track('profile_image_set', { kind });
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
    await refreshProfile();
  };

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

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  if (!profile) return null;
  const tags: string[] = (profile.music_preferences as any) || [];
  const nights = pass?.nights || [];
  const stamps = pass?.stamps || [];
  // Kanon: cover se auto-generiše iz žanra — nikad prazan, nikad moljenje.
  const genreHue = tags[0] ? genreCol(tags[0]) : G.underground;

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', background: AB.void, paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(e.target.files?.[0], 'cover')} />
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadImage(e.target.files?.[0], 'avatar')} />

      {/* korice pasoša — žanr boji cover kad nema slike */}
      <div style={{ position: 'relative', height: 168, marginTop: -14, background: (profile as any).cover_url ? `center/cover url(${(profile as any).cover_url})` : `linear-gradient(160deg, ${hexA(genreHue, 0.26)}, oklch(0.135 0.012 285) 74%)` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, oklch(0.135 0.012 285) 4%, oklch(0.135 0.012 285 / 0.2) 45%, transparent 70%)' }} />
        <button onClick={() => coverRef.current?.click()} disabled={uploading === 'cover'} className="os-press" aria-label="Promeni cover" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', right: 14, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${AB.line2}`, cursor: 'pointer', background: 'rgba(11,11,13,.55)', backdropFilter: 'blur(8px)', fontSize: 13, color: AB.ink2 }}>{uploading === 'cover' ? '…' : '📷'}</button>
      </div>

      {/* identitet: ime + grad + žanrovi — ono što je korisnik IZABRAO */}
      <div style={{ padding: '0 18px', display: 'flex', alignItems: 'flex-end', gap: 15, marginTop: -37 }}>
        <button onClick={() => avatarRef.current?.click()} disabled={uploading === 'avatar'} className="os-press" aria-label="Promeni sliku" style={{ width: 84, height: 84, borderRadius: 24, flex: 'none', background: CONIC, padding: 2, border: 0, cursor: 'pointer' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 22, background: profile.avatar_url ? `center/cover url(${profile.avatar_url})` : AB.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{!profile.avatar_url && (uploading === 'avatar' ? '…' : '📷')}</div>
        </button>
        <div style={{ minWidth: 0, paddingBottom: 4 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: '30px', color: AB.ink, textShadow: '0 2px 14px rgba(0,0,0,.55)' }}>{profile.display_name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: AB.ink3, marginTop: 4 }}>
            {(profile.city || 'BEOGRAD').toUpperCase()}{profile.founding_raver_number ? ` · 🏴 BG #${profile.founding_raver_number}` : ''}{profile.instagram_handle ? ` · 📸 @${profile.instagram_handle}` : ''}
          </div>
          {pass?.taste && <div style={{ fontSize: 12.5, fontStyle: 'italic', color: AB.ink2, marginTop: 3 }}>{pass.taste}</div>}
        </div>
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '12px 18px 0' }}>
          {tags.slice(0, 6).map((m) => { const c = genreCol(m); return <span key={m} style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: c, border: `1px solid ${hexA(c, 0.4)}`, borderRadius: 999, padding: '6px 12px' }}>{m.toUpperCase()}</span>; })}
        </div>
      )}

      {/* bio + link */}
      <div style={{ padding: '12px 18px 0' }}>
        {!editIntro ? (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {(profile as any).bio && <div style={{ width: '100%', fontSize: 14, lineHeight: 1.55, color: AB.ink2 }}>{(profile as any).bio}</div>}
            {(profile as any).link_url && (
              <a href={(profile as any).link_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, color: AB.ink2, border: `1px solid ${AB.line2}`, borderRadius: 999, padding: '7px 13px', textDecoration: 'none' }}>
                🔗 {(() => { try { return new URL((profile as any).link_url).hostname.replace('www.', ''); } catch { return (profile as any).link_url; } })()}
              </a>
            )}
            <button onClick={() => { setIntroForm({ bio: (profile as any).bio || '', link: (profile as any).link_url || '' }); setEditIntro(true); }} className="os-press" style={{ background: 'transparent', border: 0, cursor: 'pointer', ...LABEL, padding: '7px 0' }}>
              ✎ {(profile as any).bio ? 'UREDI BIO' : 'DODAJ BIO'}
            </button>
          </div>
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

      {/* SLEDEĆI IZLAZAK — jedina živa misija, prerušena u plan (opcija B) */}
      <div style={{ margin: '20px 18px 0' }}>
        <div style={{ ...LABEL, color: AB.acid, marginBottom: 10 }}>SLEDEĆI IZLAZAK</div>
        <RoadmapMaker passport />
      </div>

      {/* MOJE NOĆI — pasoš: dokaz, ne skor. Nula se ne renderuje. */}
      <div style={{ margin: '24px 18px 0' }}>
        <div style={{ ...LABEL, marginBottom: 11 }}>MOJE NOĆI</div>
        {nights.length === 0 ? (
          <div style={{ padding: 15, borderRadius: 16, border: `1px dashed ${AB.line2}`, opacity: 0.55 }}>
            <div style={LABEL}>PET · ???</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: AB.ink2, marginTop: 6 }}>??? → ??? → ???</div>
            <div style={{ fontSize: 13, color: AB.ink2, marginTop: 9 }}>Ovde ide tvoj prvi izlazak. Petak?</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nights.slice(0, 8).map((n) => <NightCard key={n.key} n={n} />)}
          </div>
        )}
        <div style={{ fontFamily: MONO, fontSize: 10.5, color: AB.ink3, textAlign: 'center', marginTop: 12 }}>Prijaviš se kad stigneš. Pasoš se piše sam.</div>
      </div>

      {/* PEČATI — samo zarađeni + najviše jedan ghost (bez katanaca) */}
      {(stamps.length > 0 || pass?.ghost) && (
        <div style={{ margin: '24px 18px 0' }}>
          <div style={{ ...LABEL, marginBottom: 11 }}>PEČATI</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {stamps.map((s, i) => (
              <div key={s.id} style={{ padding: '10px 13px', borderRadius: 12, border: `1.5px solid ${AB.acidDim}`, transform: `rotate(${(i % 3) - 1}deg)`, maxWidth: 165 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: AB.acid }}>{s.emoji} {s.name.toUpperCase()}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: AB.ink3, marginTop: 4 }}>{s.where.toUpperCase()} · {new Date(s.earnedAt).getDate()}. {MON[new Date(s.earnedAt).getMonth()]}</div>
              </div>
            ))}
            {pass?.ghost && (
              <div style={{ padding: '10px 13px', borderRadius: 12, border: `1.5px dashed ${AB.line2}`, opacity: 0.5, maxWidth: 165 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: AB.ink2 }}>{pass.ghost.emoji} {pass.ghost.name.toUpperCase()}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: AB.ink3, marginTop: 4 }}>{pass.ghost.desc.toUpperCase()}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* tvoji ljudi — renderuje se samo kad postoji (IRL streak) */}
      <IrlStreaks compact />

      {/* EKIPA — ljudski poziv, bez brojača i bez valute */}
      {referral?.code && (
        <div style={{ margin: '24px 18px 0', padding: 16, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line2}`, borderLeft: `3px solid ${G.afterparty}` }}>
          <div style={{ ...LABEL, color: G.afterparty, marginBottom: 7 }}>EKIPA</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: AB.ink2 }}>Izlazi se u ekipi. Pozovi ih — ruta se pravi zajedno.</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, letterSpacing: '.08em', color: AB.ink }}>{referral.code}</span>
            <button onClick={shareInvite} className="os-press" style={{ flex: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#0B0B0D', background: G.afterparty, border: 0, borderRadius: 999, padding: '11px 20px' }}>Podeli</button>
          </div>
        </div>
      )}

      {/* podešavanja — sve administrativno u jednu tihu kutiju */}
      <div style={{ margin: '24px 18px 0', borderRadius: 16, overflow: 'hidden', background: AB.surface, border: `1px solid ${AB.line}` }}>
        {[
          ...(isFounder(user) ? [{ icon: '⚡', label: 'War Room (founder)', onClick: () => navigate('/warroom') }] : []),
          { icon: '✦', label: 'Upoznavanje', onClick: () => { window.dispatchEvent(new CustomEvent('os-go', { detail: 'grad' })); setTimeout(() => window.dispatchEvent(new CustomEvent('ab-grad-view', { detail: 'ljudi' })), 60); } },
          { icon: '✎', label: 'Izmeni profil', onClick: () => navigate('/onboarding') },
          { icon: '🔔', label: 'Notifikacije', onClick: () => navigate('/notifications') },
          { icon: '↩', label: 'Odjavi se', onClick: handleSignOut },
        ].map((r, i) => (
          <button key={r.label} onClick={r.onClick} className="os-press" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', background: 'transparent', border: 0, borderTop: i > 0 ? `1px solid ${AB.line}` : 'none', cursor: 'pointer' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: AB.ink3, width: 18 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 14.5, color: AB.ink }}>{r.label}</span>
            <span style={{ color: AB.ink3 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
};
