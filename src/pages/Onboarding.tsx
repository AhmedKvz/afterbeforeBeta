import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Camera, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  const isVenue = profile?.account_type === 'club_venue';

  // Party Goer state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
        if (!venueName.trim()) { toast.error('Please enter your venue name'); return; }
        if (!venueAddress.trim()) { toast.error('Please enter your venue address'); return; }
        if (!venueCity) { toast.error('Please select your city'); return; }
      }
      if (step === 2 && venueGenres.length < 1) {
        toast.error('Please select at least 1 music genre');
        return;
      }
    } else {
      if (step === 1) {
        if (!name.trim()) { toast.error('Please enter your name'); return; }
        if (!age || parseInt(age) < 18 || parseInt(age) > 99) { toast.error('Please enter a valid age (18-99)'); return; }
        if (!city) { toast.error('Please select your city'); return; }
      }
      if (step === 2 && selectedGenres.length < 3) {
        toast.error('Please select at least 3 music genres');
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
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: name,
            age: parseInt(age),
            city,
            music_preferences: selectedGenres,
            avatar_url: avatarPreview,
            onboarding_completed: true,
          })
          .eq('user_id', user.id);
        if (error) throw error;
      }

      await awardXP(user.id, XP_AWARDS.completeOnboarding, 'Completed onboarding');
      await refreshProfile();
      toast.success('Welcome to AfterBefore! 🎉');
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save profile. Please try again.');
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
            <h1 className="text-3xl font-bold mb-2">Venue Info</h1>
            <p className="text-muted-foreground">Tell us about your venue</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Venue Name *</label>
              <input type="text" placeholder="e.g. Club Euphoria" value={venueName} onChange={(e) => setVenueName(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address *</label>
              <input type="text" placeholder="Street address" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City *</label>
              <select value={venueCity} onChange={(e) => setVenueCity(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none">
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity</label>
              <input type="number" placeholder="Max capacity" value={venueCapacity} onChange={(e) => setVenueCapacity(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
          </div>
        </motion.div>
      );
    }
    if (step === 2) {
      return (
        <motion.div key="v-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Vibe</h1>
            <p className="text-muted-foreground">Select 1-5 music genres</p>
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
            <textarea placeholder="Describe your venue in a few words..." value={venueDescription} onChange={(e) => setVenueDescription(e.target.value.slice(0, 200))} maxLength={200} rows={3} className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none" />
            <p className="text-xs text-muted-foreground text-right">{venueDescription.length}/200</p>
          </div>
        </motion.div>
      );
    }
    // step 3
    return (
      <motion.div key="v-step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Branding</h1>
          <p className="text-muted-foreground">Add your logo and socials</p>
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
              {venueLogoPreview ? 'Change Logo' : 'Upload Logo'}
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
            <h1 className="text-3xl font-bold mb-2">Let's get started</h1>
            <p className="text-muted-foreground">Tell us a bit about yourself</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">What's your name?</label>
              <input type="text" placeholder="First Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">How old are you?</label>
              <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} min={18} max={99} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Your city?</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none">
                <option value="">Select city</option>
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
            <h1 className="text-3xl font-bold mb-2">What music do you love?</h1>
            <p className="text-muted-foreground">Select 3-5 genres</p>
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
    // step 3
    return (
      <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Add your best photo</h1>
          <p className="text-muted-foreground">This will be your profile picture</p>
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
              {avatarPreview ? 'Change Photo' : 'Upload Photo'}
            </span>
          </label>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isVenue ? renderVenueStep() : renderPartyGoerStep()}
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
        {step < 3 ? (
          <button onClick={handleNext} className="w-full btn-gradient py-4 rounded-xl flex items-center justify-center gap-2">
            Next <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={handleFinish} disabled={loading} className="w-full btn-gradient py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'Saving...' : 'Finish Setup ✓'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
