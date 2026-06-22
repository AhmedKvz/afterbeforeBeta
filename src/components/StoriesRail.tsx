import { useState } from 'react';
import { Plus, X, Flag, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveStories, usePostStory, StoryGroup } from '@/hooks/useStories';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

export const StoriesRail = () => {
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
    <div className="px-4 mb-4">
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar">
        {/* Add your story */}
        <label className="flex flex-col items-center gap-1.5 flex-none cursor-pointer">
          <div className="relative w-[62px] h-[62px] rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover opacity-70" />
              : <div className="w-full h-full" style={{ background: avatarGradient(hueFromString(profile?.display_name || 'me')) }} />}
            <span className="absolute inset-0 grid place-items-center bg-black/35">
              {post.isPending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </span>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </div>
          <span className="text-[10px] text-muted-foreground">Tvoj story</span>
        </label>

        {/* Active stories */}
        {groups.map((g) => (
          <button key={g.user_id} onClick={() => setViewer({ group: g, i: 0 })} className="flex flex-col items-center gap-1.5 flex-none">
            <div className="rounded-full p-0.5 bg-gradient-to-br from-primary via-secondary to-accent">
              {g.avatar
                ? <img src={g.avatar} className="w-[58px] h-[58px] rounded-full object-cover border-2 border-background" />
                : <div className="w-[58px] h-[58px] rounded-full border-2 border-background flex items-center justify-center font-bold text-white" style={{ background: avatarGradient(hueFromString(g.name)) }}>{initials(g.name)}</div>}
            </div>
            <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">{g.name}</span>
          </button>
        ))}
      </div>

      {viewer && <StoryViewer group={viewer.group} start={viewer.i} myUserId={profile?.user_id ?? null} onClose={() => setViewer(null)} />}
    </div>
  );
};

const StoryViewer = ({ group, start, myUserId, onClose }: { group: StoryGroup; start: number; myUserId: string | null; onClose: () => void }) => {
  const [i, setI] = useState(start);
  const [flagged, setFlagged] = useState(false);
  const story = group.stories[i];
  const next = () => (i < group.stories.length - 1 ? setI(i + 1) : onClose());
  const prev = () => i > 0 && setI(i - 1);
  const isOwnStory = group.user_id === myUserId;

  const flagStory = async () => {
    if (flagged) return;
    setFlagged(true);
    const { error } = await db.rpc('flag_story', { p_story_id: story.id });
    if (error) {
      toast.error('Greška pri prijavi');
      setFlagged(false);
    } else {
      toast.success('Prijavljeno · Hvala što čuvaš zajednicu');
      setTimeout(onClose, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[440px] h-full max-h-[860px]">
        <img src={story.media_url} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

        {/* progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {group.stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div className="h-full bg-white" style={{ width: idx < i ? '100%' : idx === i ? '100%' : '0%' }} />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-7 left-3 right-3 flex items-center gap-2.5 z-10">
          {group.avatar
            ? <img src={group.avatar} className="w-8 h-8 rounded-full object-cover" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: avatarGradient(hueFromString(group.name)) }}>{initials(group.name)}</div>}
          <span className="text-sm font-semibold text-white">{group.name}</span>
          {story.venue && <span className="text-[11px] text-white/70">· 📍 {story.venue}</span>}
          <div className="ml-auto flex items-center gap-1.5">
            {!isOwnStory && (
              <button onClick={flagStory} disabled={flagged} className="w-9 h-9 rounded-full bg-black/40 grid place-items-center opacity-70 hover:opacity-100 disabled:opacity-40">
                <Flag className="w-4 h-4 text-white" />
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/40 grid place-items-center"><X className="w-5 h-5 text-white" /></button>
          </div>
        </div>

        {/* tap zones */}
        <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3" aria-label="prev" />
        <button onClick={next} className="absolute right-0 top-0 bottom-0 w-2/3" aria-label="next" />

        {story.caption && (
          <div className="absolute bottom-10 left-4 right-4 text-center text-white text-[15px] font-medium drop-shadow">{story.caption}</div>
        )}
      </div>
    </div>
  );
};
