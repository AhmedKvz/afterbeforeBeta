import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Artist, ARTIST_TYPE_LABEL, useArtistGigs, useArtistGallery, useFollowArtist } from '@/hooks/useArtists';
import { useQueryClient } from '@tanstack/react-query';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { OSEventRow } from './OSEventRow';
import { AB, MONO, hexA } from './osTheme';
import { useExit } from './useExit';

const db = supabase as any;

const LABEL: React.CSSProperties = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: AB.ink3, fontWeight: 600 };

/**
 * SCENA — stranica umetnika, isti kalup kao venue sheet.
 * Cover + AMBASADOR bedž + follow + timetable (event_artists → events, piše se
 * sam) + galerija (portfolio). NAMERNO nema: booking, cene, poruke (Phase 2).
 */
export const OSArtistSheet = ({ artist, onClose }: { artist: Artist; onClose: () => void }) => {
  const { user } = useAuth();
  const { closing, close } = useExit(onClose);
  const { data: gigs } = useArtistGigs(artist.userId);
  const { data: gallery = [] } = useArtistGallery(artist.userId);
  const { following, toggle, busy } = useFollowArtist(artist.userId);
  const qc = useQueryClient();
  const own = user?.id === artist.userId;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  // portfolio upload — samo na sopstvenoj stranici (isti storage put kao profil)
  const addWork = async (file: File | undefined) => {
    if (!file || !own || !user) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/gallery/${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
      if (up.error) { toast.error('Upload nije uspeo — pokušaj ponovo.'); return; }
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      const { error } = await db.from('artist_gallery').insert({ artist_id: user.id, image_url: pub.publicUrl, position: gallery.length });
      if (error) { toast.error('Čuvanje nije uspelo.'); return; }
      track('artist_gallery_add', {});
      qc.invalidateQueries({ queryKey: ['artist-gallery', artist.userId] });
    } finally { setUploading(false); }
  };

  const cover = artist.coverUrl;
  const hue = hueFromString(artist.name);

  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 74, background: 'rgba(5,5,7,.66)', animation: closing ? 'os-scrim-out .15s ease forwards' : 'os-scrim .25s ease' }} />
      <div className="os-scroll" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, top: 24, zIndex: 75, borderRadius: '22px 22px 0 0', overflowY: 'auto', background: AB.surface, border: `1px solid ${AB.line}`, animation: closing ? 'os-sheet-out .15s ease forwards' : 'os-sheet .4s cubic-bezier(.16,1,.3,1)', paddingBottom: 34, maxWidth: 520, margin: '0 auto' }}>

        {/* cover */}
        <div style={{ position: 'relative', height: 168, borderRadius: '22px 22px 0 0', overflow: 'hidden', background: cover ? undefined : `linear-gradient(135deg, ${avatarGradient(hue)}, ${AB.raised})` }}>
          {cover && <img src={cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(5,5,7,.82))' }} />
          <button onClick={close} aria-label="Zatvori" className="os-press" style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', border: 0, background: 'rgba(5,5,7,.55)', color: AB.ink, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {/* identitet */}
        <div style={{ padding: '0 18px', marginTop: -34, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 13 }}>
            {artist.avatarUrl
              ? <img src={artist.avatarUrl} style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${AB.surface}` }} />
              : <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 23, color: '#fff', background: avatarGradient(hue), border: `3px solid ${AB.surface}` }}>{initials(artist.name)}</div>}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-.02em' }}>{artist.name}</span>
                {artist.ambassador && (
                  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', color: AB.acidInk, background: AB.acid, borderRadius: 999, padding: '4px 9px' }}>★ AMBASADOR</span>
                )}
              </div>
              <div style={{ ...LABEL, marginTop: 4 }}>{ARTIST_TYPE_LABEL[artist.type] || 'UMETNIK'} · {artist.followers} {artist.followers === 1 ? 'PRATILAC' : 'PRATILACA'}</div>
            </div>
          </div>

          {artist.bio && <p style={{ fontSize: 14, color: AB.ink2, lineHeight: 1.55, margin: '13px 0 0' }}>{artist.bio}</p>}

          <div style={{ display: 'flex', gap: 9, marginTop: 15 }}>
            {!own && (
              <button onClick={toggle} disabled={busy} className="os-press" style={{ flex: 1, cursor: 'pointer', fontSize: 14, fontWeight: 800, minHeight: 46, borderRadius: 999, border: following ? `1px solid ${AB.line2}` : 0, background: following ? 'transparent' : AB.acid, color: following ? AB.ink2 : AB.acidInk }}>
                {following ? 'Pratiš ✓' : '+ Prati'}
              </button>
            )}
            {artist.instagram && (
              <a href={`https://instagram.com/${artist.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="os-press" style={{ flex: 'none', display: 'flex', alignItems: 'center', padding: '0 18px', minHeight: 46, borderRadius: 999, border: `1px solid ${AB.line2}`, color: AB.ink2, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>IG</a>
            )}
            {artist.linkUrl && (
              <a href={artist.linkUrl} target="_blank" rel="noreferrer" className="os-press" style={{ flex: 'none', display: 'flex', alignItems: 'center', padding: '0 18px', minHeight: 46, borderRadius: 999, border: `1px solid ${AB.line2}`, color: AB.ink2, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Link</a>
            )}
          </div>
        </div>

        {/* timetable — piše se sam iz event_artists */}
        <div style={{ padding: '26px 18px 0' }}>
          <div style={LABEL}>TIMETABLE</div>
          {!gigs || gigs.upcoming.length === 0 ? (
            <div style={{ marginTop: 10, padding: 15, borderRadius: 14, border: `1px dashed ${AB.line2}`, fontSize: 13.5, color: AB.ink3 }}>
              Nema najavljenih termina — zaprati i saznaćeš prvi.
            </div>
          ) : (
            <div style={{ marginTop: 4 }}>
              {gigs.upcoming.map((e: any) => <OSEventRow key={e.id} e={e} />)}
            </div>
          )}
          {gigs && gigs.past.length > 0 && (
            <>
              <div style={{ ...LABEL, marginTop: 18 }}>BILO</div>
              <div style={{ marginTop: 4, opacity: 0.6 }}>
                {gigs.past.map((e: any) => <OSEventRow key={e.id} e={e} past />)}
              </div>
            </>
          )}
        </div>

        {/* galerija / portfolio */}
        <div style={{ padding: '26px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={LABEL}>{artist.type === 'tattoo' || artist.type === 'visual' ? 'RADOVI' : 'GALERIJA'}</div>
            {own && (
              <>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="os-press" style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: AB.acid, background: hexA(AB.acid, 0.1), border: 0, borderRadius: 999, padding: '7px 14px' }}>{uploading ? 'Šaljem…' : '+ Dodaj'}</button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => addWork(e.target.files?.[0])} />
              </>
            )}
          </div>
          {gallery.length === 0 ? (
            <div style={{ marginTop: 10, padding: 15, borderRadius: 14, border: `1px dashed ${AB.line2}`, fontSize: 13.5, color: AB.ink3 }}>
              {own ? 'Dodaj prve radove — ovo je tvoj izlog.' : 'Još nema radova.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 12 }}>
              {gallery.map((g: any) => (
                <button key={g.id} onClick={() => setZoom(g.image_url)} className="os-press" style={{ padding: 0, border: 0, cursor: 'pointer', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: AB.raised }}>
                  <img src={g.image_url} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: 'fixed', inset: 0, zIndex: 78, background: 'rgba(5,5,7,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, cursor: 'zoom-out', animation: 'os-scrim .2s ease' }}>
          <img src={zoom} style={{ maxWidth: '100%', maxHeight: '86vh', borderRadius: 14 }} />
        </div>
      )}
    </>
  );
};
