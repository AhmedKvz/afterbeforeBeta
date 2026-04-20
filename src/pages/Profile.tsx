import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, LogOut, Trophy, Heart, Calendar, Music, Sparkles } from "lucide-react";
import { xpProgress } from "@/lib/xp";

const ACHIEVEMENTS = [
  { id: "first_match", icon: "💜", name: "First Match", desc: "Made your first match", condition: (s: any) => s.matches >= 1 },
  { id: "party_animal", icon: "🎉", name: "Party Animal", desc: "Attended 10+ events", condition: (s: any) => s.events >= 10 },
  { id: "social_butterfly", icon: "🦋", name: "Social Butterfly", desc: "50+ matches", condition: (s: any) => s.matches >= 50 },
  { id: "night_owl", icon: "🦉", name: "Night Owl", desc: "Active after 3AM", condition: () => false },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ matches: 0, events: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(p);

      const { count: matchCount } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const { count: eventCount } = await supabase
        .from("event_checkins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({ matches: matchCount || 0, events: eventCount || 0 });
      setLoading(false);
    };
    load();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const xp = profile.xp || 0;
  const level = profile.level || 1;
  const progress = xpProgress(xp);
  const unlocked = ACHIEVEMENTS.filter((a) => a.condition({ matches: stats.matches, events: stats.events }));

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-black">Profile</h1>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full glass flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={signOut} className="w-9 h-9 rounded-full glass flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Avatar + Name */}
        <section className="text-center">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-primary p-1 shadow-glow mb-4">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-4xl font-black gradient-text">
              {profile.display_name?.[0] || "?"}
            </div>
          </div>
          <h2 className="text-2xl font-black">{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</h2>
          {profile.city && <p className="text-sm text-muted-foreground">{profile.city}</p>}
          {profile.bio && <p className="text-sm text-foreground/80 italic mt-2 max-w-xs mx-auto">"{profile.bio}"</p>}
        </section>

        {/* XP Card */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Level</p>
                <p className="text-2xl font-black">{level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">XP</p>
              <p className="text-2xl font-black gradient-text">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-right">
            {progress.current} / {progress.next} to level {level + 1}
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-black">{stats.events}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Events</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Heart className="w-5 h-5 mx-auto mb-1 text-secondary" />
            <p className="text-xl font-black">{stats.matches}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Matches</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-xl font-black">{unlocked.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Badges</p>
          </div>
        </section>

        {/* Music */}
        {profile.music_preferences?.length > 0 && (
          <section>
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <Music className="w-3 h-3" /> Your sound
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.music_preferences.map((g: string) => (
                <span key={g} className="px-3 py-1.5 rounded-full glass text-xs font-semibold">{g}</span>
              ))}
            </div>
          </section>
        )}

        {/* Achievements */}
        <section>
          <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Achievements</h3>
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = a.condition({ matches: stats.matches, events: stats.events });
              return (
                <div key={a.id} className={`glass rounded-2xl p-4 text-center ${!isUnlocked && "opacity-40"}`}>
                  <div className="text-3xl mb-1">{a.icon}</div>
                  <p className="text-xs font-bold">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Link to="/my-events">
          <Button variant="outline" className="w-full h-12 mt-4">
            <Calendar className="w-4 h-4 mr-2" />
            My Events
          </Button>
        </Link>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
