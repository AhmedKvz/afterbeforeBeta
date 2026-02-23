import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, Hand, Calendar, Target,
  Clover, Shield, Zap, Trophy, CheckCheck,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { GlassCard } from '@/components/GlassCard';
import { BottomNav } from '@/components/BottomNav';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, { icon: any; color: string }> = {
  match: { icon: Heart, color: 'text-primary' },
  wave: { icon: Hand, color: 'text-blue-400' },
  event_reminder: { icon: Calendar, color: 'text-orange-400' },
  quest_complete: { icon: Target, color: 'text-green-400' },
  lucky100_win: { icon: Clover, color: 'text-green-400' },
  safety_alert: { icon: Shield, color: 'text-destructive' },
  xp_milestone: { icon: Zap, color: 'text-yellow-400' },
  leaderboard_change: { icon: Trophy, color: 'text-accent' },
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-xl">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1 text-sm text-primary"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-12 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-lg font-bold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground text-sm">
              You'll see matches, XP milestones, and more here
            </p>
          </motion.div>
        ) : (
          notifications.map((n: any, index: number) => {
            const mapping = ICON_MAP[n.type] || { icon: Zap, color: 'text-muted-foreground' };
            const Icon = mapping.icon;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GlassCard
                  className={cn('p-4', !n.is_read && 'border-primary/30')}
                  hoverable
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0', mapping.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm truncate">{n.title}</h4>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
