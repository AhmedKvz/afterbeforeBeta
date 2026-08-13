import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { AB, MONO, hexA } from '@/os/osTheme';

/**
 * Notifikacije — OS dizajn (fix 2026-08-14: stranica je nosila legacy
 * BottomNav i stari glass stil; „jedan dizajn svuda" kao venue deep-link).
 * Ruta ostaje /notifications (zvonce u GRAD-u + JA podešavanja); nazad = -1.
 */
const ICON: Record<string, string> = {
  match: '💜', wave: '👋', event_reminder: '📅', quest_complete: '🎯',
  lucky100_win: '🍀', safety_alert: '🛡️', xp_milestone: '⚡', leaderboard_change: '🏆',
};

const LABEL: React.CSSProperties = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: AB.ink3, fontWeight: 600 };

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', background: AB.void, color: AB.ink, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 40 }}>

        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(5,5,6,.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${AB.line}`, padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate(-1)} aria-label="Nazad" className="os-press" style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${AB.line2}`, cursor: 'pointer', background: AB.surface, color: AB.ink2, fontSize: 15 }}>←</button>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.01em' }}>Notifikacije</span>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => markAllAsRead()} className="os-press" style={{ cursor: 'pointer', ...LABEL, color: AB.acid, background: 'transparent', border: 0, padding: 6 }}>
              OZNAČI SVE ✓
            </button>
          )}
        </div>

        <div style={{ padding: '14px 18px 0' }}>
          {isLoading ? (
            <div style={{ ...LABEL, textAlign: 'center', padding: '40px 0' }}>UČITAVA…</div>
          ) : notifications.length === 0 ? (
            <div style={{ marginTop: 20, padding: 18, borderRadius: 16, border: `1px dashed ${AB.line2}`, textAlign: 'center' }}>
              <div style={{ fontSize: 34 }}>🔔</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginTop: 8 }}>Još nema notifikacija</div>
              <p style={{ fontSize: 13.5, color: AB.ink2, lineHeight: 1.55, margin: '6px 0 0' }}>
                Ovde stižu veze, REP koraci i pozivi — čim krene noć.
              </p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <button
                key={n.id}
                onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                className="os-press"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left', padding: '13px 0', background: 'transparent', border: 0, borderBottom: `1px solid ${AB.line}`, cursor: 'pointer' }}
              >
                <span style={{ width: 40, height: 40, borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: n.is_read ? AB.raised : hexA(AB.acid, 0.1), border: `1px solid ${n.is_read ? AB.line : AB.acidDim}` }}>
                  {ICON[n.type] || '⚡'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: n.is_read ? AB.ink2 : AB.ink }}>{n.title}</span>
                    {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: AB.acid, flex: 'none' }} />}
                  </span>
                  {n.body && <span style={{ display: 'block', fontSize: 13, color: AB.ink3, lineHeight: 1.45, marginTop: 2 }}>{n.body}</span>}
                  <span style={{ display: 'block', ...LABEL, marginTop: 5 }}>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: srLatn }).toUpperCase()}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
