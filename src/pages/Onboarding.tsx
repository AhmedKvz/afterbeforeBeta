import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Camera, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const db = supabase as any;

const MUSIC_GENRES = [
  'Techno', 'House', 'Deep House', 'Trance', 'Hip Hop', 'R&B',
  'Indie', 'Rock', 'Pop', 'Electronic', 'Minimal', 'Progressive',
  'Drum & Bass', 'Dubstep', 'Jazz', 'Alternative'
];

const CITIES = [
  'Belgrade', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica',
  'Zrenjanin', 'Pančevo', 'Other'
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [founderReveal, setFounderReveal] = useState<{ number: number; xp: number } | null>(null);

  const isVenue = profile?.account_type === 'club_venue';

  // Party Goer state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Onboarding v2: stated preferences that seed "Za tebe" (and later the
  // intelligence layer). crew intent + weekend picks.
  const [crewIntent, setCrewIntent] = useState<string>('');
  const [pickedEvents, setPickedEvents] = useState<string[]>([]);
  const [pickedVenues, setPickedVenues] = useState<string[]>([]);
  const [weekendEvents, setWeekendEvents] = useState<any[]>([]);
  const [venueOptions, setVenueOptions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: evs } = await db.from('events')
        .select('id, title, date, start_time, venue_name, music_genres')
        .gte('date', today).order('date', { ascending: true }).limit(8);
      setWeekendEvents(evs || []);
      // few/no upcoming events → offer venues instead (honest fallback)
      if (!evs || evs.length < 3) {
        const { data: vens } = await db.from('venues')
          .select('id, name, type, emoji').order('sort', { ascending: false }).order('name').limit(12);
        setVenueOptions(vens || []);
      }
    })();
  }, []);

  const TOTAL_STEPS = isVenue ? 3 : 5;

  // Venue state
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('');
  const [venueGenres, setVenueGenres] = useState<string[]>([]);
  const [venueDescription, setVenueDescription] = useState('');
  const [venueLogoFile, setVenueLogoFile] = useState<File | null>(null);
  const [venueLogoPreview, setVenueLogoPreview] = useState<string | null>(null);
  const [venueInstagram, setVenueInstagram] = useState('');
  const [venuePhone, setVenuePhone] = useState('');

  const toggleGenre = (genre: string) => {
    if (isVenue) {
      if (venueGenres.includes(genre)) {
        setVenueGenres(venueGenres.filter(g => g !== genre));
      } else if (venueGenres.length < 5) {
        setVenueGenres([...venueGenres, genre]);
      }
    } else {
      if (selectedGenres.includes(genre)) {
        setSelectedGenres(selectedGenres.filter(g => g !== genre));
      } else if (selectedGenres.length < 5) {
        setSelectedGenres([...selectedGenres, genre]);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isVenue) {
          setVenueLogoFile(file);
          setVenueLogoPreview(reader.result as string);
        } else {
          setAvatarFile(file);
          setAvatarPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (isVenue) {
      if (step === 1) {
        if (!venueName.trim()) { toast.error('Unesi ime svog mesta'); return; }
        if (!venueAddress.trim()) { toast.error('Unesi adresu mesta'); return; }
        if (!venueCity) { toast.error('Izaberi grad'); return; }
      }
      if (step === 2 && venueGenres.length < 1) {
        toast.error('Izaberi bar 1 žanr');
        return;
      }
    } else {
      if (step === 1) {
        if (!name.trim()) { toast.error('Unesi ime'); return; }
        if (!age || parseInt(age) < 18 || parseInt(age) > 99) { toast.error('Unesi validne godine (18–99)'); return; }
        if (!city) { toast.error('Izaberi grad'); return; }
      }
      if (step === 2 && selectedGenres.length < 3) {
        toast.error('Izaberi bar 3 žanra');
        return;
      }
      if (step === 3 && !crewIntent) {
        toast.error('Izaberi kako izlaziš');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (isVenue) {
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: venueName,
            city: venueCity,
            venue_name: venueName,
            venue_address: venueAddress,
            venue_capacity: venueCapacity ? parseInt(venueCapacity) : null,
            venue_music_genres: venueGenres,
            venue_description: venueDescription,
            venue_logo_url: venueLogoPreview,
            venue_instagram: venueInstagram,
            venue_contact_phone: venuePhone || null,
            onboarding_completed: true,
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // fav_venues = explicit venue picks + venues of picked events
        const favSet = new Set(pickedVenues);
        weekendEvents.filter((e) => pickedEvents.includes(e.id)).forEach((e) => { if (e.venue_name) favSet.add(e.venue_name); });

        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: name,
            age: parseInt(age),
            city,
            music_preferences: selectedGenres,
            avatar_url: avatarPreview,
            crew_intent: crewIntent || null,
            fav_venues: Array.from(favSet),
            onboarding_completed: true,
          } as any)
          .eq('user_id', user.id);
        if (error) throw error;

        // picked events → real "Idem" signals (same shape as EventDetail toggle)
        if (pickedEvents.length) {
          await db.from('event_signals')
            .upsert(pickedEvents.map((id) => ({ event_id: id, user_id: user.id, signal_type: 'going' })), { onConflict: 'event_id,user_id', ignoreDuplicates: true });
        }
      }

      await awardXP(user.id, XP_AWARDS.completeOnboarding, 'Completed onboarding');
      await refreshProfile();

      // Founding Raver claim — if they arrived via ?founder= link
      const founderCode = localStorage.getItem('ab_founder_code');
      if (founderCode) {
        try {
          const { data, error } = await db.rpc('claim_founding_raver', { p_code: founderCode });
          if (!error && data) {
            localStorage.removeItem('ab_founder_code');
            await refreshProfile();
            setFounderReveal({ number: data.number, xp: data.already ? 0 : data.xp });
            return; // stay on onboarding to show reveal screen
          }
        } catch (_) { /* not a founder code — proceed normally */ }
      }

      toast.success('Dobrodošao u AfterBefore! 🎉');
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Greška pri čuvanju profila. Pokušaj ponovo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Venue Steps ──
  const renderVenueStep = () => {
    if (step === 1) {
      return (
        <motion.div key="v-step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">O tvom mestu</h1>
            <p className="text-muted-foreground">Reci nam osnovno o mestu</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Venue Name *</label>
              <input type="text" placeholder="npr. Klub Kult" value={venueName} onChange={(e) => setVenueName(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address *</label>
              <input type="text" placeholder="Ulica i broj" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City *</label>
              <select value={venueCity} onChange={(e) => setVenueCity(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none">
                <option value="">Izaberi grad</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity</label>
              <input type="number" placeholder="Maks. kapacitet" value={venueCapacity} onChange={(e) => setVenueCapacity(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
          </div>
        </motion.div>
      );
    }
    if (step === 2) {
      return (
        <motion.div key="v-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tvoj zvuk</h1>
            <p className="text-muted-foreground">Izaberi 1–5 žanrova</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {MUSIC_GENRES.map((genre) => {
              const isSelected = venueGenres.includes(genre);
              return (
                <button key={genre} onClick={() => toggleGenre(genre)} className={cn('genre-chip', isSelected && 'selected')}>
                  {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                  {genre}
                </button>
              );
            })}
          </div>
          <div className="text-sm text-muted-foreground">Selected: {venueGenres.length}/5</div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description</label>
            <textarea placeholder="Opiši mesto u par reči…" value={venueDescription} onChange={(e) => setVenueDescription(e.target.value.slice(0, 200))} maxLength={200} rows={3} className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none" />
            <p className="text-xs text-muted-foreground text-right">{venueDescription.length}/200</p>
          </div>
        </motion.div>
      );
    }
    // step 3
    return (
      <motion.div key="v-step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Brending</h1>
          <p className="text-muted-foreground">Dodaj logo i mreže</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {venueLogoPreview ? (
              <img src={venueLogoPreview} alt="Logo" className="w-40 h-40 rounded-full object-cover border-4 border-primary" />
            ) : (
              <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <span className="btn-gradient inline-flex items-center gap-2 px-6 py-3 rounded-xl">
              <Camera className="w-5 h-5" />
              {venueLogoPreview ? 'Promeni logo' : 'Dodaj logo'}
            </span>
          </label>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Instagram Handle</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <input type="text" placeholder="yourclub" value={venueInstagram} onChange={(e) => setVenueInstagram(e.target.value)} className="w-full pl-10 pr-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Phone (optional)</label>
            <input type="tel" placeholder="+381 ..." value={venuePhone} onChange={(e) => setVenuePhone(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Party Goer Steps ──
  const renderPartyGoerStep = () => {
    if (step === 1) {
      return (
        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Da počnemo</h1>
            <p className="text-muted-foreground">Par stvari o tebi — da ti pokažemo tvoju noć</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">What's your name?</label>
              <input type="text" placeholder="Ime ili nadimak" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">How old are you?</label>
              <input type="number" placeholder="Godine (18+)" value={age} onChange={(e) => setAge(e.target.value)} min={18} max={99} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Your city?</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none">
                <option value="">Izaberi grad</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </motion.div>
      );
    }
    if (step === 2) {
      return (
        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Šta puštaš kad ti je važno?</h1>
            <p className="text-muted-foreground">Izaberi 3–5 žanrova</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {MUSIC_GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button key={genre} onClick={() => toggleGenre(genre)} className={cn('genre-chip', isSelected && 'selected')}>
                  {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                  {genre}
                </button>
              );
            })}
          </div>
          <div className="text-sm text-muted-foreground">Selected: {selectedGenres.length}/5</div>
        </motion.div>
      );
    }
    if (step === 3) {
      const OPTIONS = [
        { id: 'nadji-mi-ekipu', emoji: '🧑\u200d🤝\u200d🧑', title: 'Nađi mi ekipu', desc: 'Često izlazim solo — poveži me sa ljudima koji idu na isto mesto' },
        { id: 'imam-ekipu', emoji: '🍻', title: 'Imam svoju ekipu', desc: 'Izlazim sa svojima — zanima me samo gde je dobro' },
        { id: 'zavisi', emoji: '🌙', title: 'Zavisi od večeri', desc: 'Nekad solo, nekad sa ekipom — neka mi obe opcije budu otvorene' },
      ];
      return (
        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Kako izlaziš?</h1>
            <p className="text-muted-foreground">Da znamo da li da ti nudimo ekipu za večeras</p>
          </div>
          <div className="space-y-3">
            {OPTIONS.map((o) => {
              const sel = crewIntent === o.id;
              return (
                <button key={o.id} onClick={() => setCrewIntent(o.id)} className={cn('w-full text-left p-4 rounded-2xl border transition-all', sel ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{o.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold">{o.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{o.desc}</div>
                    </div>
                    {sel && <Check className="w-5 h-5 text-primary flex-none" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      );
    }
    if (step === 4) {
      const toggleEvent = (id: string) => setPickedEvents((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
      const toggleVenue = (n: string) => setPickedVenues((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
      return (
        <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Šta bi posetio ovog vikenda?</h1>
            <p className="text-muted-foreground">Označi šta te privlači — od toga krećemo (možeš i da preskočiš)</p>
          </div>
          {weekendEvents.length > 0 && (
            <div className="space-y-3">
              {weekendEvents.map((e) => {
                const sel = pickedEvents.includes(e.id);
                const d = (e.date || '').slice(8, 10) + '.' + (e.date || '').slice(5, 7) + '.';
                return (
                  <button key={e.id} onClick={() => toggleEvent(e.id)} className={cn('w-full text-left p-4 rounded-2xl border transition-all', sel ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{e.title}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{e.venue_name} · {d} {(e.start_time || '').slice(0, 5)}</div>
                      </div>
                      {sel && <Check className="w-5 h-5 text-primary flex-none" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {venueOptions.length > 0 && (
            <div>
              {weekendEvents.length > 0 && <p className="text-sm text-muted-foreground mb-3">…ili mesta koja te zanimaju:</p>}
              <div className="flex flex-wrap gap-3">
                {venueOptions.map((v) => {
                  const sel = pickedVenues.includes(v.name);
                  return (
                    <button key={v.id} onClick={() => toggleVenue(v.name)} className={cn('genre-chip', sel && 'selected')}>
                      {sel && <Check className="w-4 h-4 inline mr-1" />}
                      {v.emoji ? `${v.emoji} ` : ''}{v.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {weekendEvents.length === 0 && venueOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">Program se puni — preskoči ovaj korak.</p>
          )}
        </motion.div>
      );
    }
    // step 5 — photo
    return (
      <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dodaj najbolju fotku</h1>
          <p className="text-muted-foreground">Ovo je tvoja profilna</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-40 h-40 rounded-full object-cover border-4 border-primary" />
            ) : (
              <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <span className="btn-gradient inline-flex items-center gap-2 px-6 py-3 rounded-xl">
              <Camera className="w-5 h-5" />
              {avatarPreview ? 'Promeni fotku' : 'Dodaj fotku'}
            </span>
          </label>
        </div>
      </motion.div>
    );
  };

  // ── Founding Raver reveal screen ──
  if (founderReveal) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          className="w-full max-w-sm"
        >
          {/* Shield/flag icon */}
          <div className="text-[80px] mb-4">🏴</div>

          {/* Number */}
          <div
            className="text-[72px] font-black leading-none mb-1"
            style={{ background: 'linear-gradient(135deg, oklch(0.78 0.16 260), oklch(0.65 0.20 300))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            #{founderReveal.number}
          </div>

          <div className="text-2xl font-extrabold mb-1">Founding Raver</div>
          <div className="text-muted-foreground text-sm mb-6">u Beogradu</div>

          {/* XP pill */}
          {founderReveal.xp > 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full mb-6 text-sm font-bold"
              style={{ background: 'oklch(0.45 0.18 260 / 0.3)', color: 'oklch(0.78 0.16 260)', border: '1px solid oklch(0.55 0.18 260 / 0.5)' }}
            >
              +{founderReveal.xp} XP · Bonus dobrodošlice
            </motion.div>
          )}

          <p className="text-[13px] text-muted-foreground mb-8 leading-relaxed">
            Ti si deo prve generacije koja gradi AfterBefore.<br />
            Samo <strong className="text-foreground">100 Founding Ravera</strong> postoji u Beogradu.
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-sm"
            style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 260), oklch(0.45 0.24 300))', boxShadow: '0 12px 32px -8px oklch(0.55 0.22 260 / 0.5)' }}
          >
            Kreni 🏴
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isVenue ? renderVenueStep() : renderPartyGoerStep()}
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
        {step < TOTAL_STEPS ? (
          <button onClick={handleNext} className="w-full btn-gradient py-4 rounded-xl flex items-center justify-center gap-2">
            Dalje <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={handleFinish} disabled={loading} className="w-full btn-gradient py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'Čuvam…' : 'Uđi u scenu ✓'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
