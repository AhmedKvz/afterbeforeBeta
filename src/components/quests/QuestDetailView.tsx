import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';

const db = supabase as any;

const VENUE_EMOJI: Record<string, string> = {
  club: '🎵', splav: '🚢', cafe: '☕', cafe_bar: '☕', bar: '🍸',
  restaurant: '🍽️', gallery: '🎨', afterplace: '🍔',
};

interface QuestDetailViewProps {
  quest: any;
  onBack: () => void;
}

export const QuestDetailView = ({ quest, onBack }: QuestDetailViewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const members: any[] = quest.members || [];
  const pct = Math.min(100, (quest.progress / Math.max(quest.target_count, 1)) * 100);

  // member profiles
  const memberIds = members.map((m) => m.user_id);
  const { data: profiles = {} } = useQuery({
    queryKey: ['quest-member-profiles', quest.id, memberIds.join(',')],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data } = await db.from('profiles').select('user_id, display_name, avatar_url').in('user_id', memberIds);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      return map;
    },
  });

  // suggested venues
  const { data: suggestions = [] } = useQuery({
    queryKey: ['quest-suggestions', quest.kind],
    queryFn: async () => {
      const { data } = await db
        .from('profiles')
        .select('venue_name, venue_type, neighborhood')
        .eq('account_type', 'club_venue')
        .not('venue_name', 'is', null)
        .limit(3);
      return data || [];
    },
  });

  const nameFor = (uid: string) =>
    uid === user?.id ? 'You' : profiles[uid]?.display_name || 'Raver';

  // activity timeline from real data
  const timeline = [
    ...members
      .filter((m) => m.user_id !== quest.creator_id && m.status === 'joined')
      .map((m) => ({ uid: m.user_id, action: 'joined the crew', when: m.joined_at, icon: '👋' })),
    { uid: quest.creator_id, action: 'started the quest', when: quest.created_at, icon: '🚀' },
  ].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  const rel = (d: string) => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
  };

  const joined = members.filter((m) => m.status === 'joined');

  return (
    <div className="pb-32">
      {/* Local header */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <button onClick={onBack} className="w-[34px] h-[34px] rounded-full bg-white/[0.06] flex items-center justify-center">
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <div className="flex-1 text-center text-[13px] font-bold text-muted-foreground">Quest</div>
        <button className="w-[34px] h-[34px] rounded-full bg-white/[0.06] flex items-center justify-center">
          <Share2 className="w-[15px] h-[15px]" />
        </button>
      </div>

      {/* Hero */}
      <div className="mx-4 mb-3.5 p-4 rounded-[22px] border border-accent/40"
        style={{
          background: `linear-gradient(135deg, oklch(0.38 0.2 ${hueFromString(quest.title)}) 0%, hsl(var(--card)) 80%)`,
          boxShadow: '0 16px 40px -16px hsl(var(--accent) / 0.4)',
        }}>
        <div className="flex items-start gap-3">
          <div className="text-[38px] leading-none">{quest.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-extrabold tracking-wide">
                {quest.is_crew ? `👯 CREW · ${joined.length}` : '🚶 SOLO'}
              </span>
              {quest.deadline && <span className="text-[10px] text-muted-foreground">⏳ {quest.deadline}</span>}
            </div>
            <div className="text-[19px] font-extrabold leading-tight">{quest.title}</div>
            {quest.description && <div className="text-xs text-muted-foreground mt-1">{quest.description}</div>}
          </div>
        </div>

        {/* aggregate progress */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="font-bold">{quest.is_crew ? 'Crew progress' : 'Progress'}</span>
            <span className="font-bold text-accent">{quest.progress}/{quest.target_count} · +{quest.xp_reward} XP on win</span>
          </div>
          <div className="h-2 rounded bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%`, boxShadow: '0 0 12px hsl(var(--primary) / 0.5)' }} />
          </div>
        </div>
      </div>

      {/* Per-member breakdown */}
      <div className="px-4 mb-4">
        <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">WHO'S DOING WHAT</div>
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          {joined.map((m, i) => {
            const p = profiles[m.user_id];
            const name = nameFor(m.user_id);
            const mpct = Math.min(100, (m.progress / Math.max(quest.target_count, 1)) * 100);
            return (
              <div key={m.id} className={`flex items-center gap-3 px-3.5 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: avatarGradient(hueFromString(m.user_id)) }}>
                    {initials(name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold flex items-center gap-1.5">
                    {name}
                    {m.user_id === quest.creator_id && <span className="text-[9px] text-muted-foreground">· organizer</span>}
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${mpct}%` }} />
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground font-semibold">{m.progress}/{quest.target_count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested venues */}
      {suggestions.length > 0 && (
        <div className="px-4 mb-4">
          <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">SUGGESTED SPOTS</div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {suggestions.map((v: any) => (
              <button
                key={v.venue_name}
                onClick={() => navigate(`/venue/${encodeURIComponent(v.venue_name)}`)}
                className="min-w-[140px] max-w-[140px] flex-shrink-0 text-left rounded-2xl border border-border bg-card p-3"
              >
                <div className="text-2xl mb-1.5">{VENUE_EMOJI[v.venue_type || 'club'] || '📍'}</div>
                <div className="text-xs font-bold truncate">{v.venue_name}</div>
                {v.neighborhood && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{v.neighborhood}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      <div className="px-4">
        <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">ACTIVITY</div>
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          {timeline.map((t, i) => (
            <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm">{t.icon}</div>
              <div className="flex-1 text-[12px]">
                <span className="font-semibold">{nameFor(t.uid)}</span>{' '}
                <span className="text-muted-foreground">{t.action}</span>
              </div>
              <span className="text-[10px] text-text-faint">{rel(t.when)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
