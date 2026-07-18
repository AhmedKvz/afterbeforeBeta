import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVenuePresence, useSetVenuePresence } from '@/hooks/useHeatVenues';
import { useSparkActions } from '@/hooks/useSparks';
import { useSignalIntent } from '@/hooks/useRedemptions';
import { incrementQuestProgress } from '@/services/questProgress';
import { getCurrentPosition, calculateDistance, formatDistance } from '@/services/geolocation';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { shouldShowFeedback } from '@/lib/feedbackCadence';
import { OSFeedbackSheet } from './OSFeedbackSheet';
import { OSEventRow } from './OSEventRow';
import { OSDanceMode } from './OSDanceMode';
import { OSSetTimes } from './OSSetTimes';
import { OSCrew } from './OSCrew';
import { OSMatchCelebration } from './OSMatchCelebration';
import { useCheckIn } from './venue/useCheckIn';
import { OSClaimCard } from './venue/OSClaimCard';
import { OSDareWheel } from './OSDareWheel';
import { OS, G, hexA, MONO, HATCH } from './osTheme';

const db = supabase as any;
const DEV_SKIP_GEOFENCE = import.meta.env.VITE_OPEN_CHECKIN === 'true';


export interface OSVenue {
  name: string;
  genre?: string;            // display label, e.g. "TECHNO · OD 2009"
  col: string;               // wheel color
  venueId?: string | null;   // real venue uuid → enables GPS check-in / spark / idem
  presenceId?: string | null;// heat-venue id → live presence (opt-in, who's here)
  eventId?: string | null;   // event uuid → enables writing a review
  lat?: number | null;
  lng?: number | null;
  radius?: number;
  heat?: number;             // energy 0-100
  here?: number;             // headcount
  neighborhood?: string;
  rating?: number;
}

// Crowd-DNA radar — the "scene intelligence" layer (no backend yet; representative).
const RADAR = [
  { label: 'Music', value: 92, color: G.techno },
  { label: 'Crowd', value: 78, color: G.underground },
  { label: 'Atmosphere', value: 85, color: G.community },
  { label: 'Authenticity', value: 95, color: G.festival },
  { label: 'Safety', value: 60, color: G.house },
  { label: 'Discovery', value: 70, color: G.afterparty },
];

const Radar = () => {
  const size = 130, cx = 65, cy = 65, R = 48;
  const vals = RADAR.map((m) => m.value / 100);
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const rings = [1, 2, 3].map((ring) => {
    const d = RADAR.map((_, i) => { const [x, y] = pt(i, (R * ring) / 3); return `${i ? 'L' : 'M'}${x} ${y}`; }).join(' ') + 'Z';
    return <path key={ring} d={d} fill="none" stroke="rgba(255,255,255,.08)" />;
  });
  const poly = RADAR.map((m, i) => { const [x, y] = pt(i, R * vals[i]); return `${i ? 'L' : 'M'}${x} ${y}`; }).join(' ') + 'Z';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
      {rings}
      <path d={poly} fill="rgba(86,214,230,.14)" stroke={G.community} strokeWidth="1.5" />
      {RADAR.map((m, i) => { const [x, y] = pt(i, R * vals[i]); return <circle key={i} cx={x} cy={y} r="2.4" fill={m.color} />; })}
    </svg>
  );
};

const PAvatar = ({ p, size = 38 }: any) => (
  p.avatar
    ? <img src={p.avatar} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: size * 0.34, background: avatarGradient(hueFromString(p.name || p.user_id)) }}>{initials(p.name || '·')}</div>
);

