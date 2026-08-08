import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OS, AB } from './osTheme';
import { OSOrbNav, OSScreen } from './OSOrbNav';
import { OSHome } from './screens/OSHome';
import { OSProfile } from './screens/OSProfile';
import { OSNightHub } from './OSNightHub';
import { OSMessagesOverlay } from './OSMessagesOverlay';
import { OSVenuePicker } from './OSVenuePicker';
import { useMyNight } from '@/hooks/useMyNight';
import { useNightCard } from '@/hooks/useNightCard';
import { OSNightCard } from './OSNightCard';
import { useAutoCheckIn } from '@/hooks/useAutoCheckIn';
import { OSVenueSheet, OSVenue } from './OSVenueSheet';
import { genreCol } from './osTheme';
import { supabase } from '@/integrations/supabase/client';

/**
 * Nightlife OS — the full app shell. Orb-driven screen switching (no bottom
 * tab bar), a venue bottom-sheet, and the 5 core screens, each wired to the
 * same Supabase hooks the legacy screens use.
 */
export const OSApp = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<OSScreen>('grad');
  // IA v2 §11.2: orb = TU SAM. Bez check-ina → izbor mesta; sa njim → hub noći.
  const [hub, setHub] = useState(false);
  // LJUDI radi cele nedelje → poruke moraju da postoje i van noći (bez check-ina
  // hub ne postoji, a match u utorak mora da se otvori). Samostalni overlay.
  const [msgs, setMsgs] = useState(false);
  const [picker, setPicker] = useState(false);
  const { data: night } = useMyNight();
  // „Idem" → auto potvrda dolaska kad se stvarno nađeš na lokaciji (poeni bez ručnog check-ina)
  useAutoCheckIn();
  // Plesna kartica — prvi ulazak posle završene noći (jednom po noći)
  const nightCard = useNightCard();
  const [venue, setVenue] = useState<OSVenue | null>(null);

  // Deep link /venue/:venueName → otvori OS venue sheet (zamena za legacy
  // VenueDetail stranicu — jedan dizajn svuda). URL se resetuje na zatvaranje.
  const { venueName: deepVenue } = useParams<{ venueName: string }>();
  useEffect(() => {
    if (!deepVenue) return;
    (async () => {
      const { data: v } = await (supabase as any).from('venues')
        .select('id, name, type, neighborhood, latitude, longitude, geofence_radius_m')
        .eq('name', decodeURIComponent(deepVenue)).maybeSingle();
      if (!v) { navigate('/', { replace: true }); return; }
      setVenue({
        name: v.name, genre: (v.type || 'club').toUpperCase(), col: genreCol(v.type || 'club'),
        venueId: v.id, presenceId: v.name,
        lat: v.latitude != null ? Number(v.latitude) : null, lng: v.longitude != null ? Number(v.longitude) : null,
        radius: v.geofence_radius_m || 100, neighborhood: (v.neighborhood || '').toUpperCase(),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepVenue]);

  const closeVenue = () => { setVenue(null); if (deepVenue) navigate('/', { replace: true }); };

  // Event bus: deep components (venue sheet, celebrations) switch screens
  // without routing to legacy pages (D2 — Capacitor wraps ONE app).
  // IA v2 mapiranje: quests/profile → 'ja' · matches → hub večeri (poruke
  // više nemaju svoj tab) · sve ostalo → 'grad'.
  useEffect(() => {
    const go = (e: Event) => {
      const raw = String((e as CustomEvent).detail);
      setVenue(null);
      if (raw === 'matches') { if (night) setHub(true); else setMsgs(true); return; }
      // Pasoš odluka 2026-07-29: questovi žive u GRAD → Misije prikaz, ne u JA.
      setScreen(raw === 'profile' ? 'ja' : 'grad');
      if (raw === 'quests') setTimeout(() => window.dispatchEvent(new CustomEvent('ab-grad-view', { detail: 'misije' })), 60);
    };
    window.addEventListener('os-go', go);
    return () => window.removeEventListener('os-go', go);
  }, [night]);

  // Same auth/onboarding guards the legacy Home enforced.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }
    if (profile && !profile.onboarding_completed) { navigate('/onboarding'); return; }
    if (profile && (profile as any).account_type === 'club_venue') { navigate('/venue-dashboard', { replace: true }); return; }
  }, [user, profile, loading, navigate]);

  if (loading || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: AB.void, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'conic-gradient(from 200deg,#a64dff,#3b6fe6,#56d6e6,#34d399,#a64dff)', animation: 'os-pulse 1.6s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div
      className="os-scroll os-phone-frame"
      style={{ minHeight: '100vh', background: AB.void, color: AB.ink, fontFamily: "'Inter',system-ui,sans-serif", position: 'relative', overflowX: 'hidden' }}
    >
      {/* key={screen} → os-screen enter na svaku promenu ekrana (motion audit 🔴1) */}
      <div key={screen} style={{ animation: 'os-screen .18s cubic-bezier(.22,1,.36,1) both' }}>
        {screen === 'grad' && <OSHome onOpenVenue={setVenue} goProfile={() => setScreen('ja')} />}
        {screen === 'ja' && <OSProfile />}
      </div>

      <OSOrbNav
        current={screen}
        live={!!night}
        onGo={(s) => { setScreen(s); setVenue(null); }}
        onOrb={() => (night ? setHub(true) : setPicker(true))}
      />

      {venue && <OSVenueSheet venue={venue} onClose={closeVenue} />}
      {picker && <OSVenuePicker onPick={(v) => { setPicker(false); setVenue(v); }} onClose={() => setPicker(false)} />}
      {hub && night && <OSNightHub night={night} onClose={() => setHub(false)} />}
      {msgs && <OSMessagesOverlay onClose={() => setMsgs(false)} />}
      {nightCard.fresh && nightCard.card && <OSNightCard card={nightCard.card} onClose={nightCard.dismiss} />}
    </div>
  );
};

export default OSApp;
