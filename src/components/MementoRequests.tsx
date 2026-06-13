import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { toast } from 'sonner';

const db = supabase as any;

/** Owner's pending "request to unlock" approvals for locked mementos. */
export const MementoRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['memento-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.rpc('get_memento_requests');
      return (data as any[]) || [];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await db.rpc('respond_memento_request', { p_request: id, p_approve: approve });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['memento-requests'] });
      toast(v.approve ? 'Access granted 🔓' : 'Request declined');
    },
  });

  if (!requests.length) return null;

  return (
    <div className="px-4 mb-3.5">
      <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] p-3.5">
        <div className="text-[11px] font-bold tracking-[0.12em] text-primary mb-2">🔓 ACCESS REQUESTS · {requests.length}</div>
        <div className="space-y-2">
          {requests.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2.5">
              {r.avatar
                ? <img src={r.avatar} className="w-9 h-9 rounded-full object-cover flex-none" />
                : <div className="w-9 h-9 rounded-full flex-none flex items-center justify-center text-[11px] font-bold text-white" style={{ background: avatarGradient(hueFromString(r.name || r.requester_id)) }}>{initials(r.name || '·')}</div>}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{r.name || 'A raver'}</div>
                <div className="text-[11px] text-muted-foreground truncate">wants to see · {r.night}</div>
              </div>
              <button onClick={() => respond.mutate({ id: r.id, approve: true })} disabled={respond.isPending}
                className="w-9 h-9 rounded-full bg-success/20 text-success grid place-items-center flex-none"><Check className="w-4 h-4" /></button>
              <button onClick={() => respond.mutate({ id: r.id, approve: false })} disabled={respond.isPending}
                className="w-9 h-9 rounded-full bg-white/[0.06] text-muted-foreground grid place-items-center flex-none"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
