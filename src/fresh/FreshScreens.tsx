import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, CalendarDays, Check, ChevronRight, Clock3, Compass,
  Flame, Heart, LockKeyhole, MapPin, MessageCircle, Navigation, Search,
  ShieldCheck, Sparkles, Star, Target, Ticket, Users, Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePassport } from '@/hooks/usePassport';
import { useMyReferral } from '@/hooks/useReferral';
import { useSignalIntent } from '@/hooks/useRedemptions';
import { useConversations } from '@/hooks/useMessaging';
import { useReceivedSparks } from '@/hooks/useSparks';
import { getXPProgress } from '@/services/gamification';
import { track } from '@/lib/analytics';
import { OSMeet } from '@/os/OSMeet';
import { OSStories } from '@/os/OSStories';
import { OSScena } from '@/os/OSScena';
import { OSArtistSheet } from '@/os/OSArtistSheet';
import { RoadmapMaker } from '@/os/OSRoadmaps';
import { genreCol } from '@/os/osTheme';
import type { Artist } from '@/hooks/useArtists';
import type { HeatVenue } from '@/hooks/useHeatVenues';
import type { MyNight } from '@/hooks/useMyNight';
import type { OSVenue } from '@/os/OSVenueSheet';
import type { GuideEvent } from './useNightGuide';
import type { FreshActions } from './types';

export interface NightGuideView {
  today: string;
  events: GuideEvent[];
  tonightEvents: GuideEvent[];
  featured: GuideEvent | null;
  signalCounts: Record<string, number>;
  hotVenues: HeatVenue[];
  cityLive: number;
  activeQuest: Record<string, unknown> | null;
  quests: Record<string, unknown>[];
  directory?: { venues: Record<string, unknown>[]; radius: Record<string, number> };
  isLoading: boolean;
  isFallback: boolean;
}

const DATE = new Intl.DateTimeFormat('sr-Latn', { weekday: 'short', day: 'numeric', month: 'short' });
const EVENT_DATE = new Intl.DateTimeFormat('sr-Latn', { weekday: 'short', day: 'numeric', month: 'short' });

const formatTime = (time?: string | null) => time ? time.slice(0, 5) : 'TBA';
const formatDate = (value: string) => EVENT_DATE.format(new Date(`${value}T12:00:00`)).replace('.', '');
const initials = (name?: string | null) => (name || 'AB').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

const venueFromHeat = (venue: HeatVenue): OSVenue => ({
  name: venue.name,
  genre: venue.genreLabel,
  col: genreCol(venue.genreLabel || venue.type),
  venueId: venue.venue_id,
  presenceId: venue.id,
  lat: venue.lat,
  lng: venue.lng,
  radius: venue.radius,
  heat: venue.heat,
  here: venue.here,
  neighborhood: venue.neighborhood.toUpperCase(),
  hidden: venue.hidden,
  minLevel: venue.minLevel,
  discoveredBy: venue.discoveredBy,
});

const venueFromEvent = (event: GuideEvent, guide: NightGuideView): OSVenue => {
  const heat = guide.hotVenues.find((venue) => venue.name.toLowerCase() === event.venue_name.toLowerCase());
  if (heat) return { ...venueFromHeat(heat), eventId: event.source === 'live' ? event.id : null };
  const directoryVenue = guide.directory?.venues.find((venue) => String(venue.name || '').toLowerCase() === event.venue_name.toLowerCase());
  return {
    name: event.venue_name,
    genre: (event.music_genres[0] || event.venue_type || 'Mesto').toUpperCase(),
    col: genreCol(event.music_genres[0] || event.venue_type),
    venueId: directoryVenue ? String(directoryVenue.id) : null,
    presenceId: directoryVenue ? String(directoryVenue.name) : null,
    eventId: event.source === 'live' ? event.id : null,
    lat: directoryVenue?.latitude == null ? null : Number(directoryVenue.latitude),
    lng: directoryVenue?.longitude == null ? null : Number(directoryVenue.longitude),
    radius: directoryVenue?.geofence_radius_m == null ? 100 : Number(directoryVenue.geofence_radius_m),
    neighborhood: String(directoryVenue?.neighborhood || 'BEOGRAD').toUpperCase(),
  };
};

