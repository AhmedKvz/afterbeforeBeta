import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Shield, Users, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface SecretEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  venue_name: string;
  image_url: string;
  music_genres: string[];
  max_guests: number;
  access_price_rsd: number;
  requires_verified_profile: boolean;
  is_secret: boolean;
  address: string | null;
}

const SecretPartyRequest = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<SecretEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (eventId) {
      fetchEvent();
      fetchRequestStatus();
      fetchApprovedCount();
    }
  }, [eventId, user]);

  // Realtime subscription for request updates
  useEffect(() => {
    if (!user || !eventId) return;
    const channel = supabase
      .channel(`secret-request-${eventId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'secret_party_requests',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        setRequestStatus(payload.new.status);
        if (payload.new.status === 'approved') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          fetchInviteCode();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, eventId]);

  const fetchEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', eventId!).single();
    setEvent(data as any);
    setLoading(false);
  };

  const fetchRequestStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('secret_party_requests')
      .select('status')
      .eq('event_id', eventId!)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setRequestStatus(data.status);
      if (data.status === 'approved') fetchInviteCode();
    }
  };

  const fetchInviteCode = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('secret_party_invites')
      .select('invite_code')
      .eq('event_id', eventId!)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setInviteCode(data.invite_code);
  };

  const fetchApprovedCount = async () => {
    const { count } = await supabase
      .from('secret_party_requests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId!)
      .eq('status', 'approved');
    setApprovedCount(count || 0);
  };

  const handleSubmitRequest = async () => {
    if (!user || !eventId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('secret_party_requests').insert({
        event_id: eventId,
        user_id: user.id,
        request_message: message || null,
        payment_amount_rsd: event?.access_price_rsd || 0,
      });
      if (error) throw error;
      setRequestStatus('pending');
      toast.success('Request submitted! ⏳');
    } catch (err: any) {
      if (err.code === '23505') toast.error('You already requested access');
      else toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  const isVerified = profile?.is_verified || profile?.instagram_verified;
  const needsVerification = event.requires_verified_profile && !isVerified;
  const spotsLeft = event.max_guests ? event.max_guests - approvedCount : null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img src={event.image_url || '/placeholder.svg'} alt="" className="w-full h-full object-cover opacity-20 blur-3xl scale-110" />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-2xl border-b border-border/30 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <Lock className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Secret Party</span>
          </div>
        </header>

        <div className="px-4 py-6 space-y-6">
          {/* Event info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-6 backdrop-blur-2xl border-primary/20">
              <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
              <p className="text-muted-foreground text-sm mb-4">{event.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30">
                  🔒 Invite Only
                </span>
                {event.requires_verified_profile && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                    <Shield className="w-3 h-3 inline mr-1" /> Verified Only
                  </span>
                )}
                {event.access_price_rsd > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30">
                    {event.access_price_rsd} RSD
                  </span>
                )}
              </div>

              {spotsLeft !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{approvedCount}/{event.max_guests} spots claimed</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {event.music_genres?.map(g => (
                  <span key={g} className="genre-chip">{g}</span>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Status-based content */}
          <AnimatePresence mode="wait">
            {requestStatus === 'approved' && inviteCode ? (
              <motion.div key="approved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <GlassCard className="p-6 border-primary/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
                  <div className="relative text-center">
                    <p className="text-sm text-primary font-medium mb-2">You're in 🔓</p>
                    <motion.div
                      animate={{ boxShadow: ['0 0 20px hsl(var(--primary)/0.3)', '0 0 40px hsl(var(--primary)/0.5)', '0 0 20px hsl(var(--primary)/0.3)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-muted/50 rounded-2xl p-6 my-4"
                    >
                      <p className="text-3xl font-mono font-bold tracking-widest">{inviteCode}</p>
                    </motion.div>
                    <button onClick={copyCode} className="flex items-center gap-2 mx-auto text-sm text-primary">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy code'}
                    </button>
                    <p className="text-xs text-muted-foreground mt-4">Show this code at the door</p>
                  </div>
                </GlassCard>
              </motion.div>
            ) : requestStatus === 'pending' ? (
              <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GlassCard className="p-6 text-center">
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <span className="text-4xl">⏳</span>
                  </motion.div>
                  <p className="font-semibold mt-3">Your request is pending</p>
                  <p className="text-sm text-muted-foreground mt-1">We'll notify you when it's reviewed</p>
                </GlassCard>
              </motion.div>
            ) : requestStatus === 'rejected' ? (
              <motion.div key="rejected" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GlassCard className="p-6 text-center">
                  <span className="text-4xl">😔</span>
                  <p className="font-semibold mt-3">Not this time</p>
                  <p className="text-sm text-muted-foreground mt-1">Your request wasn't approved</p>
                  <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium">
                    Browse other events →
                  </button>
                </GlassCard>
              </motion.div>
            ) : needsVerification ? (
              <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GlassCard className="p-6 text-center">
                  <Shield className="w-12 h-12 mx-auto text-primary mb-3" />
                  <p className="font-semibold">Verified profile required</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Connect your Instagram to request access</p>
                  <button
                    onClick={() => toast.info('Instagram connection coming soon!')}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white"
                  >
                    Connect Instagram
                  </button>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <GlassCard className="p-6">
                  <label className="block text-sm font-medium mb-2">Why should we let you in? (optional)</label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    placeholder="Tell us about yourself..."
                    className="bg-muted/30 border-border/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{message.length}/200</p>
                </GlassCard>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  Request Access
                  {event.access_price_rsd > 0 && ` · ${event.access_price_rsd} RSD`}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SecretPartyRequest;
