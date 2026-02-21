import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, CalendarDays, Users, Star, Home, Ticket, BarChart3, User } from 'lucide-react';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!authLoading && profile && !profile.onboarding_completed) { navigate('/onboarding'); return; }
    if (user) fetchEvents();
  }, [user, profile, authLoading]);

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, date, start_time')
        .eq('host_id', user!.id)
        .order('date', { ascending: false });
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

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

      <div className="px-4 py-6 space-y-6">
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
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard onClick={() => navigate(`/event/${event.id}`)} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.date} · {event.start_time}</p>
                    </div>
                    <CalendarDays className="w-5 h-5 text-muted-foreground" />
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

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