/* ── Reviews: list by venue + rate (write needs an event context) ── */
const OSReviews = ({ venueName, eventId }: { venueName: string; eventId?: string | null }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['os-venue-reviews', venueName],
    queryFn: async () => {
      const { data } = await db.from('event_reviews')
        .select('id, rating, review_text, verified_visit, created_at')
        .eq('venue_name', venueName).neq('moderation_status', 'flagged')
        .order('created_at', { ascending: false }).limit(8);
      return data || [];
    },
  });
  const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length : 0;

  const submit = async () => {
    if (!user || !eventId || !rating || busy) return;
    setBusy(true);
    const { error } = await db.from('event_reviews').insert({ user_id: user.id, event_id: eventId, rating, review_text: text.trim() || null });
    setBusy(false);
    if (error) { toast.error(error.message?.includes('duplicate') ? 'Već si ocenio ovaj događaj.' : 'Greška — pokušaj ponovo.'); return; }
    incrementQuestProgress(user.id, 'review').catch(() => {});
    track('review_submit', { venue: venueName, rating });
    toast.success('Hvala na recenziji ✓');
    setRating(0); setText('');
    qc.invalidateQueries({ queryKey: ['os-venue-reviews', venueName] });
  };

  return (
    <div style={{ margin: '16px 16px 0', padding: 16, borderRadius: 18, background: OS.surface, border: `1px solid ${OS.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>RECENZIJE · ZAJEDNICA</span>
        {reviews.length > 0 && <span style={{ fontFamily: MONO, fontSize: 13, color: G.house }}>★ {avg.toFixed(1)} · {reviews.length}</span>}
      </div>

      {eventId && (
        <div style={{ marginBottom: reviews.length ? 14 : 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} style={{ flex: 1, height: 34, borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 16, background: n <= rating ? hexA(G.house, 0.2) : 'rgba(255,255,255,.05)', color: n <= rating ? G.house : OS.ink6 }}>★</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} placeholder="Tvoja recenzija (opciono)…" style={{ flex: 1, background: OS.bg, border: `1px solid ${OS.line2}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: OS.ink, outline: 'none' }} />
            <button onClick={submit} disabled={!rating || busy} style={{ flex: 'none', padding: '9px 14px', borderRadius: 10, border: 0, cursor: rating ? 'pointer' : 'default', fontWeight: 600, fontSize: 13, background: rating ? G.house : 'rgba(255,255,255,.05)', color: rating ? '#0B0B0D' : OS.ink7 }}>{busy ? '…' : 'Oceni'}</button>
          </div>
        </div>
      )}

      {reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r: any) => (
            <div key={r.id} style={{ paddingBottom: 10, borderBottom: `1px solid ${OS.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: G.house }}>{'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0, 5 - r.rating))}</span>
                {r.verified_visit && <span style={{ fontFamily: MONO, fontSize: 8, color: G.festival, background: hexA(G.festival, 0.12), padding: '2px 6px', borderRadius: 999 }}>✓ POSEĆENO</span>}
              </div>
              {r.review_text && <div style={{ fontSize: 12.5, color: OS.ink3, lineHeight: 1.4 }}>{r.review_text}</div>}
            </div>
          ))}
        </div>
      ) : !eventId ? (
        <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, textAlign: 'center', padding: '8px 0' }}>JOŠ NEMA RECENZIJA.</div>
      ) : null}
    </div>
  );
};

export const OSVenueSheet = ({ venue, onClose }: { venue: OSVenue; onClose: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [match, setMatch] = useState<{ name?: string; avatar?: string } | null>(null);
  const [sparked, setSparked] = useState<Set<string>>(new Set());
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [pview, setPview] = useState<'list' | 'swipe'>('list');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [danceOpen, setDanceOpen] = useState(false);
  const [dareOpen, setDareOpen] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);

  // Live presence (opt-in) — only when opened from a heat-map venue.
  const { data: presence } = useVenuePresence(venue.presenceId || null);
  const setPresence = useSetVenuePresence();
  const { send: sendSpark } = useSparkActions();
  const signalIntent = useSignalIntent();
  const meVisible = !!presence?.me_visible;
  const people: any[] = presence?.people || [];

  const energy = venue.heat; // bez podatka = bez broja (iskren-broj)
  const here = presence?.headcount ?? venue.here ?? 0;

  const toggleVisible = () => { if (venue.presenceId) setPresence.mutate({ venue: venue.presenceId, visible: !meVisible }); };
  const spark = (pid: string) => {
    if (!venue.venueId) return;
    const person = people.find((p) => p.user_id === pid);
    sendSpark.mutate({ to: pid, venue: venue.venueId }, {
      onSuccess: (res: any) => { if (res?.mutual) setMatch({ name: person?.name, avatar: person?.avatar }); },
    });
    setSparked((s) => new Set(s).add(pid));
    if (user) incrementQuestProgress(user.id, 'match').catch(() => {});
  };
  const idem = () => {
    if (!venue.venueId) return;
    signalIntent.mutate({ venue: venue.venueId });
    if (user) incrementQuestProgress(user.id, 'signal').catch(() => {});
  };

  // RA-style: this venue's events (upcoming + past)
  const { data: venueEvents = [] } = useQuery({
    queryKey: ['os-venue-events', venue.name],
    queryFn: async () => {
      const { data } = await db.from('events').select('id, title, date, start_time, image_url, music_genres, venue_name, lineup, set_times')
        .eq('venue_name', venue.name).order('date', { ascending: true });
      return data || [];
    },
  });
  const today = new Date().toISOString().split('T')[0];
  const upcoming = venueEvents.filter((e: any) => e.date >= today);
  const past = venueEvents.filter((e: any) => e.date < today).reverse();
  const [following, setFollowing] = useState(false);

  // Real numbers only — no invented heritage/rank/influence (honest-numbers rule).
  const stats = [
    { value: String(here), label: 'OVDE SADA', color: G.festival },
    { value: String(upcoming.length), label: 'DOLAZI', color: G.techno },
    { value: String(past.length), label: 'ARHIVA NOĆI', color: G.house },
  ];

  const { checkIn, done, busy } = useCheckIn(venue, (vid) => setFeedback(vid));

  // Meta iz imenika: cover slika, instagram, koordinate (za "kako stići").
  const { data: vmeta } = useQuery({
    queryKey: ['venue-meta', venue.name],
    queryFn: async () => {
      const { data } = await db.from('venues').select('cover_url, instagram, latitude, longitude').eq('name', venue.name).maybeSingle();
      return data;
    },
  });
  const mapsHref = (vmeta?.latitude != null && vmeta?.longitude != null)
    ? `https://www.google.com/maps/dir/?api=1&destination=${vmeta.latitude},${vmeta.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' Beograd')}`;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5,5,7,.66)', animation: 'os-scrim .25s ease' }} />
      <div className="os-scroll" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, top: 24, zIndex: 61, borderRadius: '26px 26px 0 0', overflowY: 'auto', background: OS.surface3, border: '1px solid rgba(255,255,255,.08)', animation: 'os-sheet .4s cubic-bezier(.16,1,.3,1)', paddingBottom: 24, maxWidth: 520, margin: '0 auto' }}>
        {/* hero */}
        <div style={{ position: 'relative', height: 240, background: vmeta?.cover_url ? `linear-gradient(180deg,rgba(7,7,8,.15),rgba(7,7,8,.82)), center/cover url(${vmeta.cover_url})` : `linear-gradient(160deg,${hexA(venue.col, 0.4)},#0e0f12 78%)` }}>
          {!vmeta?.cover_url && <div style={{ position: 'absolute', inset: 0, background: HATCH }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#0E0E11 3%,transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.3)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 16, width: 34, height: 34, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'rgba(10,10,12,.6)', color: OS.ink, fontSize: 15, backdropFilter: 'blur(8px)' }}>✕</button>
          <div style={{ position: 'absolute', bottom: 16, left: 18, right: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: hexA(venue.col, 0.95) }}>{venue.genre || 'VENUE'}</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', color: OS.ink, lineHeight: 1, marginTop: 5 }}>{venue.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink4, marginTop: 7 }}>{venue.neighborhood || 'BEOGRAD'}{venue.rating ? ` · ★ ${venue.rating.toFixed(1)}` : ''}</div>
          </div>
        </div>

        {/* action bar — RA-style follow + followers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
          <button onClick={() => setFollowing((f) => !f)} style={{ flex: 'none', padding: '10px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14, border: following ? `1px solid ${OS.line2}` : 0, background: following ? 'transparent' : venue.col, color: following ? OS.ink2 : '#0B0B0D' }}>{following ? '✓ Pratiš' : '+ Prati'}</button>
          
          <button onClick={checkIn} disabled={busy} style={{ marginLeft: 'auto', flex: 'none', padding: '10px 16px', borderRadius: 12, cursor: busy ? 'default' : 'pointer', fontWeight: 600, fontSize: 13, border: `1px solid ${hexA(G.festival, 0.4)}`, background: done ? hexA(G.festival, 0.15) : 'transparent', color: G.festival, opacity: busy ? 0.6 : 1 }}>{done ? '✓ Tu si' : '📍 Check-in'}</button>
        </div>

        {/* IG + kako stići */}
        {(vmeta?.instagram || true) && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px 0', flexWrap: 'wrap' }}>
            {vmeta?.instagram && (
              <a href={`https://instagram.com/${String(vmeta.instagram).replace('@','')}`} target="_blank" rel="noreferrer"
                 style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, color: OS.ink3, border: `1px solid ${OS.line2}`, borderRadius: 999, padding: '8px 14px' }}>
                📸 @{String(vmeta.instagram).replace('@','')}
              </a>
            )}
            <a href={mapsHref} target="_blank" rel="noreferrer"
               style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, color: OS.ink3, border: `1px solid ${OS.line2}`, borderRadius: 999, padding: '8px 14px' }}>
              🧭 KAKO DA STIGNEM
            </a>
          </div>
        )}

        {/* live presence — opt-in, who's here */}
        {venue.presenceId && (
          <div style={{ margin: '16px 16px 0', padding: 16, borderRadius: 18, background: OS.surface, border: `1px solid ${OS.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6 }}>KO JE TU · {here}</span>
              <button onClick={toggleVisible} disabled={setPresence.isPending} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: meVisible ? G.festival : OS.ink5 }}>{meVisible ? 'VISIBLE' : 'GHOST'}</span>
                <span style={{ width: 38, height: 22, borderRadius: 999, border: '1px solid rgba(255,255,255,.12)', background: meVisible ? hexA(G.festival, 0.3) : 'rgba(255,255,255,.06)', position: 'relative', display: 'inline-block' }}>
                  <span style={{ position: 'absolute', top: 2, left: meVisible ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: OS.ink, transition: 'left .2s' }} />
                </span>
              </button>
            </div>
            {meVisible ? (() => {
              const crowd = people.filter((p) => p.user_id && p.user_id !== user?.id);
              if (!crowd.length) return <div style={{ fontSize: 12, color: OS.ink5, textAlign: 'center', padding: '8px 0' }}>Niko vidljiv još — budi prvi 👋</div>;
              const featured = crowd.find((p) => !sparked.has(p.user_id) && !passed.has(p.user_id)) || null;
              const pass = (pid: string) => setPassed((s) => new Set(s).add(pid));
              return (
                <>
                  {/* list / swipe toggle */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {(['list', 'swipe'] as const).map((v) => (
                      <button key={v} onClick={() => setPview(v)} style={{ flex: 1, padding: '7px 0', borderRadius: 9, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.06em', border: 0, background: pview === v ? hexA(G.afterparty, 0.18) : 'rgba(255,255,255,.05)', color: pview === v ? G.afterparty : OS.ink5 }}>{v === 'list' ? '☰ LISTA' : '❤ SWIPE'}</button>
                    ))}
                  </div>

                  {pview === 'list' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {crowd.map((p) => (
                        <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <PAvatar p={p} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: OS.ink }}>{p.name}{p.age ? `, ${p.age}` : ''}</div>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6 }}>OVDE SADA</div>
                          </div>
                          <button onClick={() => spark(p.user_id)} disabled={sparked.has(p.user_id)} style={{ flex: 'none', cursor: sparked.has(p.user_id) ? 'default' : 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: '7px 12px', borderRadius: 10, border: 0, background: sparked.has(p.user_id) ? hexA(G.afterparty, 0.15) : G.afterparty, color: sparked.has(p.user_id) ? G.afterparty : '#0B0B0D' }}>{sparked.has(p.user_id) ? '✨ ✓' : '✨ ISKRA'}</button>
                        </div>
                      ))}
                    </div>
                  ) : featured ? (
                    <div>
                      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', height: 240, background: featured.avatar ? `center/cover url(${featured.avatar})` : avatarGradient(hueFromString(featured.name || featured.user_id)) }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.82),transparent 55%)' }} />
                        <div style={{ position: 'absolute', left: 14, bottom: 14 }}>
                          <div style={{ fontSize: 21, fontWeight: 700, color: '#fff' }}>{featured.name}{featured.age ? <span style={{ fontWeight: 500 }}>, {featured.age}</span> : ''}</div>
                          <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,.85)', marginTop: 4 }}>📍 OVDE · {venue.name.toUpperCase()}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                        <button onClick={() => pass(featured.user_id)} style={{ flex: 'none', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', border: `1px solid ${OS.line2}`, background: OS.surface, color: OS.ink5, fontSize: 18 }}>✕</button>
                        <button onClick={() => spark(featured.user_id)} style={{ flex: 1, maxWidth: 220, padding: '14px 0', borderRadius: 16, cursor: 'pointer', border: 0, background: `linear-gradient(135deg,${G.afterparty},${G.underground})`, color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: `0 10px 28px -10px ${hexA(G.afterparty, 0.6)}` }}>✨ Pošalji iskru</button>
                      </div>
                      <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, color: OS.ink6, marginTop: 10 }}>ANONIMNO · javimo ti ako uzvrati · ✕ da preskočiš</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: OS.ink5, textAlign: 'center', padding: '18px 0' }}>To je sve — prošao/la si sve koji su tu ✨</div>
                  )}
                </>
              );
            })() : (
              <div style={{ fontSize: 12, color: OS.ink5, textAlign: 'center', padding: '6px 0 2px' }}>{here} {here === 1 ? 'osoba je' : 'ljudi je'} ovde. Uključi VISIBLE da vidiš ko — i da oni vide tebe. 🤝</div>
            )}
          </div>
        )}

        {/* Nađi ekipu — form a crew for tonight */}
        <div style={{ padding: '10px 16px 0' }}>
          <button onClick={() => setCrewOpen(true)} style={{ width: '100%', padding: 15, borderRadius: 16, border: `1px solid ${hexA(G.community, 0.4)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(135deg, ${hexA(G.community, 0.14)}, ${hexA(G.techno, 0.06)})`, textAlign: 'left' }}>
            <span style={{ fontSize: 26 }}>🧑‍🤝‍🧑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: OS.ink }}>Nađi ekipu za večeras</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>NIKAD NE IZLAZIŠ SAM · GRUPA OD ISTE NAMERE</div>
            </div>
            <span style={{ color: G.community, fontSize: 18 }}>›</span>
          </button>
        </div>

        {/* dance floor — the killer feature */}
        <div style={{ padding: '12px 16px 0' }}>
          <button onClick={() => setDanceOpen(true)} style={{ width: '100%', padding: 15, borderRadius: 16, border: `1px solid ${hexA(G.afterparty, 0.4)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(135deg, ${hexA(G.afterparty, 0.14)}, ${hexA(G.underground, 0.06)})`, textAlign: 'left' }}>
            <span style={{ fontSize: 26 }}>🕺</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: OS.ink }}>Dance Floor Mode</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>PLEŠI · SKORUJ · LEADERBOARD NOĆI</div>
            </div>
            <span style={{ color: G.afterparty, fontSize: 18 }}>›</span>
          </button>
        </div>

        {/* Zavrti noć — smela misija */}
        <div style={{ padding: '10px 16px 0' }}>
          <button onClick={() => setDareOpen(true)} style={{ width: '100%', minHeight: 46, padding: '12px 15px', borderRadius: 16, border: `1px dashed ${hexA(G.afterparty, 0.45)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', textAlign: 'left' }}>
            <span style={{ fontSize: 20 }}>🎲</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: OS.ink2 }}>Zavrti noć</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', color: G.afterparty }}>SMEŠ LI?</span>
          </button>
        </div>

        {/* Satnica — set times for tonight / the opened event */}
        {(() => {
          const ste = venueEvents.find((e: any) => e.id === venue.eventId) || upcoming[0];
          return ste ? <OSSetTimes event={ste} onSaved={() => qc.invalidateQueries({ queryKey: ['os-venue-events', venue.name] })} /> : null;
        })()}

        {/* RA-style events at this venue */}
        {upcoming.length > 0 && (
          <div style={{ padding: '20px 16px 0' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 4 }}>DOGAĐAJI · {upcoming.length}</div>
            {upcoming.map((e: any) => <OSEventRow key={e.id} e={e} />)}
          </div>
        )}
        {past.length > 0 && (
          <div style={{ padding: '18px 16px 0' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 4 }}>PROŠLI · {past.length}</div>
            {past.slice(0, 4).map((e: any) => <OSEventRow key={e.id} e={e} past />)}
          </div>
        )}

        {/* live */}
        <div style={{ margin: '14px 16px 0', padding: 14, borderRadius: 16, background: `linear-gradient(140deg,${hexA(G.festival, 0.12)},transparent)`, border: `1px solid ${hexA(G.festival, 0.22)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: G.festival, boxShadow: `0 0 10px ${G.festival}`, animation: 'os-pulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, color: OS.ink }}>{here} ovde sada</span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: energy != null ? G.festival : OS.ink6 }}>{energy != null ? `ENERGY ≈${energy}` : 'ENERGY —'}</span>
        </div>

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, padding: '14px 16px 0' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: 12, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}` }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: OS.ink6, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* crowd DNA */}
        <div style={{ margin: '16px 16px 0', padding: 16, borderRadius: 18, background: OS.surface, border: `1px solid ${OS.line}` }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: '#7E828C', marginBottom: 6 }}>CROWD DNA · PREVIEW — PUNI SE SA RECENZIJAMA</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Radar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RADAR.map((m) => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: OS.ink3, marginBottom: 3 }}>
                    <span>{m.label}</span><span style={{ fontFamily: MONO, color: m.color }}>{m.value}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* reviews — list + rate */}
        <OSReviews venueName={venue.name} eventId={venue.eventId} />

        {/* claim funnel — akvizicija klubova (portovano sa legacy /venue) */}
        <OSClaimCard venueName={venue.name} />

        {/* actions */}
        <div style={{ padding: 16, display: 'flex', gap: 10 }}>
          {venue.venueId && (
            <button onClick={idem} disabled={signalIntent.isPending} style={{ flex: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: G.underground, background: hexA(G.underground, 0.12), border: `1px solid ${hexA(G.underground, 0.4)}`, borderRadius: 15, padding: '16px 18px' }}>✋ Idem</button>
          )}
          <button onClick={checkIn} disabled={busy} style={{ flex: 1, cursor: busy ? 'default' : 'pointer', fontSize: 15, fontWeight: 640, color: '#0B0B0D', background: done ? G.festival : venue.col, border: 0, borderRadius: 15, padding: 16, opacity: busy ? 0.7 : 1 }}>
            {done ? 'Prijavljen ✓' : busy ? '…' : 'Check-in'}
          </button>
        </div>
      </div>
      {feedback && <OSFeedbackSheet venueId={feedback} onDone={() => setFeedback(null)} />}
      {dareOpen && <OSDareWheel onClose={() => setDareOpen(false)} />}
      {danceOpen && <OSDanceMode venueId={venue.venueId} venueName={venue.name} onClose={() => setDanceOpen(false)} />}
      {crewOpen && <OSCrew eventId={venue.eventId ?? null} venueId={venue.venueId ?? null} title={venue.name} onClose={() => setCrewOpen(false)} />}
      {match && <OSMatchCelebration otherName={match.name} otherAvatar={match.avatar} onClose={() => setMatch(null)} onOpenChat={() => { setMatch(null); onClose(); window.dispatchEvent(new CustomEvent('os-go', { detail: 'matches' })); }} />}
    </>
  );
};
