import { useCommunityQuests, useQuestEngineStats } from '@/hooks/useQuestSystem';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { cn } from '@/lib/utils';

const CAT_LABEL: Record<string, string> = {
  love: '💜 Ljubav', social: '🫂 Društvo', adventure: '🧭 Avantura', creative: '🎨 Kreativa',
  vote: '🗳️ Glasanje', challenge: '🔥 Izazov', crew: '👯 Ekipa', explore: '🧭 Istraži', custom: '✨ Custom',
};

/** Quest-engine activity counter — our beta signal for "how many people create". */
export const QuestEngineStats = () => {
  const s = useQuestEngineStats();
  const items = [
    { n: s.total_created, l: 'napravljeno' },
    { n: s.created_this_week, l: 'ove nedelje' },
    { n: s.unique_creators, l: 'kreatora' },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
        <span className="text-base">🔧</span> QUEST ENGINE
      </div>
      <div className="flex items-center gap-4">
        {items.map((it) => (
          <div key={it.l} className="text-center">
            <div className="text-lg font-extrabold leading-none bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{it.n}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Feed of quests other people made — social proof that nudges creation. */
export const CommunityQuests = () => {
  const { quests, join, isJoining } = useCommunityQuests();
  if (!quests.length) return null;

  return (
    <div className="px-4 pb-3">
      <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">🌍 ZAJEDNICA PRAVI · {quests.length}</div>
      <div className="space-y-2">
        {quests.slice(0, 8).map((q: any) => (
          <div key={q.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
            <div className="w-11 h-11 rounded-2xl grid place-items-center text-2xl flex-none bg-white/[0.04]">{q.icon || '🎯'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm truncate">{q.title}</span>
                <span className="text-[9px] font-bold text-accent flex-none">+{q.xp_reward}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {q.creator_avatar
                  ? <img src={q.creator_avatar} className="w-4 h-4 rounded-full object-cover" />
                  : <span className="w-4 h-4 rounded-full grid place-items-center text-[7px] font-bold text-white" style={{ background: avatarGradient(hueFromString(q.creator_name || q.id)) }}>{initials(q.creator_name || '·')}</span>}
                <span className="text-[10px] text-muted-foreground truncate">{q.creator_name || 'rejver'} · {CAT_LABEL[q.category] || '✨'} · 👥 {q.member_count}</span>
              </div>
            </div>
            {q.is_mine ? (
              <span className="text-[10px] font-bold text-muted-foreground flex-none px-2">tvoj</span>
            ) : q.joined ? (
              <span className="text-[11px] font-bold text-success flex-none px-2">✓ tu si</span>
            ) : (
              <button onClick={() => join(q.id)} disabled={isJoining}
                className={cn('flex-none text-[12px] font-bold px-3.5 py-2 rounded-xl text-white disabled:opacity-60')}
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
                Uđi
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
