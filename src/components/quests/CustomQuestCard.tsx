import { avatarGradient, hueFromString } from '@/lib/gradients';
import { useCustomQuests } from '@/hooks/useQuestSystem';

interface CustomQuestCardProps {
  quest: any;
  onOpen?: () => void;
}

export const CustomQuestCard = ({ quest, onOpen }: CustomQuestCardProps) => {
  const { join, decline } = useCustomQuests();
  const pct = Math.min(100, (quest.progress / Math.max(quest.target_count, 1)) * 100);
  const isInvite = quest.myStatus === 'invited';
  const joinedMembers = (quest.members || []).filter((m: any) => m.status === 'joined');
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onOpen}
      className="relative p-3.5 rounded-2xl border cursor-pointer"
      style={{
        background: isInvite ? 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--card)))' : 'hsl(var(--card))',
        borderColor: isInvite ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border))',
      }}
    >
      {isInvite && (
        <div className="absolute -top-2 left-3.5 px-2 py-0.5 rounded-full bg-primary text-white text-[9px] font-extrabold tracking-wide">
          CREW INVITE
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none">{quest.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="font-bold text-sm">{quest.title}</div>
            <div className="font-bold text-xs text-accent flex-shrink-0 ml-2">+{quest.xp_reward} XP</div>
          </div>
          {quest.description && <div className="text-[11px] text-muted-foreground mb-2.5">{quest.description}</div>}

          {/* Crew / solo row */}
          <div className="flex items-center gap-2.5 mb-2.5">
            {quest.is_crew ? (
              <>
                <div className="flex -space-x-1.5">
                  {joinedMembers.slice(0, 3).map((m: any, i: number) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-background"
                      style={{ background: avatarGradient(hueFromString(m.user_id + i)) }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {joinedMembers.length} in crew {quest.isCreator ? '· you organized' : ''}
                </span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">🚶 Solo · just you</span>
            )}
            {quest.deadline && (
              <span className="ml-auto text-[10px] text-muted-foreground">⏳ {quest.deadline}</span>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground min-w-[28px] text-right">
              {quest.progress}/{quest.target_count}
            </span>
          </div>

          {/* Actions */}
          {isInvite ? (
            <div onClick={stop} className="flex gap-1.5 mt-2.5">
              <button
                onClick={() => join(quest.id)}
                className="flex-1 py-2 rounded-[10px] text-white font-bold text-xs bg-gradient-to-r from-primary to-secondary"
              >
                Join crew
              </button>
              <button
                onClick={() => decline(quest.id)}
                className="flex-1 py-2 rounded-[10px] font-semibold text-xs border border-border-strong bg-transparent"
              >
                Decline
              </button>
            </div>
          ) : (
            quest.is_crew && (
              <div onClick={stop} className="flex gap-1.5 mt-2.5">
                <button className="flex-1 py-1.5 rounded-[10px] font-semibold text-[11px] bg-white/[0.08]">Share</button>
                <button className="flex-1 py-1.5 rounded-[10px] font-semibold text-[11px] bg-white/[0.08]">+ Invite</button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
