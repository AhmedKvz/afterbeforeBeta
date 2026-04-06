import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, CalendarDays, Users, Star, Home, Ticket, BarChart3, User, Lock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VenueEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  event_type: string;
  is_secret: boolean;
}

interface SecretRequest {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  request_message: string | null;
  created_at: string;
  event_title?: string;
  user_display_name?: string;
  user_avatar_url?: string;
  user_xp?: number;
  user_level?: number;
  user_events_attended?: number;
  user_instagram_handle?: string | null;
  user_instagram_verified?: boolean;
  user_is_verified?: boolean;
}

const venueNavItems = [
  { path: '/venue-dashboard', icon: Home, label: 'Dashboard' },
  { path: '/my-events', icon: Ticket, label: 'My Events' },
  { path: '/venue-analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const VenueDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'reviews'>('dashboard');
  const [reviews, setReviews] = useState<any[]>([]);
  const [requests, setRequests] = useState<SecretRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!authLoading && profile && !profile.onboarding_completed) { navigate('/onboarding'); return; }
    if (user) fetchEvents();
  }, [user, profile, authLoading]);

  useEffect(() => {
    if (activeTab === 'requests' && user) fetchRequests();
    if (activeTab === 'reviews' && user) fetchReviews();
  }, [activeTab, user]);

  const fetchReviews = async () => {
    if (!user) return;
    try {
      const eventIds = events.map(e => e.id);
      if (!eventIds.length) return;
      const { data } = await supabase
        .from('event_reviews')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });
      setReviews(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, date, start_time, event_type, is_secret')
        .eq('host_id', user!.id)
        .order('date', { ascending: false });
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    setRequestsLoading(true);
    try {
      const secretEventIds = events.filter(e => e.is_secret || e.event_type === 'secret').map(e => e.id);
      if (!secretEventIds.length) { setRequests([]); setRequestsLoading(false); return; }

      const { data: reqs } = await supabase
        .from('secret_party_requests')
        .select('*')
        .in('event_id', secretEventIds)
        .order('created_at', { ascending: false });

      if (!reqs?.length) { setRequests([]); setRequestsLoading(false); return; }

      const userIds = [...new Set(reqs.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, xp, level, events_attended, instagram_handle, instagram_verified, is_verified')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const eventMap = new Map(events.map(e => [e.id, e]));

      setRequests(reqs.map(r => {
        const p = profileMap.get(r.user_id);
        const ev = eventMap.get(r.event_id);
        return {
          ...r,
          event_title: ev?.title || 'Unknown',
          user_display_name: p?.display_name || 'Anonymous',
          user_avatar_url: p?.avatar_url || '/placeholder.svg',
          user_xp: p?.xp || 0,
          user_level: p?.level || 1,
          user_events_attended: p?.events_attended || 0,
          user_instagram_handle: p?.instagram_handle,
          user_instagram_verified: p?.instagram_verified || false,
          user_is_verified: p?.is_verified || false,
        };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApprove = async (requestId: string, eventTitle: string, userId: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_secret_party_request', { request_id: requestId });
      if (error) throw error;
      
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'secret_party_approved',
        title: "You're in 🔓",
        body: `Your access to ${eventTitle} has been approved. Check your invite code.`,
        data: { event_id: requests.find(r => r.id === requestId)?.event_id, invite_code: (data as any)?.invite_code },
      });

      toast.success('Request approved! Invite code generated.');
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (requestId: string, eventTitle: string, userId: string) => {
    try {
      await supabase.from('secret_party_requests').update({
        status: 'rejected',
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId);

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'secret_party_rejected',
        title: 'Request update',
        body: `Your request for ${eventTitle} was not approved this time.`,
      });

      toast.success('Request rejected.');
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast.error('Failed to reject');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const secretEvents = events.filter(e => e.is_secret || e.event_type === 'secret');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          {profile?.venue_logo_url ? (
            <img src={profile.venue_logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">🏢</div>
          )}
          <div>
            <h1 className="font-bold text-lg">{profile?.venue_name || 'My Venue'}</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === 'dashboard' ? 'bg-primary/15 border border-primary/40 text-foreground' : 'bg-muted/30 border border-border text-muted-foreground'
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all relative',
              activeTab === 'requests' ? 'bg-primary/15 border border-primary/40 text-foreground' : 'bg-muted/30 border border-border text-muted-foreground'
            )}
          >
            <Lock className="w-3.5 h-3.5 inline mr-1" /> Requests
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={cn('flex-1 py-2 rounded-xl text-sm font-medium transition-all',
              activeTab === 'reviews' ? 'bg-primary/15 border border-primary/40 text-foreground' : 'bg-muted/30 border border-border text-muted-foreground'
            )}
          >
            ⭐ Reviews
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-6 space-y-6">
            {/* Quick Stats */}
            <section>
              <h2 className="font-semibold text-lg mb-3">Quick Stats</h2>
              <div className="grid grid-cols-3 gap-3">
                <GlassCard className="p-4 text-center" hoverable={false}>
                  <CalendarDays className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{events.length}</p>
                  <p className="text-xs text-muted-foreground">Events</p>
                </GlassCard>
                <GlassCard className="p-4 text-center" hoverable={false}>
                  <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                </GlassCard>
                <GlassCard className="p-4 text-center" hoverable={false}>
                  <Star className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </GlassCard>
              </div>
            </section>

            {/* Your Events */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">Your Events</h2>
                <button
                  onClick={() => toast.info('Create Event coming soon!')}
                  className="btn-gradient px-4 py-2 rounded-xl text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Create
                </button>
              </div>

              {events.length === 0 ? (
                <GlassCard hoverable={false} className="text-center py-8">
                  <p className="text-muted-foreground">No events yet. Create your first event!</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {events.map((event, i) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <GlassCard onClick={() => navigate(`/event/${event.id}`)} className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{event.title}</p>
                            {event.is_secret && <Lock className="w-3 h-3 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{event.date} · {event.start_time}</p>
                        </div>
                        <CalendarDays className="w-5 h-5 text-muted-foreground" />
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        ) : (
          <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-6 space-y-4">
            {/* Stats bar */}
            <div className="flex gap-3">
              <div className="flex-1 text-center p-2 rounded-lg bg-muted/30">
                <p className="text-lg font-bold">{requests.length}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-primary/10">
                <p className="text-lg font-bold text-primary">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-green-500/10">
                <p className="text-lg font-bold text-green-400">{approvedCount}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
              <div className="flex-1 text-center p-2 rounded-lg bg-destructive/10">
                <p className="text-lg font-bold text-destructive">{rejectedCount}</p>
                <p className="text-[10px] text-muted-foreground">Rejected</p>
              </div>
            </div>

            {secretEvents.length === 0 ? (
              <GlassCard hoverable={false} className="text-center py-8">
                <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No secret events yet</p>
              </GlassCard>
            ) : requestsLoading ? (
              <div className="py-12 text-center">
                <div className="animate-pulse-glow w-12 h-12 rounded-full bg-primary/20 mx-auto" />
              </div>
            ) : requests.length === 0 ? (
              <GlassCard hoverable={false} className="text-center py-8">
                <p className="text-muted-foreground">No requests yet</p>
              </GlassCard>
        ) : activeTab === 'reviews' ? (
          <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-6 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold">🤖 AI Moderation</span>
            </div>
            {reviews.length === 0 ? (
              <GlassCard hoverable={false} className="text-center py-8">
                <p className="text-muted-foreground">No reviews yet</p>
              </GlassCard>
            ) : (
              reviews.map((review: any) => {
                const statusColors: Record<string, string> = {
                  approved: 'bg-green-500/20 text-green-400',
                  pending: 'bg-yellow-500/20 text-yellow-400',
                  flagged: 'bg-red-500/20 text-red-400',
                  removed: 'bg-muted text-muted-foreground',
                };
                const statusIcons: Record<string, string> = {
                  approved: '✅', pending: '⏳', flagged: '🚩', removed: '🗑️',
                };
                const status = review.moderation_status || 'pending';
                return (
                  <GlassCard key={review.id} className="p-4" hoverable={false}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                        ))}
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusColors[status])}>
                        {statusIcons[status]} {status}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-foreground/80 mb-2">"{review.review_text}"</p>
                    )}
                    {review.moderation_flags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {review.moderation_flags.map((flag: string) => (
                          <span key={flag} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{flag}</span>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                );
              })
            )}
          </motion.div>
              <div className="space-y-3">
                {requests.map((req, i) => (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <GlassCard className="p-4" hoverable={false}>
                      <div className="flex items-start gap-3">
                        <img src={req.user_avatar_url || '/placeholder.svg'} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{req.user_display_name}</p>
                            {req.user_is_verified && <span className="text-primary text-xs">✓</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>Lvl {req.user_level}</span>
                            <span>·</span>
                            <span>{req.user_xp} XP</span>
                            <span>·</span>
                            <span>{req.user_events_attended} events</span>
                          </div>
                          {req.user_instagram_handle && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              📸 @{req.user_instagram_handle}
                              {req.user_instagram_verified && ' ✓'}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">For: {req.event_title}</p>
                          {req.request_message && (
                            <p className="text-xs text-foreground/80 mt-1 italic">"{req.request_message}"</p>
                          )}
                        </div>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApprove(req.id, req.event_title || '', req.user_id)}
                            className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(req.id, req.event_title || '', req.user_id)}
                            className="flex-1 py-2 rounded-lg bg-destructive/20 text-destructive text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}

                      {req.status !== 'pending' && (
                        <div className="mt-2">
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'
                          )}>
                            {req.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Venue Bottom Nav */}
      <nav className="bottom-nav">
        {venueNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.path === '/venue-analytics') {
                  toast.info('Analytics coming soon!');
                } else {
                  navigate(item.path);
                }
              }}
              className={cn('bottom-nav-item', isActive && 'active')}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default VenueDashboard;