const SectionTitle = ({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) => (
  <div className="fresh-section-title">
    <div>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
    {action && <button onClick={onAction}>{action}<ArrowRight size={15} /></button>}
  </div>
);

const EventArtwork = ({ event, compact = false }: { event: GuideEvent; compact?: boolean }) => {
  const color = genreCol(event.music_genres[0] || event.venue_type);
  return (
    <div className={`fresh-event-art ${compact ? 'is-compact' : ''}`} style={{ '--event-color': color } as React.CSSProperties}>
      {event.image_url && <img src={event.image_url} alt="" loading="lazy" />}
      <div className="fresh-event-art-shade" />
      <span>{event.music_genres[0] || event.venue_type || 'Night'}</span>
    </div>
  );
};

const EventRow = ({ event, count, guide, actions, onDetails }: {
  event: GuideEvent; count: number; guide: NightGuideView; actions: FreshActions; onDetails: (event: GuideEvent) => void;
}) => (
  <article className="fresh-event-row">
    <button className="fresh-event-row-main" onClick={() => actions.openVenue(venueFromEvent(event, guide))}>
      <EventArtwork event={event} compact />
      <span className="fresh-event-row-copy">
        <small>{formatDate(event.date)} · {formatTime(event.start_time)}</small>
        <strong>{event.title}</strong>
        <span><MapPin size={13} />{event.venue_name}{count > 0 ? ` · ${count} ide` : ''}</span>
      </span>
    </button>
    <button className="fresh-icon-button" aria-label={`Detalji za ${event.title}`} onClick={() => onDetails(event)}><ChevronRight size={18} /></button>
  </article>
);

export const TonightScreen = ({ guide, night, actions }: { guide: NightGuideView; night: MyNight | null | undefined; actions: FreshActions }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const intent = useSignalIntent();
  const featured = guide.featured;
  const activeQuest = guide.activeQuest as { title?: string; description?: string; progress?: number; target_count?: number; xp_reward?: number } | null;

  const planFeatured = () => {
    if (!featured) return;
    const venue = venueFromEvent(featured, guide);
    if (venue.venueId) intent.mutate({ venue: venue.venueId });
    else actions.openVenue(venue);
  };

  const eventDetails = (event: GuideEvent) => event.source === 'live'
    ? navigate(`/event/${event.id}`)
    : actions.openVenue(venueFromEvent(event, guide));

  return (
    <div className="fresh-screen fresh-tonight">
      <section className={`fresh-night-hero ${night ? 'is-live' : ''}`}>
        <div className="fresh-hero-noise" />
        <div className="fresh-hero-topline">
          <span>{night ? 'Tvoja noć je aktivna' : 'Večeras u Beogradu'}</span>
          <span className={guide.cityLive > 0 ? 'is-live' : ''}><i />{guide.cityLive > 0 ? `${guide.cityLive} sada napolju` : 'grad se zagreva'}</span>
        </div>
        {night ? (
          <>
            <h1>Tu si.<br />Noć je počela.</h1>
            <p><MapPin size={16} />{night.venueName} · od {night.sinceLabel}</p>
            <div className="fresh-hero-actions">
              <button className="fresh-primary-button" onClick={actions.openNightHub}>Otvori moju noć <ArrowRight size={17} /></button>
              <button className="fresh-secondary-button" onClick={actions.openMessages}><MessageCircle size={17} /> Poruke</button>
            </div>
          </>
        ) : (
          <>
            <h1>Manje dogovora.<br />Više dobre noći.</h1>
            <p>Vidi gde je energija, najavi dolazak i čekiraj se tek kada stigneš.</p>
            <div className="fresh-hero-actions">
              <button className="fresh-primary-button" onClick={actions.openVenuePicker}><Navigation size={17} /> Gde idem?</button>
              <button className="fresh-secondary-button" onClick={() => actions.go('discover')}><Compass size={17} /> Istraži grad</button>
            </div>
            <div className="fresh-trust-line"><ShieldCheck size={14} /> Lokaciju proveravamo samo pri check-inu. Vidljivost biraš ti.</div>
          </>
        )}
      </section>

      {!night && (
        <section className="fresh-loop" aria-label="Kako AfterBefore radi">
          <div><span>1</span><strong>Izaberi</strong><small>događaj ili mesto</small></div>
          <i />
          <div><span>2</span><strong>Stigni</strong><small>check-in potvrđuje dolazak</small></div>
          <i />
          <div><span>3</span><strong>Živi noć</strong><small>ljudi, misije, uspomene</small></div>
        </section>
      )}

      <div className="fresh-content-grid">
        <div className="fresh-content-main">
          {featured && (
            <section>
              <SectionTitle eyebrow="Tvoj najbolji sledeći potez" title={featured.date === guide.today ? 'Večeras' : 'Sledeće'} action="Sve opcije" onAction={() => actions.go('discover')} />
              <article className="fresh-featured-event">
                <EventArtwork event={featured} />
                <div className="fresh-featured-copy">
                  <div className="fresh-event-meta">
                    <span><CalendarDays size={14} />{formatDate(featured.date)}</span>
                    <span><Clock3 size={14} />{formatTime(featured.start_time)}</span>
                  </div>
                  <h3>{featured.title}</h3>
                  <p><MapPin size={15} />{featured.venue_name}</p>
                  <div className="fresh-social-proof">
                    <span className="fresh-avatar-pile"><i>MK</i><i>AN</i><i>+</i></span>
                    <span>{guide.signalCounts[featured.id] > 0 ? `${guide.signalCounts[featured.id]} ljudi je već najavilo dolazak` : 'Prvi signali se skupljaju'}</span>
                  </div>
                  <div className="fresh-card-actions">
                    <button className="fresh-primary-button" onClick={planFeatured} disabled={intent.isPending}>{intent.isPending ? 'Najavljujem…' : 'Idem'} <ArrowRight size={16} /></button>
                    <button className="fresh-text-button" onClick={() => eventDetails(featured)}>Detalji</button>
                  </div>
                </div>
              </article>
            </section>
          )}

          <section>
            <SectionTitle eyebrow="Signal iz grada" title="Gde već ima ljudi" action="Sva mesta" onAction={() => actions.go('discover')} />
            <div className="fresh-venue-strip">
              {guide.hotVenues.slice(0, 5).map((venue) => (
                <button key={venue.id} className="fresh-venue-card" onClick={() => actions.openVenue(venueFromHeat(venue))}>
                  <span className="fresh-venue-emoji">{venue.emoji}</span>
                  <span className="fresh-live-count"><i />{venue.here > 0 ? `${venue.here} ovde` : 'mirno'}</span>
                  <strong>{venue.name}</strong>
                  <small>{venue.neighborhood} · {venue.genreLabel}</small>
                  <span className="fresh-energy"><Flame size={13} /> energija {venue.heat}</span>
                </button>
              ))}
              {guide.hotVenues.length === 0 && (
                <div className="fresh-empty-inline"><MapPin size={18} /><span>Lokacije će se pojaviti čim gradski imenik odgovori.</span></div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle eyebrow="Kratka lista" title="Još za tebe" />
            <div className="fresh-event-list">
              {guide.events.filter((event) => event.id !== featured?.id).slice(0, 5).map((event) => (
                <EventRow key={event.id} event={event} count={guide.signalCounts[event.id] || 0} guide={guide} actions={actions} onDetails={eventDetails} />
              ))}
            </div>
          </section>
        </div>

        <aside className="fresh-context-rail">
          <section className="fresh-mission-card">
            <div className="fresh-card-kicker"><Target size={14} /> Ove nedelje</div>
            {activeQuest ? (
              <>
                <h3>{activeQuest.title}</h3>
                {activeQuest.description && <p>{activeQuest.description}</p>}
                <div className="fresh-progress"><i style={{ width: `${Math.min(100, ((activeQuest.progress || 0) / Math.max(activeQuest.target_count || 1, 1)) * 100)}%` }} /></div>
                <div className="fresh-progress-copy"><span>{activeQuest.progress || 0}/{activeQuest.target_count || 1}</span><strong>+{activeQuest.xp_reward || 0} XP</strong></div>
              </>
            ) : (
              <><h3>Misije stižu uskoro</h3><p>Check-in, recenzije i stvarni doprinos sceni grade tvoj nivo.</p></>
            )}
            <button onClick={actions.openMissions}>Otvori misije <ArrowRight size={15} /></button>
          </section>

          <section className="fresh-explainer-card">
            <span className="fresh-card-kicker"><Sparkles size={14} /> Zašto AfterBefore?</span>
            <h3>Jedan tok za celu noć.</h3>
            <ul>
              <li><Check size={14} /> Događaji i živa energija</li>
              <li><Check size={14} /> Ljudi koji su stvarno na sceni</li>
              <li><Check size={14} /> Pasoš koji se piše sam</li>
            </ul>
            <button onClick={() => actions.go('passport')}>Pogledaj moj pasoš</button>
          </section>

          <button className="fresh-quiet-promo" onClick={() => actions.go('people')}>
            <span><Users size={18} /> Ekipa za pre, izlazak ili after</span>
            <strong>Nađi svoje ljude <ArrowRight size={15} /></strong>
          </button>
        </aside>
      </div>
    </div>
  );
};

export const DiscoverScreen = ({ guide, actions }: { guide: NightGuideView; actions: FreshActions }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'events' | 'venues' | 'scene'>('events');
  const [date, setDate] = useState<'all' | 'tonight' | 'weekend'>('all');
  const [query, setQuery] = useState('');
  const [artist, setArtist] = useState<Artist | null>(null);

  const events = useMemo(() => guide.events.filter((event) => {
    const matches = !query || `${event.title} ${event.venue_name} ${event.music_genres.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (date === 'tonight') return event.date === guide.today;
    if (date === 'weekend') return [0, 5, 6].includes(new Date(`${event.date}T12:00:00`).getDay());
    return true;
  }), [date, guide.events, guide.today, query]);

  const venues = guide.hotVenues.filter((venue) => !query || `${venue.name} ${venue.neighborhood} ${venue.genreLabel}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fresh-screen fresh-discover">
      <header className="fresh-page-intro">
        <span>Beograd, bez beskrajnog skrola</span>
        <h1>Nađi svoju noć.</h1>
        <p>Događaji, mesta i ljudi koji prave scenu — složeni po tome šta ti sada treba.</p>
      </header>

      <div className="fresh-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Traži događaj, mesto ili žanr" /></div>
      <div className="fresh-segmented" role="tablist">
        {([['events', 'Događaji'], ['venues', 'Mesta'], ['scene', 'Scena']] as const).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={mode === value} className={mode === value ? 'is-active' : ''} onClick={() => setMode(value)}>{label}</button>
        ))}
      </div>

      {mode === 'events' && (
        <div className="fresh-discover-body">
          <div className="fresh-filter-row">
            {([['all', 'Sve'], ['tonight', 'Večeras'], ['weekend', 'Vikend']] as const).map(([value, label]) => <button key={value} className={date === value ? 'is-active' : ''} onClick={() => setDate(value)}>{label}</button>)}
          </div>
          <div className="fresh-discover-events">
            {events.map((event) => (
              <article key={event.id} className="fresh-discover-event">
                <button onClick={() => actions.openVenue(venueFromEvent(event, guide))}><EventArtwork event={event} /></button>
                <div>
                  <small>{formatDate(event.date)} · {formatTime(event.start_time)}</small>
                  <h3>{event.title}</h3>
                  <p><MapPin size={14} />{event.venue_name}</p>
                  <span>{event.music_genres.join(' · ') || event.venue_type}</span>
                  <div className="fresh-card-actions">
                    <button className="fresh-primary-button" onClick={() => actions.openVenue(venueFromEvent(event, guide))}>Otvori mesto</button>
                    <button className="fresh-text-button" onClick={() => event.source === 'live' ? navigate(`/event/${event.id}`) : actions.openVenue(venueFromEvent(event, guide))}>Detalji</button>
                  </div>
                </div>
              </article>
            ))}
            {events.length === 0 && <div className="fresh-empty-state"><CalendarDays size={26} /><h3>Nema rezultata.</h3><p>Probaj drugi datum ili žanr.</p></div>}
          </div>
        </div>
      )}

      {mode === 'venues' && (
        <div className="fresh-discover-body">
          <div className="fresh-venue-directory">
            {venues.map((venue, index) => (
              <button key={venue.id} onClick={() => actions.openVenue(venueFromHeat(venue))}>
                <span className="fresh-directory-rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="fresh-venue-emoji">{venue.emoji}</span>
                <span className="fresh-directory-copy"><strong>{venue.name}</strong><small>{venue.neighborhood} · {venue.genreLabel}</small></span>
                <span className={venue.here > 0 ? 'fresh-directory-live is-live' : 'fresh-directory-live'}><i />{venue.here > 0 ? `${venue.here} ovde` : `energija ${venue.heat}`}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <button className="fresh-wide-cta" onClick={actions.openVenuePicker}><Navigation size={17} /> Nađi mesto za check-in</button>
        </div>
      )}

      {mode === 'scene' && (
        <div className="fresh-discover-body fresh-scene-wrap">
          <div className="fresh-scene-message"><Star size={19} /><div><strong>Prati scenu, ne algoritam.</strong><p>DJ-evi, vizuelni umetnici i tattoo majstori sa svojim terminima i radovima.</p></div></div>
          <OSScena onOpenArtist={setArtist} />
        </div>
      )}
      {artist && <OSArtistSheet artist={artist} onClose={() => setArtist(null)} />}
    </div>
  );
};

export const PeopleScreen = ({ actions }: { actions: FreshActions }) => {
  const { data: conversations = [] } = useConversations();
  const { data: sparks = [] } = useReceivedSparks();
  const unread = conversations.reduce((total, conversation) => total + (conversation.unread || 0), 0);

  return (
    <div className="fresh-screen fresh-people">
      <header className="fresh-page-intro">
        <span>Krug · sigurniji i sporiji social</span>
        <h1>Ljudi sa iste scene.</h1>
        <p>Prvo zajednička mesta i noći. Tek onda profil. Bez boostova, bez pay-to-win upoznavanja.</p>
      </header>

      <section className="fresh-stories-panel">
        <div className="fresh-section-title"><div><span>Poslednja 24h</span><h2>Sa scene</h2></div></div>
        <OSStories />
      </section>

      <button className="fresh-inbox-card" onClick={actions.openMessages}>
        <span className="fresh-inbox-icon"><MessageCircle size={23} /></span>
        <span><small>Poruke i isk­re</small><strong>{unread > 0 ? `${unread} novih poruka` : conversations.length > 0 ? `${conversations.length} razgovora` : 'Tvoj inbox je miran'}</strong><em>{sparks.length > 0 ? `${sparks.length} ${sparks.length === 1 ? 'nova iskra' : 'nove iskre'}` : 'Razgovori ostaju dostupni i van izlaska'}</em></span>
        <ChevronRight size={20} />
      </button>

      <section className="fresh-meet-panel">
        <div className="fresh-section-title"><div><span>Upoznavanje uz kontekst</span><h2>Nađi ekipu ili iskru</h2></div></div>
        <OSMeet />
      </section>

      <section className="fresh-safety-card">
        <ShieldCheck size={22} />
        <div><strong>Ti kontrolišeš vidljivost.</strong><p>1 na 1 je opt-in. Prisutnost prikazuje ljude tek kada ste stvarno na istom mestu, a blokiranje i prijava su uvek dostupni.</p></div>
        <LockKeyhole size={18} />
      </section>
    </div>
  );
};

export const PassportScreen = ({ guide, actions }: { guide: NightGuideView; actions: FreshActions }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: passport } = usePassport();
  const { data: referral } = useMyReferral();
  const xp = getXPProgress(profile?.xp || 0);
  const nights = passport?.nights || [];
  const stamps = passport?.stamps || [];
  const activeQuest = guide.activeQuest as { title?: string; progress?: number; target_count?: number } | null;

  const share = async () => {
    if (!referral?.code) return;
    const text = `Uđi u AfterBefore — moj kod je ${referral.code}`;
    const url = `https://ahmedkvz.github.io/afterbeforeBeta/app/#/?ref=${referral.code}`;
    track('passport_shared', { nights: nights.length });
    if (navigator.share) await navigator.share({ title: 'AfterBefore', text, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(`${text} ${url}`);
  };

  if (!profile) return null;
  return (
    <div className="fresh-screen fresh-passport">
      <header className="fresh-passport-cover">
        <div className="fresh-passport-mark">AB</div>
        <span>Noćni pasoš · Beograd</span>
        <div className="fresh-profile-line">
          <div className="fresh-profile-avatar" style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>{!profile.avatar_url && initials(profile.display_name)}</div>
          <div><h1>{profile.display_name}</h1><p>{profile.city || 'Beograd'} · Level {profile.level || 1}{profile.founding_raver_number ? ` · Founding Raver #${profile.founding_raver_number}` : ''}</p></div>
        </div>
        <div className="fresh-xp-line"><div><i style={{ width: `${xp.percentage}%` }} /></div><span>{xp.current}/{xp.required} XP do nivoa {(profile.level || 1) + 1}</span></div>
      </header>

      <section className="fresh-passport-stats">
        <div><strong>{nights.length}</strong><span>Noći</span></div>
        <div><strong>{profile.events_attended || 0}</strong><span>Dolazaka</span></div>
        <div><strong>{stamps.length}</strong><span>Pečata</span></div>
        <div><strong>{profile.total_matches || 0}</strong><span>Veza</span></div>
      </section>

      {profile.music_preferences?.length ? <div className="fresh-taste-row">{profile.music_preferences.slice(0, 6).map((genre) => <span key={genre}>{genre}</span>)}</div> : null}

      <div className="fresh-profile-grid">
        <div>
          <section>
            <SectionTitle eyebrow="Piše se sam" title="Moje noći" />
            {nights.length > 0 ? (
              <div className="fresh-night-timeline">
                {nights.slice(0, 6).map((night) => (
                  <article key={night.key}>
                    <time>{DATE.format(new Date(`${night.key}T12:00:00`))}</time>
                    <div><strong>{[...new Set(night.visits.map((visit) => visit.name))].join(' → ')}</strong><span>{night.visits.length} check-in{night.visits.length === 1 ? '' : 'a'}{night.stamps.length ? ` · ${night.stamps.map((stamp) => stamp.emoji).join(' ')}` : ''}</span></div>
                  </article>
                ))}
              </div>
            ) : <div className="fresh-empty-state"><Ticket size={26} /><h3>Prva stranica je prazna.</h3><p>Čekiraj se kada stigneš i tvoja prva noć će se ovde upisati sama.</p><button onClick={actions.openVenuePicker}>Započni prvu noć</button></div>}
          </section>

          {(stamps.length > 0 || passport?.ghost) && (
            <section>
              <SectionTitle eyebrow="Dokaz, ne skor" title="Pečati" />
              <div className="fresh-stamp-grid">
                {stamps.map((stamp) => <div key={stamp.id}><span>{stamp.emoji}</span><strong>{stamp.name}</strong><small>{stamp.where}</small></div>)}
                {passport?.ghost && <div className="is-ghost"><span>{passport.ghost.emoji}</span><strong>{passport.ghost.name}</strong><small>{passport.ghost.desc}</small></div>}
              </div>
            </section>
          )}
        </div>

        <aside className="fresh-profile-side">
          <section className="fresh-next-night-card">
            <span><Zap size={14} /> Sledeći izlazak</span>
            <RoadmapMaker passport />
          </section>

          {activeQuest && (
            <button className="fresh-profile-quest" onClick={actions.openMissions}>
              <Target size={20} /><span><small>Aktivna misija</small><strong>{activeQuest.title}</strong><em>{activeQuest.progress || 0}/{activeQuest.target_count || 1}</em></span><ChevronRight size={18} />
            </button>
          )}

          {referral?.code && (
            <section className="fresh-invite-card"><Users size={20} /><span><small>Tvoj kod za ekipu</small><strong>{referral.code}</strong></span><button onClick={share}>Podeli</button></section>
          )}

          <nav className="fresh-settings-list">
            <button onClick={() => navigate('/onboarding')}><span>Uredi profil i ukus</span><ChevronRight size={17} /></button>
            <button onClick={actions.openNotifications}><span>Notifikacije</span><Bell size={17} /></button>
            <button onClick={actions.openMessages}><span>Poruke</span><MessageCircle size={17} /></button>
            <button onClick={actions.openMissions}><span>Misije i nagrade</span><Target size={17} /></button>
            <button onClick={async () => { await signOut(); navigate('/auth'); }}><span>Odjavi se</span><ArrowRight size={17} /></button>
          </nav>
        </aside>
      </div>
    </div>
  );
};
