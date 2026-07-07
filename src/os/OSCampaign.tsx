import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { OS, G, hexA, MONO } from './osTheme';

const db = supabase as any;

/** Content campaign — sponsored quest as a UGC machine. Post photo/video from
 *  the night, verified members vote, sponsor pays the reward (ECONOMY §8b). */
export const OSCampaign = ({ sponsoredId, onClose }: { sponsoredId: string; onClose: () => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery({
    queryKey: ['campaign', sponsoredId],
    queryFn: async () => { const { data } = await db.rpc('get_campaign', { p_sponsored: sponsoredId }); return data; },
    refetchInterval: 6000,
  });
  const c = data?.campaign;
  const subs: any[] = data?.submissions || [];
  const acceptsVideo = c?.media === 'video' || c?.media === 'both';
  const accept = c?.media === 'video' ? 'video/*' : c?.media === 'both' ? 'image/*,video/*' : 'image/*';

  const vote = async (id: string) => {
    const { error } = await db.rpc('vote_campaign', { p_submission: id });
    if (error) { toast.error(error.message || 'Ne može'); return; }
    qc.invalidateQueries({ queryKey: ['campaign', sponsoredId] });
  };

  const onFile = async (file: File | null) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const isVid = file.type.startsWith('video');
      const path = `${user.id}/campaigns/${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      const { error } = await db.rpc('submit_campaign', { p_sponsored: sponsoredId, p_media_url: pub.publicUrl, p_media_type: isVid ? 'video' : 'photo', p_caption: null });
      if (error) throw error;
      toast.success('Tvoj rad je u trci ✨');
      qc.invalidateQueries({ queryKey: ['campaign', sponsoredId] });
    } catch (e: any) { toast.error('Upload nije uspeo — pokušaj ponovo.'); }
    finally { setUploading(false); }
  };

  return (
    <div className="os-scroll" style={{ position: 'fixed', inset: 0, zIndex: 150, background: OS.bgDeep, overflowY: 'auto' }}>
      {/* header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(7,7,8,.92)', backdropFilter: 'blur(14px)', padding: 'calc(env(safe-area-inset-top) + 14px) 16px 12px', borderBottom: `1px solid ${OS.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ fontSize: 26 }}>{c?.logo || '⭐'}</span>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: G.house }}>SPONSOR · {(c?.venue || '').toUpperCase()}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: OS.ink }}>{c?.title || 'Kampanja'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 0, cursor: 'pointer', color: OS.ink }}>✕</button>
        </div>
      </div>

      <div style={{ padding: '14px 16px 40px' }}>
        <div style={{ fontSize: 13.5, color: OS.ink3, lineHeight: 1.5 }}>{c?.description}</div>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0 18px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, color: G.festival, background: hexA(G.festival, 0.12), border: `1px solid ${hexA(G.festival, 0.3)}`, borderRadius: 8, padding: '5px 10px' }}>🏆 {c?.reward}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, background: OS.surface, border: `1px solid ${OS.line}`, borderRadius: 8, padding: '5px 10px' }}>{acceptsVideo ? '🎬 VIDEO' : '📸 FOTO'}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, background: OS.surface, border: `1px solid ${OS.line}`, borderRadius: 8, padding: '5px 10px' }}>🗳 {c?.spots || 'GLASA SCENA'}</span>
        </div>

        {/* submit */}
        <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0] || null)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: 14, borderRadius: 14, border: `1px dashed ${hexA(G.house, 0.5)}`, background: hexA(G.house, 0.08), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 20 }}>{acceptsVideo ? '🎬' : '📸'}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: OS.ink }}>{uploading ? 'Šaljem…' : `Dodaj svoj ${acceptsVideo ? 'video' : 'rad'}`}</span>
        </button>

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 12 }}>U TRCI · {subs.length}{subs.length > 0 ? ' · GLASAJ' : ''}</div>

        {subs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: OS.ink5 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{acceptsVideo ? '🎬' : '📸'}</div>
            <div style={{ fontSize: 13, color: OS.ink3 }}>Budi prvi/prva — postavi svoj rad i pokreni trku.</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {subs.map((s, i) => (
            <div key={s.id} style={{ borderRadius: 14, overflow: 'hidden', background: OS.surface, border: `1px solid ${i === 0 && s.votes > 0 ? hexA(G.festival, 0.5) : OS.line}` }}>
              <div style={{ position: 'relative', aspectRatio: '3/4', background: '#0e0f12' }}>
                {s.media_type === 'video'
                  ? <video src={s.media_url} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {i === 0 && s.votes > 0 && <span style={{ position: 'absolute', top: 8, left: 8, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#3a2a05', background: G.festival, borderRadius: 6, padding: '2px 7px' }}>👑 VODI</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px' }}>
                <span style={{ fontSize: 12, color: OS.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || '·'}</span>
                <button onClick={() => vote(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', border: 0, borderRadius: 8, padding: '5px 10px', fontFamily: MONO, fontSize: 11, fontWeight: 600, background: s.mine ? G.afterparty : 'rgba(255,255,255,.06)', color: s.mine ? '#0B0B0D' : OS.ink2 }}>{s.mine ? '♥' : '♡'} {s.votes}</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 18 }}>
          <span style={{ fontSize: 13 }}>🛡</span>
          <span style={{ fontSize: 10.5, color: OS.ink6, lineHeight: 1.45 }}>Glasaju samo verifikovani članovi (bar 1 check-in). Sadržaj sa aftera — žurka ostaje sveta. Zajednica bira, sponzor plaća.</span>
        </div>
      </div>
    </div>
  );
};
