import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bell, CalendarRange, Compass, MapPin, MessageCircle, Target, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoCheckIn } from '@/hooks/useAutoCheckIn';
import { useMyNight } from '@/hooks/useMyNight';
import { useNightCard } from '@/hooks/useNightCard';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { genreCol } from '@/os/osTheme';
import { OSVenuePicker } from '@/os/OSVenuePicker';
import { OSVenueSheet, type OSVenue } from '@/os/OSVenueSheet';
import { OSNightHub } from '@/os/OSNightHub';
import { OSMessagesOverlay } from '@/os/OSMessagesOverlay';
import { OSNightCard } from '@/os/OSNightCard';
import { OSQuests } from '@/os/screens/OSQuests';
import { useNightGuide } from './useNightGuide';
import { DiscoverScreen, PassportScreen, PeopleScreen, TonightScreen, type NightGuideView } from './FreshScreens';
import type { FreshActions, FreshTab } from './types';
import './FreshApp.css';

const NAV: { id: FreshTab; label: string; short: string; icon: ReactNode }[] = [
  { id: 'tonight', label: 'Večeras', short: 'Večeras', icon: <CalendarRange size={20} /> },
  { id: 'discover', label: 'Istraži grad', short: 'Istraži', icon: <Compass size={20} /> },
  { id: 'people', label: 'Ljudi', short: 'Ljudi', icon: <Users size={20} /> },
  { id: 'passport', label: 'Moj pasoš', short: 'Pasoš', icon: <UserRound size={20} /> },
];

