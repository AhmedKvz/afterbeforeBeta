import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Loader2, Lock, Users, Globe, ImagePlus, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GradientImg } from '@/components/GradientImg';
import { hueFromString } from '@/lib/gradients';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const db = supabase as any;

type Visibility = 'public' | 'close_friends' | 'private';

interface Night {
  eventId: string;
  title: string;
  venue: string | null;
  date: string | null;
  image: string | null;
  lastCheckin: string;
  memento: { id: string; note: string | null; media_url: string | null; visibility: Visibility } | null;
}

const VIS: { id: Visibility; label: string; icon: any }[] = [
  { id: 'public', label: 'Everyone', icon: Globe },
  { id: 'close_friends', label: 'Close friends', icon: Users },
  { id: 'private', label: 'Only me', icon: Lock },
];
const visMeta = (v: Visibility) => VIS.find((x) => x.id === v) || VIS[2];

function useYourNights() {
  const { user } = useAuth();
  return useQuery<Night[]>({
    queryKey: ['your-nights', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const { data: checkins } = await db
        .from('event_checkins').select('event_id, checked_in_at')
        .eq('user_id', uid).order('checked_in_at', { ascending: false }).limit(20);
      const seen = new Set<string>();
      const ordered: { event_id: string; checked_in_at: string }[] = [];
      (checkins || []).forEach((c: any) => {
        if (c.event_id && !seen.has(c.event_id)) { seen.add(c.event_id); ordered.push(c); }
      });
      const ids = ordered.map((c) => c.event_id).slice(0, 12);
      if (!ids.length) return [];
      const [{ data: events }, { data: mementos }] = await Promise.all([
        db.from('events').select('id,title,venue_name,date,image_url').in('id', ids),
        db.from('mementos').select('id,event_id,note,media_url,visibility').eq('user_id', uid).in('event_id', ids),
      ]);
      const evMap: Record<string, any> = {};
      (events || []).forEach((e: any) => { evMap[e.id] = e; });
      const memMap: Record<string, any> = {};
      (mementos || []).forEach((m: any) => { memMap[m.event_id] = m; });
      return ids.map((id) => {
        const e = evMap[id] || {};
        return {
          eventId: id,
          title: e.title || e.venue_name || 'A night out',
          venue: e.venue_name || null,
          date: e.date || null,
          image: e.image_url || null,
          lastCheckin: ordered.find((c) => c.event_id === id)!.checked_in_at,
          memento: memMap[id] ? { id: memMap[id].id, note: memMap[id].note, media_url: memMap[id].media_url, visibility: memMap[id].visibility } : null,
        };
      });
    },
  });
}

export const YourNights = () => {
  const { data: nights = [], isLoading } = useYourNights();
  const [editing, setEditing] = useState<Night | null>(null);

  return (
    <div className="px-4 mb-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">YOUR NIGHTS</span>
        <span className="text-[11px] text-muted-foreground/70">Your party diary</span>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground py-4 text-center">Loading your nights…</p>
      ) : nights.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-5 text-center">
          <div className="text-2xl mb-1.5 opacity-70">🌙</div>
          <div className="text-[13px] font-semibold">No nights yet</div>
          <div className="text-[11px] text-muted-foreground mt-1">Check in at events — each one becomes a night you can write a memento for.</div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {nights.map((n) => (
            <button
              key={n.eventId}
              onClick={() => setEditing(n)}
              className="relative min-w-[170px] max-w-[170px] flex-none rounded-2xl overflow-hidden border border-border text-left"
            >
              <GradientImg src={n.memento?.media_url || n.image} hue={hueFromString(n.venue || n.title)} className="relative h-[150px] w-full">
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                {/* visibility badge */}
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[9px] font-bold text-white">
                  {(() => { const m = visMeta(n.memento?.visibility || 'private'); const I = m.icon; return <><I className="w-2.5 h-2.5" />{n.memento ? m.label : '＋ Memento'}</>; })()}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <div className="text-[12px] font-bold text-white leading-tight line-clamp-2">{n.title}</div>
                  <div className="text-[10px] text-white/70 mt-0.5">{n.date ? (() => { try { return format(new Date(n.date), 'MMM d'); } catch { return ''; } })() : ''}</div>
                  {n.memento?.note
                    ? <div className="text-[10px] text-white/85 italic mt-1 line-clamp-2">"{n.memento.note}"</div>
                    : <div className="text-[10px] text-accent font-semibold mt-1 inline-flex items-center gap-1"><Pencil className="w-2.5 h-2.5" /> Write memento</div>}
                </div>
              </GradientImg>
            </button>
          ))}
        </div>
      )}

      {editing && <MementoEditor night={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const MementoEditor = ({ night, onClose }: { night: Night; onClose: () => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState(night.memento?.note || '');
  const [visibility, setVisibility] = useState<Visibility>(night.memento?.visibility || 'public');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(night.memento?.media_url || null);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      let media_url = night.memento?.media_url || null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/mementos/${night.eventId}-${Date.now()}.${ext}`;
        const up = await db.storage.from('media').upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        media_url = db.storage.from('media').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await db.from('mementos').upsert(
        { user_id: user.id, event_id: night.eventId, note: note.trim() || null, media_url, visibility },
        { onConflict: 'user_id,event_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['your-nights'] });
      toast.success('Memento saved ✨');
      onClose();
    },
    onError: (e: any) => toast('Could not save', { description: e?.message ?? 'Try again.' }),
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md bg-background rounded-3xl border border-border p-5 max-h-[90%] overflow-y-auto no-scrollbar">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wide text-accent">MEMENTO</div>
            <h3 className="text-lg font-extrabold truncate">{night.title}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/[0.06] grid place-items-center flex-none"><X className="w-4 h-4" /></button>
        </div>

        {/* photo */}
        <label className="block mb-3 cursor-pointer">
          <div className="relative h-40 rounded-2xl overflow-hidden border border-border-strong">
            {preview
              ? <img src={preview} className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: `radial-gradient(120% 80% at 30% 20%, oklch(0.5 0.2 ${hueFromString(night.venue || night.title)}), #0a0612)` }} />}
            <div className="absolute inset-0 grid place-items-center bg-black/30">
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-black/55 px-3 py-1.5 rounded-full"><ImagePlus className="w-4 h-4" /> {preview ? 'Change photo' : 'Add photo'}</span>
            </div>
          </div>
          <input type="file" accept="image/*" onChange={onPick} className="hidden" />
        </label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Write a memento from this night…"
          className="w-full bg-card border border-border-strong rounded-xl p-3 text-sm outline-none focus:border-primary resize-none mb-3"
        />

        {/* visibility */}
        <div className="text-[11px] font-bold tracking-wide text-muted-foreground mb-1.5">WHO CAN SEE THIS</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {VIS.map((v) => {
            const I = v.icon; const active = visibility === v.id;
            return (
              <button key={v.id} onClick={() => setVisibility(v.id)}
                className={cn('flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold',
                  active ? 'border-primary bg-primary/15 text-foreground' : 'border-border bg-white/[0.03] text-muted-foreground')}>
                <I className="w-4 h-4" /> {v.label}
              </button>
            );
          })}
        </div>

        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {night.memento ? 'Update memento' : 'Save memento'}
        </button>
      </div>
    </div>
  );
};
