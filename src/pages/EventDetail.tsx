import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Heart, MapPin, Calendar, Users, Music, Wallet, CheckCircle2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { getCurrentPosition, calculateDistance } from "@/lib/geo";
import { awardXP } from "@/lib/xp";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(ev);

      const { data: ci } = await supabase
        .from("event_checkins")
        .select("user_id, profiles:user_id(display_name, avatar_url)")
        .eq("event_id", id);
      setAttendees(ci || []);

      const { data: mine } = await supabase
        .from("event_checkins")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setCheckedIn(!!mine);

      const { data: wish } = await supabase
        .from("event_wishlists")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setWishlisted(!!wish);

      setLoading(false);
    };
    load();
  }, [id, user]);

  const toggleWishlist = async () => {
    if (!user || !id) return;
    if (wishlisted) {
      await supabase.from("event_wishlists").delete().eq("event_id", id).eq("user_id", user.id);
      setWishlisted(false);
    } else {
      await supabase.from("event_wishlists").insert({ event_id: id, user_id: user.id });
      setWishlisted(true);
      toast.success("Added to wishlist");
    }
  };

  const handleCheckIn = async () => {
    if (!user || !event) return;
    setCheckingIn(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        if (event.latitude && event.longitude) {
          const dist = calculateDistance(lat, lng, event.latitude, event.longitude);
          const radius = event.geofence_radius || 100;
          if (dist > radius) {
            toast.error(`You're ${Math.round(dist)}m away. Get within ${radius}m of the venue!`);
            setCheckingIn(false);
            return;
          }
        }
      } catch {
        toast.warning("Couldn't verify GPS — checking in anyway");
      }

      const { error } = await supabase.from("event_checkins").insert({
        event_id: event.id,
        user_id: user.id,
        latitude: lat,
        longitude: lng,
      });
      if (error) throw error;

      await supabase.from("active_users").upsert({
        user_id: user.id,
        event_id: event.id,
        latitude: lat,
        longitude: lng,
        last_seen: new Date().toISOString(),
        is_visible: true,
      }, { onConflict: "user_id,event_id" });

      await awardXP(user.id, 50, "Event check-in");
      toast.success("Checked in! +50 XP", { description: "Circle Swipe unlocked!" });
      setCheckedIn(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <div className="relative h-80">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={toggleWishlist} className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <Heart className={`w-5 h-5 ${wishlisted ? "fill-secondary text-secondary" : ""}`} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 max-w-md mx-auto">
          <div className="glass rounded-2xl p-4">
            <h1 className="text-2xl font-black mb-1 leading-tight">{event.title}</h1>
            {event.venue_name && <p className="text-sm text-muted-foreground">{event.venue_name}</p>}
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-5">
        {/* Info pills */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Date</p>
              <p className="text-xs font-semibold">{format(new Date(event.date), "MMM d")} · {event.start_time?.slice(0, 5)}</p>
            </div>
          </div>
          <div className="glass rounded-xl p-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Going</p>
              <p className="text-xs font-semibold">{attendees.length}{event.capacity ? ` / ${event.capacity}` : ""}</p>
            </div>
          </div>
          {event.address && (
            <div className="glass rounded-xl p-3 flex items-center gap-2 col-span-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-xs">{event.address}</p>
            </div>
          )}
          {event.price != null && (
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                <p className="text-xs font-bold text-accent">€{event.price}</p>
              </div>
            </div>
          )}
        </div>

        {/* About */}
        {event.description && (
          <section>
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">About</h3>
            <p className="text-sm leading-relaxed text-foreground/90">{event.description}</p>
          </section>
        )}

        {/* Genres */}
        {event.music_genres?.length > 0 && (
          <section>
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <Music className="w-3 h-3" /> Music
            </h3>
            <div className="flex flex-wrap gap-2">
              {event.music_genres.map((g: string) => (
                <span key={g} className="px-3 py-1 rounded-full glass text-xs font-medium">{g}</span>
              ))}
            </div>
          </section>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <section>
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Who's going ({attendees.length})</h3>
            <div className="flex -space-x-2">
              {attendees.slice(0, 6).map((a, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-gradient-primary border-2 border-background flex items-center justify-center text-xs font-bold text-white">
                  {a.profiles?.display_name?.[0] || "?"}
                </div>
              ))}
              {attendees.length > 6 && (
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold">
                  +{attendees.length - 6}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto p-4 space-y-2">
          {!checkedIn && (
            <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" />
              Check in to unlock Circle Swipe
            </p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleCheckIn}
              disabled={checkedIn || checkingIn}
              className={`flex-1 h-12 font-bold ${checkedIn ? "bg-success/20 text-success border border-success/30" : "bg-gradient-primary text-white shadow-glow"}`}
            >
              {checkedIn ? <><CheckCircle2 className="w-4 h-4 mr-2" />Checked In</> : checkingIn ? "Verifying..." : <><MapPin className="w-4 h-4 mr-2" />Check In</>}
            </Button>
            <Link to={`/circle-swipe/${event.id}`} className="flex-1">
              <Button
                disabled={!checkedIn}
                className="w-full h-12 font-bold bg-gradient-to-r from-secondary to-primary text-white shadow-pink"
              >
                <Heart className="w-4 h-4 mr-2" />
                Circle Swipe
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
