import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Instagram, Hand } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { BottomNav } from '@/components/BottomNav';
import { incrementQuestProgress } from '@/services/questProgress';
import { toast } from 'sonner';

interface Match {
  id: string;
  matched_at: string;
  event_id: string;
  other_user: {
    id: string;
    display_name: string;
    avatar_url: string;
    age: number;
  };
  event: {
    title: string;
  };
  has_waved: boolean;
}

const Matches = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      // Fetch matches where user is either user1 or user2
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(`
          id,
          matched_at,
          event_id,
          user1_id,
          user2_id,
          events (title)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('matched_at', { ascending: false });
      
      if (error) throw error;
      
      // Get the other user's profile for each match
      const matchPromises = (matchesData || []).map(async (match) => {
        const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, age')
          .eq('user_id', otherUserId)
          .single();
        
        // Check if wave was sent
        const { data: waveData } = await supabase
          .from('waves')
          .select('id')
          .eq('sender_id', user.id)
          .eq('match_id', match.id)
          .maybeSingle();
        
        return {
          id: match.id,
          matched_at: match.matched_at,
          event_id: match.event_id,
          other_user: {
            id: profileData?.user_id || '',
            display_name: profileData?.display_name || 'Unknown',
            avatar_url: profileData?.avatar_url || '/placeholder.svg',
            age: profileData?.age || 0,
          },
          event: {
            title: (match.events as any)?.title || 'Event',
          },
          has_waved: !!waveData,
        };
      });
      
      const enrichedMatches = await Promise.all(matchPromises);
      setMatches(enrichedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWave = async (match: Match) => {
    if (!user) return;
    
    try {
      await supabase.from('waves').insert({
        sender_id: user.id,
        receiver_id: match.other_user.id,
        match_id: match.id,
      });
      
      // Update local state
      setMatches(matches.map(m => 
        m.id === match.id ? { ...m, has_waved: true } : m
      ));
      
      await incrementQuestProgress(user.id, 'social');
      toast.success(`Wave sent to ${match.other_user.display_name}! 👋`);
    } catch (error) {
      console.error('Error sending wave:', error);
      toast.error('Failed to send wave');
    }
  };

  // Separate new matches (last 24 hours) from older ones
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const newMatches = matches.filter(m => new Date(m.matched_at) > oneDayAgo);
  const recentMatches = matches.filter(m => new Date(m.matched_at) <= oneDayAgo);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-xl">Matches</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* New Matches */}
        {newMatches.length > 0 && (
          <section>
            <h2 className="font-bold mb-4">New Matches ({newMatches.length})</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {newMatches.map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-shrink-0 text-center"
                >
                  <div className="relative">
                    <img
                      src={match.other_user.avatar_url || '/placeholder.svg'}
                      alt={match.other_user.display_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs">
                      💜
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-2 truncate max-w-[80px]">
                    {match.other_user.display_name}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Matches */}
        <section>
          <h2 className="font-bold mb-4">Recent</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">💜</div>
              <h3 className="text-xl font-bold mb-2">No matches yet</h3>
              <p className="text-muted-foreground mb-6">
                Start swiping at events to find connections!
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-gradient px-6 py-3 rounded-xl"
              >
                Browse Events
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {[...newMatches, ...recentMatches].map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={match.other_user.avatar_url || '/placeholder.svg'}
                        alt={match.other_user.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">
                            {match.other_user.display_name}
                          </h3>
                          {match.other_user.age > 0 && (
                            <span className="text-muted-foreground">
                              {match.other_user.age}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {match.event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(match.matched_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendWave(match)}
                          disabled={match.has_waved}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            match.has_waved
                              ? 'bg-success/20 text-success'
                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                          }`}
                        >
                          <Hand className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Matches;
