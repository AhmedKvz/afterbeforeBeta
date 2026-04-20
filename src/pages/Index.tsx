import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { HeatBadge } from "@/components/HeatBadge";
import { Bell, MapPin, Moon, Calendar, Music } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  venue_name: string | null;
  date: string;
  start_time: string;
  image_url: string | null;
  music_genres: string[] | null;
  price: number | null;
  capacity: number | null;
  attendees_count?: number;
}

const FILTERS = ["All", "Tonight", "Techno", "House", "Hip Hop"];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,venue_name,date,start_time,image_url,music_genres,price,capacity")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(30);

      if (data) {
        // Get attendee counts in parallel
        const withCounts = await Promise.all(
          data.map(async (ev) => {
            const { count } = await supabase
              .from("event_checkins")
              .select("id", { count: "exact", head: true })
              .eq("event_id", ev.id);
            return { ...ev, attendees_count: count || 0 };
          })
        );
        setEvents(withCounts);
      }
      setLoading(false);
    };
    if (user) load();
  }, [user]);

  const filtered = events.filter((e) => {
    if (filter === "All") return true;
    if (filter === "Tonight") return e.date === new Date().toISOString().split("T")[0];
    return e.music_genres?.includes(filter);
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen pb-24">
      {/* Top nav */}
      <header className="sticky top-0 z-40 glass border-b border-white/10">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Moon className="w-6 h-6 text-primary" />
            <span className="text-lg font-black gradient-text">AfterBefore</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-white/5">
              <Bell className="w-5 h-5 text-foreground" />
            </button>
            <Link to="/profile" className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span>Belgrade</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-64 rounded-3xl bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <Link to={`/event/${featured.id}`} className="block mb-6">
                <article className="relative h-72 rounded-3xl overflow-hidden glass shadow-card group">
                  {featured.image_url ? (
                    <img src={featured.image_url} alt={featured.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-primary opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute top-4 right-4">
                    <HeatBadge attendees={featured.attendees_count || 0} capacity={featured.capacity} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-xs uppercase tracking-widest text-accent font-bold mb-2">Featured tonight</p>
                    <h2 className="text-2xl font-black text-white mb-2 leading-tight">{featured.title}</h2>
                    <div className="flex items-center gap-3 text-xs text-white/80">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(featured.date), "EEE")} · {featured.start_time?.slice(0, 5)}</span>
                      {featured.venue_name && <span>· {featured.venue_name}</span>}
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === f ? "bg-gradient-primary text-white shadow-glow" : "glass text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Upcoming</h3>

            {rest.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No more events. Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rest.map((ev) => (
                  <Link key={ev.id} to={`/event/${ev.id}`} className="group">
                    <article className="relative aspect-[3/4] rounded-2xl overflow-hidden glass">
                      {ev.image_url ? (
                        <img src={ev.image_url} alt={ev.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      {(ev.attendees_count || 0) >= 20 && (
                        <div className="absolute top-2 right-2">
                          <HeatBadge attendees={ev.attendees_count || 0} capacity={ev.capacity} />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h4 className="text-sm font-bold text-white mb-1 line-clamp-2">{ev.title}</h4>
                        <p className="text-[10px] text-white/70">{format(new Date(ev.date), "EEE")} · {ev.start_time?.slice(0, 5)}</p>
                        {ev.price != null && (
                          <p className="text-xs text-accent font-bold mt-1">€{ev.price}</p>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
