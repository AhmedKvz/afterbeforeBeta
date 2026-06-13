import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Lock, KeyRound, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GradientImg } from '@/components/GradientImg';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { toast } from 'sonner';

const db = supabase as any;

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: prof, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await db.rpc('get_public_profile', { p_user: userId });
      return data;
    },
  });

  const { data: nights = [] } = useQuery({
    queryKey: ['user-nights', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await db.rpc('get_user_nights', { p_user: userId });
      return (data as any[]) || [];
    },
  });

  const request = useMutation({
    mutationFn: async (mementoId: string) => {
      const { error } = await db.rpc('request_memento', { p_memento: mementoId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-nights', userId] });
      toast('Request sent 🔓', { description: "You'll get notified if they let you in." });
    },
    onError: (e: any) => toast('Could not request', { description: e?.message ?? 'Try again.' }),
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!prof) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">Raver not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-semibold">← Back</button>
      </div>
    );
  }

  const hue = hueFromString(prof.display_name || 'AfterBefore');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* cover */}
      <GradientImg hue={hue} className="h-[120px] relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,10,0.85) 100%)' }} />
        <button onClick={() => navigate(-1)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/55 backdrop-blur grid place-items-center text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </GradientImg>

      <div className="px-4 -mt-[40px] relative">
        <div className="flex items-end gap-3">
          <div className="w-[80px] h-[80px] rounded-full border-[3px] border-background overflow-hidden flex-none">
            {prof.avatar_url
              ? <img src={prof.avatar_url} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: avatarGradient(hue) }}>{initials(prof.display_name || 'AB')}</div>}
          </div>
          <div className="mb-1 flex-1 min-w-0">
            <div className="font-extrabold text-[18px] truncate">{prof.display_name || 'Raver'}</div>
            <div className="text-xs text-muted-foreground">Lv. {prof.level || 1} · {prof.city || 'Belgrade'}</div>
          </div>
        </div>

        {/* vibe + quick stats */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {prof.has_morning_star && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide border border-amber-300/50 text-amber-200 bg-amber-300/10">🌅 MorningStar</span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border bg-white/[0.04] text-muted-foreground">📍 {prof.checkins ?? 0} nights</span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border bg-white/[0.04] text-muted-foreground">💫 {prof.matches ?? 0} connections</span>
        </div>

        {prof.music?.length ? (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {prof.music.slice(0, 5).map((g: string, i: number) => (
              <span key={g} className={i < 3 ? 'px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent border border-accent/40' : 'px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.06] text-muted-foreground border border-border'}>{g}</span>
            ))}
          </div>
        ) : null}
      </div>

      {/* nights */}
      <div className="px-4 mt-5">
        <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">THEIR NIGHTS</div>
        {nights.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-6 text-center">No public nights yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {nights.map((n: any) => (
              <div key={n.memento_id} className="relative rounded-2xl overflow-hidden border border-border">
                <GradientImg src={n.open ? n.media_url : null} hue={hueFromString(n.venue || n.title)} className="relative h-[160px] w-full">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  {!n.open && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[3px]">
                      <Lock className="w-6 h-6 text-white/80" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <div className="text-[12px] font-bold text-white leading-tight line-clamp-2">{n.title}</div>
                    <div className="text-[10px] text-white/70">{n.date ? (() => { try { return format(new Date(n.date), 'MMM d'); } catch { return ''; } })() : ''}</div>
                    {n.open
                      ? (n.note ? <div className="text-[10px] text-white/85 italic mt-1 line-clamp-2">"{n.note}"</div> : null)
                      : (
                        <button
                          onClick={() => n.request_status ? null : request.mutate(n.memento_id)}
                          disabled={!!n.request_status || request.isPending}
                          className="mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-bold text-white inline-flex items-center justify-center gap-1"
                          style={{ background: n.request_status === 'approved' ? 'hsl(var(--success))' : n.request_status ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
                        >
                          {n.request_status === 'pending' ? <>⏳ Requested</>
                            : n.request_status === 'denied' ? <>Denied</>
                            : n.request_status === 'approved' ? <><Check className="w-3 h-3" /> Granted</>
                            : <><KeyRound className="w-3 h-3" /> Request to unlock</>}
                        </button>
                      )}
                  </div>
                </GradientImg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
