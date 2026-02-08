import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyWinners } from '@/hooks/useWeeklyWinners';
import { supabase } from '@/integrations/supabase/client';

export const WeeklyWinnersButton = () => {
  const { user } = useAuth();
  const { announceWinners, isAnnouncing } = useWeeklyWinners();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminRole();
  }, [user]);

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 right-4 z-40"
    >
      <Button
        onClick={() => announceWinners()}
        disabled={isAnnouncing}
        className="rounded-full h-14 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
      >
        <Trophy className="w-5 h-5 mr-2" />
        {isAnnouncing ? 'Announcing...' : 'Announce Weekly Winners'}
      </Button>
    </motion.div>
  );
};