const initials = (name?: string | null) => (name || 'AB').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export const FreshApp = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { venueName: deepVenue } = useParams<{ venueName: string }>();
  const [tab, setTab] = useState<FreshTab>('tonight');
  const [venue, setVenue] = useState<OSVenue | null>(null);
  const [picker, setPicker] = useState(false);
  const [hub, setHub] = useState(false);
  const [messages, setMessages] = useState(false);
  const [missions, setMissions] = useState(false);
  const { data: night } = useMyNight();
  const nightCard = useNightCard();
  const guide = useNightGuide();
  const { unreadCount } = useNotifications();
  useAutoCheckIn();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }
    if (profile && !profile.onboarding_completed) { navigate('/onboarding'); return; }
    if (profile?.account_type === 'club_venue') navigate('/venue-dashboard', { replace: true });
  }, [loading, navigate, profile, user]);

  useEffect(() => {
    if (!deepVenue) return;
    let live = true;
    (async () => {
      const { data } = await supabase.from('venues')
        .select('id, name, type, neighborhood, latitude, longitude, geofence_radius_m')
        .eq('name', decodeURIComponent(deepVenue)).maybeSingle();
      if (!live) return;
      if (!data) { navigate('/', { replace: true }); return; }
      setVenue({
        name: data.name,
        genre: String(data.type || 'club').toUpperCase(),
        col: genreCol(data.type || 'club'),
        venueId: data.id,
        presenceId: data.name,
        lat: data.latitude == null ? null : Number(data.latitude),
        lng: data.longitude == null ? null : Number(data.longitude),
        radius: data.geofence_radius_m || 100,
        neighborhood: String(data.neighborhood || '').toUpperCase(),
      });
    })();
    return () => { live = false; };
  }, [deepVenue, navigate]);

  useEffect(() => {
    const go = (event: Event) => {
      const target = String((event as CustomEvent).detail || '');
      if (target === 'matches') { setMessages(true); return; }
      if (target === 'profile') { setTab('passport'); return; }
      if (target === 'quests') { setMissions(true); return; }
      if (target === 'grad') setTab('tonight');
    };
    window.addEventListener('os-go', go);
    return () => window.removeEventListener('os-go', go);
  }, []);

  const closeVenue = () => {
    setVenue(null);
    if (deepVenue) navigate('/', { replace: true });
  };

  const actions: FreshActions = {
    openVenue: setVenue,
    openVenuePicker: () => setPicker(true),
    openNightHub: () => night && setHub(true),
    openMessages: () => setMessages(true),
    openMissions: () => setMissions(true),
    openNotifications: () => navigate('/notifications'),
    go: (next) => { setTab(next); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  };

  if (loading || !profile) {
    return (
      <div className="fresh-loading">
        <div><span>AB</span><i /></div>
        <p>Čitamo grad…</p>
      </div>
    );
  }

  const screen = (() => {
    if (tab === 'discover') return <DiscoverScreen guide={guide as NightGuideView} actions={actions} />;
    if (tab === 'people') return <PeopleScreen actions={actions} />;
    if (tab === 'passport') return <PassportScreen guide={guide as NightGuideView} actions={actions} />;
    return <TonightScreen guide={guide as NightGuideView} night={night} actions={actions} />;
  })();

  return (
    <div className="fresh-app">
      <aside className="fresh-desktop-nav">
        <button className="fresh-wordmark" onClick={() => actions.go('tonight')} aria-label="AfterBefore početna">
          <span>AFTER</span><span>BEFORE</span>
        </button>
        <div className="fresh-city-label"><MapPin size={14} /> Beograd</div>
        <nav>
          {NAV.map((item) => <NavButton key={item.id} item={item} current={tab} onClick={() => actions.go(item.id)} />)}
        </nav>
        <button className={`fresh-checkin-side ${night ? 'is-live' : ''}`} onClick={night ? actions.openNightHub : actions.openVenuePicker}>
          <span><MapPin size={19} /></span>
          <span><strong>{night ? 'Moja noć' : 'Gde sam?'}</strong><small>{night ? night.venueName : 'Check-in kada stigneš'}</small></span>
        </button>
        <div className="fresh-nav-trust"><span><i />Beta uživo</span><small>Vidljivost je uvek tvoj izbor.</small></div>
      </aside>

      <div className="fresh-app-body">
        <header className="fresh-mobile-header">
          <button className="fresh-wordmark" onClick={() => actions.go('tonight')}><span>AFTER</span><span>BEFORE</span></button>
          <span className="fresh-mobile-city"><MapPin size={13} /> BG</span>
          <button className="fresh-header-icon" onClick={actions.openNotifications} aria-label="Notifikacije">
            <Bell size={18} />{unreadCount > 0 && <i>{Math.min(unreadCount, 9)}</i>}
          </button>
          <button className="fresh-mini-avatar" onClick={() => actions.go('passport')} style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>{!profile.avatar_url && initials(profile.display_name)}</button>
        </header>

        <main key={tab}>{screen}</main>
      </div>

      <nav className="fresh-mobile-nav" aria-label="Glavna navigacija">
        {NAV.slice(0, 2).map((item) => <NavButton key={item.id} item={item} current={tab} onClick={() => actions.go(item.id)} />)}
        <button className={`fresh-checkin-mobile ${night ? 'is-live' : ''}`} onClick={night ? actions.openNightHub : actions.openVenuePicker} aria-label={night ? 'Otvori moju noć' : 'Izaberi mesto za check-in'}>
          <span><MapPin size={22} /></span><small>{night ? 'NOĆ' : 'TU SAM'}</small>
        </button>
        {NAV.slice(2).map((item) => <NavButton key={item.id} item={item} current={tab} onClick={() => actions.go(item.id)} />)}
      </nav>

      {venue && <OSVenueSheet venue={venue} onClose={closeVenue} />}
      {picker && <OSVenuePicker onPick={(picked) => { setPicker(false); setVenue(picked); }} onClose={() => setPicker(false)} />}
      {hub && night && <OSNightHub night={night} onClose={() => setHub(false)} />}
      {messages && <OSMessagesOverlay onClose={() => setMessages(false)} />}
      {missions && (
        <div className="fresh-full-layer">
          <header><div><span>Misije, nagrade i doprinos</span><strong>Tvoj napredak</strong></div><button onClick={() => setMissions(false)} aria-label="Zatvori"><X size={20} /></button></header>
          <OSQuests embedded />
        </div>
      )}
      {nightCard.fresh && nightCard.card && <OSNightCard card={nightCard.card} onClose={nightCard.dismiss} />}
    </div>
  );
};

const NavButton = ({ item, current, onClick }: { item: typeof NAV[number]; current: FreshTab; onClick: () => void }) => (
  <button className={current === item.id ? 'is-active' : ''} onClick={onClick} aria-current={current === item.id ? 'page' : undefined}>
    {item.icon}<span className="fresh-nav-long">{item.label}</span><span className="fresh-nav-short">{item.short}</span>
    {item.id === 'people' && <MessageCircle className="fresh-nav-whisper" size={9} />}
  </button>
);

export default FreshApp;
