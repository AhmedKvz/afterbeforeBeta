import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance, formatDistance } from '@/services/geolocation';
import { toast } from 'sonner';

interface VenueGateProps {
  venue: { venue_name: string; latitude: number; longitude: number; peopleCount: number };
  userPosition: { latitude: number; longitude: number };
  userId: string;
  onEnterFree: () => void;
  onEnterPaid: () => void;
  onClose: () => void;
}

const VenueGate = ({ venue, userPosition, userId, onEnterFree, onEnterPaid, onClose }: VenueGateProps) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const distance = calculateDistance(
    userPosition.latitude, userPosition.longitude,
    venue.latitude, venue.longitude
  );
  const isNearby = distance <= 150;

  useEffect(() => {
    supabase
      .from('remote_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('venue_name', venue.venue_name)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHasAccess(true);
        setLoading(false);
      });
  }, [userId, venue.venue_name]);

  const handleUnlock = async () => {
    await supabase.from('remote_unlocks').insert({
      user_id: userId,
      venue_name: venue.venue_name,
      amount_rsd: 50,
    });
    toast.success('🔓 Unlocked! (Payment coming soon)');
    onEnterPaid();
  };

  if (loading) return null;

  const canEnter = isNearby || hasAccess;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card p-6 mx-4 max-w-sm w-full space-y-4 text-center">
        {canEnter ? (
          <>
            <div className="text-3xl">📍</div>
            <h3 className="text-xl font-bold text-foreground">
              You're at {venue.venue_name}!
            </h3>
            <p className="text-sm text-muted-foreground">
              {venue.peopleCount} people here now
            </p>
            <Button
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
              onClick={onEnterFree}
            >
              Enter Circle ✨
            </Button>
          </>
        ) : (
          <>
            <div className="text-3xl">👀</div>
            <h3 className="text-xl font-bold text-foreground">
              Peek inside {venue.venue_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {venue.peopleCount} people · {formatDistance(distance)} away
            </p>
            <p className="text-xs text-destructive/80">
              You're not at this venue
            </p>
            <Button
              className="w-full bg-accent text-accent-foreground font-semibold"
              onClick={handleUnlock}
            >
              Unlock for 50 RSD 🔓
            </Button>
            <p className="text-xs text-muted-foreground">Valid for 4 hours</p>
            <button
              className="text-xs text-muted-foreground underline"
              onClick={onClose}
            >
              ✕ Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VenueGate;
