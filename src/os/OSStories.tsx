import { useState } from 'react';
import { Plus, X, Flag, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveStories, usePostStory, StoryGroup } from '@/hooks/useStories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OS, G, hexA, MONO, CONIC } from './osTheme';

const db = supabase as any;
const WHEEL = [G.techno, G.house, G.underground, G.festival, G.afterparty, G.community];
const colOf = (s?: string | null) => { const str = s || '·'; let h = 0; for (let i = 0; i < str.length; i++) h = (h + str.charCodeAt(i)) % WHEEL.length; return WHEEL[h]; };
const initials = (n?: string | null) => (n || '·').split(/\s+/).map((w) => w[0] || '').slice(0, 2).join('').toUpperCase();

/** 24h stories — Nightlife OS rail + fullscreen viewer. */
export const OSStories = () => {
  const { profile } = useAuth();
  const { data: groups = [] } = useActiveStories();
  const post = usePostStory();
  const [viewer, setViewer] = useState<{ group: StoryGroup; i: number } | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) post.mutate({ file: f });
    e.target.value = '';
  };

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div className="os-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
        {/* add */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 'none', cursor: 'pointer' }}>
          <div style={{ position: 'relative', width: 60, height: 60, borderRadius: '50%', border: `2px dashed ${hexA(G.community, 0.5)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: profile?.avatar_url ? `center/cover url(${profile.avatar_url})` : OS.surface2 }}>
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.35)' }}>
              {post.isPending ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: OS.ink }} /> : <Plus className="w-5 h-5" style={{ color: OS.ink }} />}
            </span>
            <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6 }}>TVOJ STORY</span>
        </label>

        {groups.map((g) => (
          <button key={g.user_id} onClick={() => setViewer({ group: g, i: 0 })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 'none', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>
            <div style={{ borderRadius: '50%', padding: 2, background: CONIC }}>
              {g.avatar
                ? <img src={g.avatar} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${OS.bg}` }} />
                : <div style={{ width: 56, height: 56, borderRadius: '50%', border: `2px solid ${OS.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', background: `linear-gradient(135deg,${colOf(g.name)},#15161b)` }}>{initials(g.name)}</div>}
            </div>
            <span style={{ fontSize: 10, color: OS.ink5, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
          </button>
        ))}
      </div>

      {viewer && <Viewer group={viewer.group} start={viewer.i} myUserId={profile?.user_id ?? null} onClose={() => setViewer(null)} />}
    </div>
  );
};

const Viewer = ({ group, start, myUserId, onClose }: { group: StoryGroup; start: number; myUserId: string | null; onClose: () => void }) => {
  const [i, setI] = useState(start);
  const [flagged, setFlagged] = useState(false);
  const story = group.stories[i];
  const isOwn = group.user_id === myUserId;
  const next = () => (i < group.stories.length - 1 ? setI(i + 1) : onClose());
  const prev = () => i > 0 && setI(i - 1);

  const flag = async () => {
    if (flagged) return;
    setFlagged(true);
    const { error } = await db.rpc('flag_story', { p_story_id: story.id });
    if (error) { toast.error('Greška pri prijavi'); setFlagged(false); }
    else { toast.success('Prijavljeno · Hvala što čuvaš scenu'); setTimeout(onClose, 700); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, height: '100%', maxHeight: 860 }}>
        <img src={story.media_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.5), transparent 30%, transparent 70%, rgba(0,0,0,.6))' }} />
        {/* progress */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 10 }}>
          {group.stories.map((_, idx) => (
            <div key={idx} style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,.3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#fff', width: idx <= i ? '100%' : '0%' }} />
            </div>
          ))}
        </div>
        {/* header */}
        <div style={{ position: 'absolute', top: 28, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10, zIndex: 10 }}>
          {group.avatar
            ? <img src={group.avatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg,${colOf(group.name)},#15161b)` }}>{initials(group.name)}</div>}
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{group.name}</span>
          {story.venue && <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,.7)' }}>· 📍 {story.venue}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isOwn && <button onClick={flag} disabled={flagged} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer', opacity: flagged ? 0.4 : 0.85 }}><Flag className="w-4 h-4" style={{ color: '#fff' }} /></button>}
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer' }}><X className="w-5 h-5" style={{ color: '#fff' }} /></button>
          </div>
        </div>
        <button onClick={prev} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '33%', background: 'transparent', border: 0 }} aria-label="prev" />
        <button onClick={next} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '67%', background: 'transparent', border: 0 }} aria-label="next" />
        {story.caption && <div style={{ position: 'absolute', bottom: 40, left: 16, right: 16, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{story.caption}</div>}
      </div>
    </div>
  );
};
