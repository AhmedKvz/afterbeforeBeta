import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OS } from './osTheme';
import { OSOrbNav, OSScreen } from './OSOrbNav';
import { OSHome } from './screens/OSHome';
import { OSExplore } from './screens/OSExplore';
import { OSMatches } from './screens/OSMatches';
import { OSQuests } from './screens/OSQuests';
import { OSProfile } from './screens/OSProfile';
import { OSVenueSheet, OSVenue } from './OSVenueSheet';

/**
 * Nightlife OS — the full app shell. Orb-driven screen switching (no bottom
 * tab bar), a venue bottom-sheet, and the 5 core screens, each wired to the
 * same Supabase hooks the legacy screens use.
 */
export const OSApp = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<OSScreen>('home');
  const [venue, setVenue] = useState<OSVenue | null>(null);

  // Event bus: deep components (venue sheet, celebrations) switch the orb
  // screen without routing to legacy pages (D2 — Capacitor wraps ONE app).
  useEffect(() => {
    const go = (e: Event) => { setScreen((e as CustomEvent).detail as OSScreen); setVenue(null); };
    window.addEventListener('os-go', go);
    return () => window.removeEventListener('os-go', go);
  }, []);

  // Same auth/onboarding guards the legacy Home enforced.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }
    if (profile && !profile.onboarding_completed) { navigate('/onboarding'); return; }
    if (profile && (profile as any).account_type === 'club_venue') { navigate('/venue-dashboard', { replace: true }); return; }
  }, [user, profile, loading, navigate]);

  if (loading || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: OS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'conic-gradient(from 200deg,#a64dff,#3b6fe6,#56d6e6,#34d399,#a64dff)', animation: 'os-pulse 1.6s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div
      className="os-scroll os-phone-frame"
      style={{ minHeight: '100vh', background: OS.bg, color: OS.ink, fontFamily: "'Inter',system-ui,sans-serif", position: 'relative', overflowX: 'hidden' }}
    >
      {screen === 'home' && <OSHome onOpenVenue={setVenue} goProfile={() => setScreen('profile')} />}
      {screen === 'explore' && <OSExplore onOpenVenue={setVenue} />}
      {screen === 'matches' && <OSMatches />}
      {screen === 'quests' && <OSQuests />}
      {screen === 'profile' && <OSProfile />}

      <OSOrbNav current={screen} onGo={(s) => { setScreen(s); setVenue(null); }} />

      {venue && <OSVenueSheet venue={venue} onClose={() => setVenue(null)} />}
    </div>
  );
};

export default OSApp;
