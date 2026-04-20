import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronRight, Music, MapPin, User, Sparkles } from "lucide-react";

const GENRES = ["Techno", "House", "Deep House", "Trance", "Hip Hop", "Indie", "Rock", "Pop", "R&B", "Drum & Bass", "Hard Techno", "Afro"];
const CITIES = ["Belgrade", "Novi Sad", "Niš", "Subotica", "Kragujevac"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("Belgrade");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      setDisplayName(user.user_metadata?.display_name || "");
    });
  }, [navigate]);

  const toggleGenre = (g: string) => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 5 ? [...prev, g] : prev
    );
  };

  const finish = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          age: age ? parseInt(age) : null,
          city,
          bio,
          music_preferences: genres,
          onboarding_completed: true,
        })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Welcome to AfterBefore! 🎉");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? "bg-gradient-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 animate-fade-in">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex p-3 rounded-2xl bg-gradient-primary mb-4">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-black mb-2">Who are you?</h2>
                <p className="text-muted-foreground">Tell us a bit about yourself</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Marko"
                    className="h-12 bg-input/50 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="26"
                    min={18}
                    max={99}
                    className="h-12 bg-input/50 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCity(c)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          city === c ? "bg-gradient-primary text-white shadow-glow" : "glass text-muted-foreground"
                        }`}
                      >
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex p-3 rounded-2xl bg-gradient-primary mb-4">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-black mb-2">Your sound</h2>
                <p className="text-muted-foreground">Pick 3-5 genres you love ({genres.length}/5)</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      genres.includes(g)
                        ? "bg-gradient-primary text-white shadow-glow"
                        : "glass glass-hover text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex p-3 rounded-2xl bg-gradient-primary mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-black mb-2">Your vibe</h2>
                <p className="text-muted-foreground">A short bio for your profile</p>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Love deep basslines and late nights..."
                  maxLength={120}
                  rows={4}
                  className="bg-input/50 border-white/10 resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/120</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div className="pt-6">
          <Button
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else finish();
            }}
            disabled={
              loading ||
              (step === 1 && (!displayName || !age)) ||
              (step === 2 && genres.length < 3)
            }
            className="w-full h-14 bg-gradient-primary text-white font-bold text-base shadow-glow"
          >
            {step === 3 ? (loading ? "Setting up..." : "Enter the night") : "Continue"}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
