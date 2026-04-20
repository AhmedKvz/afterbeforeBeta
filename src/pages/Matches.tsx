import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Heart, Hand } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Matches = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id, event_id, matched_at, events:event_id(title)")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("status", "active")
        .order("matched_at", { ascending: false });

      if (!data) {
        setLoading(false);
        return;
      }

      const otherIds = data.map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, age, avatar_url")
        .in("user_id", otherIds);

      const enriched = data.map((m) => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        const profile = profs?.find((p) => p.user_id === otherId);
        return { ...m, other: profile };
      });

      setMatches(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  const sendWave = async (match: any) => {
    if (!user) return;
    const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id;
    await supabase.from("waves").insert({
      sender_id: user.id,
      receiver_id: otherId,
      match_id: match.id,
    });
    toast.success(`👋 Wave sent to ${match.other?.display_name}`);
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-black">Matches</h1>
          <span className="ml-auto text-xs text-muted-foreground">{matches.length}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-black">No matches yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Check in to an event and start swiping to find your nightlife crew.</p>
          </div>
        ) : (
          <>
            {/* New matches */}
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">New matches</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {matches.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex-shrink-0 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-primary p-0.5 mb-1">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-xl font-black gradient-text">
                        {m.other?.display_name?.[0] || "?"}
                      </div>
                    </div>
                    <p className="text-[10px] truncate w-16">{m.other?.display_name}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* List */}
            <section>
              <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">All matches</h2>
              <div className="space-y-2">
                {matches.map((m) => (
                  <div key={m.id} className="glass glass-hover rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-lg font-black text-white flex-shrink-0">
                      {m.other?.display_name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{m.other?.display_name}{m.other?.age ? `, ${m.other.age}` : ""}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.events?.title} · {formatDistanceToNow(new Date(m.matched_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button onClick={() => sendWave(m)} size="sm" className="bg-gradient-primary text-white shadow-glow h-9">
                      <Hand className="w-4 h-4 mr-1" />
                      Wave
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Matches;
