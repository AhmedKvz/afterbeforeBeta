import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Calendar, CheckCircle2, Heart } from "lucide-react";
import { format } from "date-fns";

const MyEvents = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"checkins" | "wishlist">("checkins");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const load = async () => {
      const table = tab === "checkins" ? "event_checkins" : "event_wishlists";
      const dateField = tab === "checkins" ? "checked_in_at" : "created_at";
      const { data } = await supabase
        .from(table)
        .select(`id, ${dateField}, events:event_id(id, title, venue_name, date, start_time, image_url)`)
        .eq("user_id", user.id)
        .order(dateField, { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, [user, tab]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-black">My Events</h1>
        </div>
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setTab("checkins")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "checkins" ? "bg-gradient-primary text-white shadow-glow" : "text-muted-foreground"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 inline mr-1" /> Checked In
            </button>
            <button
              onClick={() => setTab("wishlist")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === "wishlist" ? "bg-gradient-primary text-white shadow-glow" : "text-muted-foreground"
              }`}
            >
              <Heart className="w-3 h-3 inline mr-1" /> Wishlist
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">{tab === "checkins" ? "No check-ins yet" : "Wishlist is empty"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it: any) => it.events && (
              <Link key={it.id} to={`/event/${it.events.id}`} className="block glass glass-hover rounded-2xl p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {it.events.image_url ? (
                    <img src={it.events.image_url} alt={it.events.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{it.events.title}</p>
                  <p className="text-[11px] text-muted-foreground">{it.events.venue_name}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(it.events.date), "MMM d")} · {it.events.start_time?.slice(0, 5)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default MyEvents;
