import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENTS } from '@/services/gamification';
import { cn } from '@/lib/utils';

const db = supabase as any;

type Accent = 'primary' | 'secondary' | 'amber' | 'success';
type FeedType = 'checkin' | 'review' | 'match' | 'quest' | 'achievement';

interface FeedItem {
  id: string;
  type: FeedType;
  icon: string;
  title: string;
  description: string;
  timestamp: string | null;
  accent: Accent;
  link?: string | null;
  rating?: number | null;
  snippet?: string | null;
}

const ACCENT_RING: Record<Accent, string> = {
  primary: 'border-primary/50 text-primary',
  secondary: 'border-secondary/50 text-secondary',
  amber: 'border-amber-300/50 text-amber-200',
  success: 'border-success/50 text-success',
};

const FILTERS: { id: 'all' | FeedType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'checkin', label: '📍 Been' },
  { id: 'review', label: '✍️ Reviews' },
  { id: 'match', label: '💫 Connections' },
  { id: 'quest', label: '⚡ Quests' },
];

const rel = (ts: string | null) => {
  if (!ts) return '';
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ''; }
};

/** Full nightlife history feed: check-ins, reviews, matches, quests, achievements. */
function useNightlifeFeed() {
  const { user } = useAuth();
  return useQuery<FeedItem[]>({
    queryKey: ['nightlife-feed', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [ci, rv, mt, qz, ach] = await Promise.all([
        db.from('event_checkins').select('id,event_id,checked_in_at').eq('user_id', uid).order('checked_in_at', { ascending: false }).limit(15),
        db.from('event_reviews').select('id,event_id,venue_name,rating,review_text,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(15),
        db.from('matches').select('id,matched_at,user1_id,user2_id').or(`user1_id.eq.${uid},user2_id.eq.${uid}`).order('matched_at', { ascending: false }).limit(10),
        db.from('user_quests').select('id,quest_id,completed_at,is_completed').eq('user_id', uid).eq('is_completed', true).order('completed_at', { ascending: false }).limit(10),
        db.from('user_achievements').select('id,achievement_id,unlocked_at').eq('user_id', uid).order('unlocked_at', { ascending: false }).limit(10),
      ]);

      const items: FeedItem[] = [];

      // check-ins → event titles + links
      const checkins = ci.data || [];
      const eventIds = [...new Set(checkins.map((c: any) => c.event_id).filter(Boolean))];
      const eventMap: Record<string, any> = {};
      if (eventIds.length) {
        const { data: evs } = await db.from('events').select('id,title,venue_name').in('id', eventIds);
        (evs || []).forEach((e: any) => { eventMap[e.id] = e; });
      }
      checkins.forEach((c: any) => {
        const e = eventMap[c.event_id];
        items.push({
          id: 'ci-' + c.id, type: 'checkin', icon: '📍', title: 'Checked in',
          description: e?.title || e?.venue_name || 'a night out',
          timestamp: c.checked_in_at, accent: 'primary',
          link: c.event_id ? `/event/${c.event_id}` : null,
        });
      });

      (rv.data || []).forEach((r: any) => {
        items.push({
          id: 'rv-' + r.id, type: 'review', icon: '✍️', title: 'Reviewed a night',
          description: r.venue_name || 'an event',
          timestamp: r.created_at, accent: 'secondary',
          rating: r.rating ?? null,
          snippet: r.review_text || null,
          link: r.venue_name ? `/venue/${encodeURIComponent(r.venue_name)}` : (r.event_id ? `/event/${r.event_id}` : null),
        });
      });

      (mt.data || []).forEach((m: any) => {
        items.push({
          id: 'mt-' + m.id, type: 'match', icon: '💫', title: 'New connection',
          description: 'Matched with someone on the same vibe',
          timestamp: m.matched_at, accent: 'amber', link: '/matches',
        });
      });

      const quests = qz.data || [];
      const questIds = [...new Set(quests.map((q: any) => q.quest_id).filter(Boolean))];
      const questMap: Record<string, any> = {};
      if (questIds.length) {
        const { data: qd } = await db.from('quests').select('id,title').in('id', questIds);
        (qd || []).forEach((q: any) => { questMap[q.id] = q; });
      }
      quests.forEach((q: any) => {
        items.push({
          id: 'qz-' + q.id, type: 'quest', icon: '⚡', title: 'Quest completed',
          description: questMap[q.quest_id]?.title || 'Weekly quest',
          timestamp: q.completed_at, accent: 'success', link: '/quests',
        });
      });

      (ach.data || []).forEach((a: any) => {
        const def = ACHIEVEMENTS.find((x: any) => x.id === a.achievement_id);
        items.push({
          id: 'ach-' + a.id, type: 'achievement', icon: def?.icon || '🏆', title: 'Badge unlocked',
          description: def?.name || 'Achievement',
          timestamp: a.unlocked_at, accent: 'amber',
        });
      });

      return items
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 40);
    },
  });
}

export const NightlifeTimeline = () => {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useNightlifeFeed();
  const [filter, setFilter] = useState<'all' | FeedType>('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = items.filter((it) => filter === 'all' || it.type === filter || (filter === 'match' && it.type === 'match'));
  const visible = showAll ? filtered : filtered.slice(0, 6);

  return (
    <div className="px-4 mb-3.5">
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="mb-3">
          <div className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">NIGHTLIFE TIMELINE</div>
          <div className="text-[11px] text-muted-foreground/70">Where you've been · what you did · who you met</div>
        </div>

        {/* filters */}
        {items.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setShowAll(false); }}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                  filter === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/[0.04] text-muted-foreground border-border',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="text-[12px] text-muted-foreground py-4 text-center">Loading your scene history…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-2xl mb-1.5 opacity-70">🌙</div>
            <div className="text-[13px] font-semibold">No timeline yet</div>
            <div className="text-[11px] text-muted-foreground mt-1 max-w-[260px] mx-auto">
              Check in, review nights, match with people and complete quests to build your scene history.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-muted-foreground">Nothing here yet — keep moving in the scene.</div>
        ) : (
          <>
            <div className="relative">
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />
              <div className="space-y-3.5">
                {visible.map((it) => {
                  const clickable = !!it.link;
                  return (
                    <div
                      key={it.id}
                      onClick={() => it.link && navigate(it.link)}
                      className={cn('relative flex gap-3', clickable && 'cursor-pointer')}
                    >
                      <div className={cn('relative z-10 w-8 h-8 rounded-full bg-card border flex items-center justify-center text-sm flex-none', ACCENT_RING[it.accent])}>
                        {it.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold">{it.title}</span>
                          <span className="text-[10px] text-text-faint flex-none">{rel(it.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <span className="truncate">{it.description}</span>
                          {it.rating ? <span className="text-amber-300 flex-none">{'★'.repeat(Math.round(it.rating))}</span> : null}
                        </div>
                        {it.snippet && <div className="text-[11px] text-text-faint italic truncate mt-0.5">"{it.snippet}"</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {filtered.length > 6 && (
              <button
                onClick={() => setShowAll((s) => !s)}
                className="w-full mt-3 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {showAll ? 'Show less' : `Show all ${filtered.length}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
