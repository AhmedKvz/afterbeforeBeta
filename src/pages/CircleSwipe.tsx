import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Heart, Star, ArrowLeft, Eye, EyeOff, Sparkles, MapPin, Music } from "lucide-react";
import { calculateDistance, formatDistance } from "@/lib/geo";
import { awardXP } from "@/lib/xp";

interface Profile {
  user_id: string;
  display_name: string;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  music_preferences: string[] | null;
  distance: number;
}

const CircleSwipe = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ghost, setGhost] = useState(false);
  const [matchedWith, setMatchedWith] = useState<Profile | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  useEffect(() => {
    if (!eventId || !user) return;
    const load = async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
      setEvent(ev);

      // Mark active
      await supabase.from("active_users").upsert({
        user_id: user.id,
        event_id: eventId,
        latitude: ev?.latitude ?? null,
        longitude: ev?.longitude ?? null,
        last_seen: new Date().toISOString(),
        is_visible: true,
      }, { onConflict: "user_id,event_id" });

      // Fetch active users at this event
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: active } = await supabase
        .from("active_users")
        .select("user_id, latitude, longitude")
        .eq("event_id", eventId)
        .neq("user_id", user.id)
        .eq("is_visible", true)
        .gte("last_seen", fiveMinAgo);

      const userIds = active?.map((a) => a.user_id) || [];
      if (userIds.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, age, bio, avatar_url, music_preferences")
        .in("user_id", userIds);

      // Already swiped
      const { data: swiped } = await supabase
        .from("swipes")
        .select("swiped_id")
        .eq("swiper_id", user.id)
        .eq("event_id", eventId);
      const swipedIds = new Set(swiped?.map((s) => s.swiped_id) || []);

      const merged: Profile[] = (profs || [])
        .filter((p) => !swipedIds.has(p.user_id))
        .map((p) => {
          const a = active?.find((x) => x.user_id === p.user_id);
          const dist = a?.latitude && a?.longitude && ev?.latitude && ev?.longitude
            ? calculateDistance(a.latitude, a.longitude, ev.latitude, ev.longitude)
            : 0;
          return { ...p, distance: dist };
        });

      setProfiles(merged);
      setLoading(false);
    };
    load();
  }, [eventId, user]);

  const toggleGhost = async () => {
    if (!user || !eventId) return;
    const newVal = !ghost;
    setGhost(newVal);
    await supabase
      .from("active_users")
      .update({ is_visible: !newVal })
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    toast(newVal ? "Ghost mode on 👻" : "Visible again ✨");
  };

  const swipe = async (action: "like" | "pass" | "superlike") => {
    if (!user || !eventId || index >= profiles.length) return;
    const target = profiles[index];

    await supabase.from("swipes").insert({
      swiper_id: user.id,
      swiped_id: target.user_id,
      event_id: eventId,
      action,
    });

    if (action === "superlike") {
      await awardXP(user.id, 25, "Super like sent");
    }

    if (action === "like" || action === "superlike") {
      const { data: theirs } = await supabase
        .from("swipes")
        .select("id")
        .eq("swiper_id", target.user_id)
        .eq("swiped_id", user.id)
        .eq("event_id", eventId)
        .in("action", ["like", "superlike"])
        .maybeSingle();

      if (theirs) {
        const [u1, u2] = [user.id, target.user_id].sort();
        await supabase.from("matches").insert({
          user1_id: u1,
          user2_id: u2,
          event_id: eventId,
          status: "active",
        });
        await awardXP(user.id, 100, "New match");
        setMatchedWith(target);
      }
    }

    setIndex((i) => i + 1);
    x.set(0);
  };

  const onDragEnd = (_: any, info: { offset: { x: number; y: number } }) => {
    if (info.offset.x > 100) swipe("like");
    else if (info.offset.x < -100) swipe("pass");
    else if (info.offset.y < -100) swipe("superlike");
  };

  const current = profiles[index];
  const next = profiles[index + 1];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold truncate max-w-[180px]">{event?.title}</p>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {profiles.length - index} here now
          </p>
        </div>
        <button onClick={toggleGhost} className="w-9 h-9 rounded-full glass flex items-center justify-center">
          {ghost ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative">
        {loading ? (
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        ) : !current ? (
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-black">No one new here yet</h2>
            <p className="text-sm text-muted-foreground">Stick around — more people are checking in. Or come back in a few minutes.</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">Back to event</Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-[3/4]">
            {/* Stack behind */}
            {next && (
              <div className="absolute inset-0 rounded-3xl glass scale-95 opacity-50" />
            )}

            {/* Active card */}
            <motion.div
              key={current.user_id}
              drag="x"
              style={{ x, rotate }}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={onDragEnd}
              className="absolute inset-0 rounded-3xl overflow-hidden glass shadow-card cursor-grab active:cursor-grabbing"
            >
              {current.avatar_url ? (
                <img src={current.avatar_url} alt={current.display_name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-primary flex items-center justify-center text-7xl font-black text-white/40">
                  {current.display_name?.[0]}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

              {/* Like/Pass overlays */}
              <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 right-6 px-4 py-2 rounded-xl border-4 border-success text-success font-black text-2xl rotate-12">
                LIKE
              </motion.div>
              <motion.div style={{ opacity: passOpacity }} className="absolute top-8 left-6 px-4 py-2 rounded-xl border-4 border-destructive text-destructive font-black text-2xl -rotate-12">
                PASS
              </motion.div>

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-end justify-between mb-2">
                  <h3 className="text-3xl font-black text-white">{current.display_name}{current.age ? `, ${current.age}` : ""}</h3>
                </div>
                {current.distance > 0 && (
                  <p className="text-sm text-success flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(current.distance)} away
                  </p>
                )}
                {current.music_preferences && current.music_preferences.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    <Music className="w-3 h-3 text-accent" />
                    {current.music_preferences.slice(0, 3).map((g) => (
                      <span key={g} className="text-xs text-white/90">{g}</span>
                    ))}
                  </div>
                )}
                {current.bio && (
                  <p className="text-sm text-white/80 italic line-clamp-2">"{current.bio}"</p>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Action buttons */}
        {current && !loading && (
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={() => swipe("pass")}
              className="w-14 h-14 rounded-full glass flex items-center justify-center hover:border-destructive/50 hover:scale-110 transition-all"
            >
              <X className="w-7 h-7 text-destructive" />
            </button>
            <button
              onClick={() => swipe("superlike")}
              className="w-12 h-12 rounded-full bg-gradient-warm flex items-center justify-center hover:scale-110 transition-all shadow-lg"
            >
              <Star className="w-6 h-6 text-white fill-white" />
            </button>
            <button
              onClick={() => swipe("like")}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-secondary to-primary flex items-center justify-center hover:scale-110 transition-all shadow-pink"
            >
              <Heart className="w-7 h-7 text-white fill-white" />
            </button>
          </div>
        )}
      </main>

      {/* Match modal */}
      <AnimatePresence>
        {matchedWith && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setMatchedWith(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h1 className="text-5xl font-black gradient-text mb-2">It's a Match!</h1>
              <p className="text-muted-foreground mb-8">You both liked each other ✨</p>
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-black text-white shadow-glow">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <Heart className="w-8 h-8 text-secondary fill-secondary animate-pulse" />
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-3xl font-black text-white shadow-pink">
                  {matchedWith.display_name?.[0]}
                </div>
              </div>
              <div className="space-y-3">
                <Button onClick={() => navigate("/matches")} className="w-full h-12 bg-gradient-primary text-white font-bold shadow-glow">
                  Send a Wave 👋
                </Button>
                <Button onClick={() => setMatchedWith(null)} variant="outline" className="w-full h-12">
                  Keep swiping
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CircleSwipe;
