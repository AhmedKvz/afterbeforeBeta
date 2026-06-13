import { useState, useMemo } from 'react';
import { Plus, Minus, MapPin, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHeatVenues, useVenuePresence, useSetVenuePresence, BELGRADE_HOODS, HeatVenue } from '@/hooks/useHeatVenues';
import { useSendWave } from '@/hooks/useMessaging';
import { BottomNav } from '@/components/BottomNav';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { supabase } from '@/integrations/supabase/client';
import { awardXP, XP_AWARDS } from '@/services/gamification';
import { incrementQuestProgress } from '@/services/questProgress';
import { getCurrentPosition, calculateDistance, formatDistance } from '@/services/geolocation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRICING = [
  { id: 'peek', rsd: 100, label: 'Peek this venue', sub: '24h · this venue only', emoji: '👁', best: false },
  { id: 'day', rsd: 300, label: 'Day Pass', sub: 'All venues · until 6am', emoji: '☀️', best: true },
  { id: 'week', rsd: 1000, label: 'Week Pass', sub: 'Unlimited · 7 days', emoji: '🔥', best: false },
  { id: 'plus', rsd: 3500, label: 'AfterBefore+', sub: 'Monthly · priority · 1 free drink', emoji: '💎', best: false },
];

const DAY_TYPES = [
  { id: 'all', label: 'All' }, { id: 'cafe', label: '☕ Cafés' }, { id: 'cafe_bar', label: '🥐 Cafés' },
  { id: 'restaurant', label: '🍽 Eats' }, { id: 'gallery', label: '🎨 Art' }, { id: 'bar', label: '🍹 Bars' },
];
const NIGHT_TYPES = [
  { id: 'all', label: 'All' }, { id: 'club', label: '🎵 Clubs' }, { id: 'bar', label: '🍸 Bars' },
  { id: 'splav', label: '🚢 Splavi' }, { id: 'afterplace', label: '☕ After' },
];

// GPS geofence enforced on check-in (set true only for local testing)
const DEV_SKIP_GEOFENCE = false;

const HeatMap = () => {
  const { user } = useAuth();
  const { data: venues = [], isLoading } = useHeatVenues();
  const [mode, setMode] = useState<'day' | 'night'>('night');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [atVenueId, setAtVenueId] = useState<string | null>(null);
  const [peeked, setPeeked] = useState<Set<string>>(new Set());
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [swiped, setSwiped] = useState<Set<string>>(new Set());

  // on-the-spot like/pass on someone in the "who's here" list
  const swipePerson = async (pid: string, name: string, action: 'like' | 'pass') => {
    if (!user || !pid || pid === 'x' || pid === user.id) return;
    setSwiped((s) => new Set(s).add(pid));
    try {
      await supabase.from('swipes').insert({ swiper_id: user.id, swiped_id: pid, event_id: null, action });
      if (action === 'pass') return;
      const { data: theirs } = await supabase
        .from('swipes').select('id')
        .eq('swiper_id', pid).eq('swiped_id', user.id).is('event_id', null)
        .in('action', ['like', 'superlike']).maybeSingle();
      if (theirs) {
        await supabase.from('matches').insert({ user1_id: user.id, user2_id: pid, event_id: null });
        await awardXP(user.id, XP_AWARDS.match, 'Got a match!');
        await incrementQuestProgress(user.id, 'match');
        await supabase.from('notifications').insert([
          { user_id: user.id, type: 'match', title: 'New Match! 💜', body: `You matched with ${name}`, data: { matchedUserId: pid } },
          { user_id: pid, type: 'match', title: 'New Match! 💜', body: 'You matched with someone at the venue', data: { matchedUserId: user.id } },
        ]);
        toast.success(`It's a match with ${name}! 💜`);
      } else {
        toast(`❤️ Liked ${name}`);
      }
    } catch { /* duplicate swipe / RLS — ignore */ }
  };

  const visible = useMemo(
    () => venues.filter((v) => v.mode === 'both' || v.mode === mode).filter((v) => filter === 'all' || v.type === filter),
    [venues, mode, filter]
  );
  const ranked = useMemo(() => [...visible].sort((a, b) => b.heat - a.heat), [visible]);
  const selected = venues.find((v) => v.id === selectedId) || ranked[0] || venues[0] || null;
  const locked = selected ? atVenueId !== selected.id && !peeked.has(selected.id) : true;
  const types = mode === 'day' ? DAY_TYPES : NIGHT_TYPES;

  const { data: presence } = useVenuePresence(selected?.id || null);
  const setPresence = useSetVenuePresence();
  const sendWave = useSendWave();
  const meVisible = !!presence?.me_visible;
  const toggleVisible = () => {
    if (selected) setPresence.mutate({ venue: selected.id, visible: !meVisible });
  };

  const handleCheckIn = async () => {
    if (!selected) return;
    setCheckingIn(true);
    try {
      // 1. real device location (rejects if blocked/unsupported)
      let pos: GeolocationPosition | null = null;
      try {
        pos = await getCurrentPosition();
      } catch {
        if (!DEV_SKIP_GEOFENCE) { toast.error('Enable location access to check in.'); return; }
      }

      // 2. GPS verify: must be physically within the venue geofence (skipped in test mode)
      if (!DEV_SKIP_GEOFENCE) {
        if (!pos) { toast.error('Enable location access to check in.'); return; }
        const { latitude, longitude } = pos.coords;
        if (selected.lat != null && selected.lng != null) {
          const dist = calculateDistance(latitude, longitude, selected.lat, selected.lng);
          const radius = Math.max(selected.radius || 100, 120); // small buffer for GPS noise
          if (dist > radius) {
            toast.error(`You're ${formatDistance(dist)} from ${selected.name} — walk closer to check in.`);
            return;
          }
        } else {
          toast.error(`${selected.name} has no location set yet — can't verify check-in.`);
          return;
        }
      }

      // 3. verified → unlock + award XP (once) + register presence (hidden by default — opt-in)
      setAtVenueId(selected.id);
      await setPresence.mutateAsync({ venue: selected.id, visible: meVisible }).catch(() => {});
      if (user && !peeked.has(`xp-${selected.id}`)) {
        await awardXP(user.id, 50, 'Venue check-in');
        await incrementQuestProgress(user.id, 'check_in');
        setPeeked((s) => new Set(s).add(`xp-${selected.id}`));
      }
      toast.success(`Checked in at ${selected.name} · +50 XP 📍`);
    } finally {
      setCheckingIn(false);
    }
  };

  const comingSoon = () => toast.info('Passes & payments coming soon — walk in & check in to unlock free.');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <style>{`
        @keyframes abPulse { 0%{transform:scale(.9);opacity:.6} 70%{transform:scale(2.4);opacity:0} 100%{opacity:0} }
      `}</style>

      {/* Access banner */}
      <div className="px-3.5 pt-3 pb-2.5">
        {atVenueId ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-success/40 bg-gradient-to-r from-success/20 to-success/5">
            <span className="relative w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-success" />
              <span className="absolute -inset-1 rounded-full bg-success/40" style={{ animation: 'abPulse 1.8s ease-out infinite' }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-success">📍 You're at {venues.find((v) => v.id === atVenueId)?.name} · unlocked</div>
              <div className="text-[10px] text-muted-foreground">Verified by GPS · +50 XP earned</div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-success/25 text-success font-extrabold">FREE</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-border bg-white/[0.03]">
            <span className="text-xl">👀</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold">Off-site mode</div>
              <div className="text-[10px] text-muted-foreground">You see heat — peek inside, or check in at any venue → free</div>
            </div>
            <button onClick={() => setPaywallOpen(true)} className="px-3 py-1.5 rounded-full text-white text-[11px] font-bold bg-gradient-to-r from-primary to-secondary whitespace-nowrap">
              Get pass
            </button>
          </div>
        )}
      </div>

      {/* Day / Night toggle */}
      <div className="px-3.5 pb-2.5">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-card border border-border">
          {(['day', 'night'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn('py-2 rounded-xl text-xs font-semibold transition', mode === m ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'text-muted-foreground')}>
              {m === 'day' ? '☀️ Now (day)' : '🌙 Tonight'}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="px-3.5">
        <HeatMapSVG venues={visible} selectedId={selected?.id || null} atVenueId={atVenueId} mode={mode} onSelect={setSelectedId} />
      </div>

      {/* Type chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3.5 py-3">
        {types.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition',
              filter === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Live presence card */}
      {selected && (
        <div className="px-3.5 pb-3">
          <LivePresenceCard venue={selected} locked={locked} atVenue={atVenueId === selected.id}
            presence={presence} meVisible={meVisible} onToggleVisible={toggleVisible} togglingVisible={setPresence.isPending}
            onUnlock={() => setPaywallOpen(true)} onCheckIn={handleCheckIn}
            checkingIn={checkingIn} onWalk={comingSoon} onWave={(pid: string) => sendWave.mutate(pid)}
            onSwipe={swipePerson} swiped={swiped} />
        </div>
      )}

      {/* Ranked list */}
      <div className="px-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground">🔥 HOT NEARBY · WITHIN 25 MIN WALK</span>
        </div>
        <div className="flex flex-col gap-2">
          {ranked.slice(0, 8).map((v) => (
            <VenueRow key={v.id} v={v} selected={v.id === selected?.id} atVenue={atVenueId === v.id}
              peeked={peeked.has(v.id)} onClick={() => setSelectedId(v.id)} />
          ))}
          {ranked.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No venues for {mode === 'day' ? 'daytime' : 'tonight'} yet.</p>
          )}
        </div>
      </div>

      {paywallOpen && selected && (
        <PaywallSheet venue={selected} onClose={() => setPaywallOpen(false)} onBuy={comingSoon} onCheckIn={() => { setPaywallOpen(false); handleCheckIn(); }} />
      )}

      <BottomNav />
    </div>
  );
};

/* ───────── SVG map ───────── */
const HeatMapSVG = ({ venues, selectedId, atVenueId, mode, onSelect }: {
  venues: HeatVenue[]; selectedId: string | null; atVenueId: string | null; mode: 'day' | 'night'; onSelect: (id: string) => void;
}) => {
  const W = 360, H = 260;
  return (
    <div className="relative w-full rounded-[18px] overflow-hidden border border-border" style={{
      aspectRatio: `${W}/${H}`,
      background: mode === 'night'
        ? 'radial-gradient(120% 80% at 50% 30%, #14101d 0%, #0a0810 60%, #050309 100%)'
        : 'radial-gradient(120% 80% at 50% 30%, #1f1c24 0%, #131119 60%, #07060a 100%)',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          {venues.map((v) => (
            <radialGradient key={v.id} id={`heat-${hueFromString(v.id)}`}>
              <stop offset="0%" stopColor={`oklch(0.68 0.22 ${v.hue})`} stopOpacity={mode === 'night' ? 0.85 : 0.7} />
              <stop offset="50%" stopColor={`oklch(0.55 0.2 ${v.hue})`} stopOpacity={0.35} />
              <stop offset="100%" stopColor={`oklch(0.4 0.15 ${v.hue})`} stopOpacity={0} />
            </radialGradient>
          ))}
          <linearGradient id="river-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#0f1f3a" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.5">
          {[40, 80, 120, 160, 200].map((y) => <line key={y} x1="0" y1={y} x2={W} y2={y} />)}
          {[60, 120, 180, 240, 300].map((x) => <line key={x} x1={x} y1="0" x2={x} y2={H} />)}
        </g>
        <line x1="80" y1="240" x2="280" y2="40" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 0 260 Q 60 200, 120 170 Q 160 150, 180 130 Q 200 110, 200 0" stroke="url(#river-grad)" strokeWidth="22" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M 360 60 Q 280 80, 220 100 Q 200 105, 200 130" stroke="url(#river-grad)" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.8" />
        {BELGRADE_HOODS.map((h) => (
          <text key={h.name} x={`${h.x}%`} y={`${h.y}%`} fontSize="7" fontFamily="ui-monospace, monospace" fontWeight="600" fill="rgba(255,255,255,0.32)" textAnchor="middle" letterSpacing="1.2">{h.name}</text>
        ))}
        {venues.map((v) => {
          const r = 18 + (v.heat / 100) * 38;
          return <circle key={v.id} cx={`${v.x}%`} cy={`${v.y}%`} r={r} fill={`url(#heat-${hueFromString(v.id)})`} />;
        })}
      </svg>

      {/* pins */}
      {venues.map((v) => {
        const isSel = v.id === selectedId;
        const isAt = v.id === atVenueId;
        const size = 14 + (v.heat / 100) * 12;
        return (
          <button key={v.id} onClick={() => onSelect(v.id)} className="absolute -translate-x-1/2 -translate-y-1/2 p-0 bg-transparent"
            style={{ left: `${v.x}%`, top: `${v.y}%`, zIndex: isSel ? 9 : 5 }}>
            <div className="rounded-full flex items-center justify-center" style={{
              width: size, height: size, background: `oklch(0.7 0.22 ${v.hue})`, color: '#0a0a0a',
              fontSize: Math.max(8, size * 0.55),
              border: isAt ? '2.5px solid hsl(var(--success))' : isSel ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.7)',
              boxShadow: isAt ? '0 0 0 6px hsl(var(--success) / 0.4)' : isSel ? `0 0 0 5px oklch(0.7 0.22 ${v.hue} / 0.4)` : '0 2px 8px rgba(0,0,0,0.4)',
            }}>{v.emoji}</div>
            {v.heat >= 70 && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold text-white bg-black/70 px-1.5 rounded-full whitespace-nowrap pointer-events-none">🔥 {v.heat}</div>
            )}
            {isAt && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-extrabold text-white px-1.5 rounded-full whitespace-nowrap pointer-events-none" style={{ background: 'hsl(var(--success))' }}>● HERE</div>
            )}
          </button>
        );
      })}

      {/* your location */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: '50%', top: '47%' }}>
        <div className="relative w-5 h-5">
          <div className="absolute -inset-2 rounded-full bg-primary/35" style={{ animation: 'abPulse 2s ease-out infinite' }} />
          <div className="absolute inset-0 rounded-full bg-white border-[3px] border-primary shadow-[0_0_12px_rgba(138,92,246,0.8)]" />
        </div>
      </div>

      {/* controls */}
      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
        <button className="w-8 h-8 rounded-full bg-black/55 backdrop-blur border border-white/10 text-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
        <button className="w-8 h-8 rounded-full bg-black/55 backdrop-blur border border-white/10 text-white flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
      </div>
      <button className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full text-white flex items-center justify-center shadow-[0_4px_12px_rgba(138,92,246,0.5)]" style={{ background: 'rgba(138,92,246,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <MapPin className="w-4 h-4" />
      </button>
      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-[9px] text-white/90 font-semibold flex items-center gap-2">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#8a5cf6]" /> YOU</span>
        <span className="opacity-40">·</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#fb923c' }} /> HEAT</span>
      </div>
    </div>
  );
};

/* ───────── Hybrid browse: rail → featured swipe → grid (Hinge + Happn) ───────── */
const Avatar = ({ p, size = 40 }: any) =>
  p.avatar
    ? <img src={p.avatar} className="rounded-full object-cover" style={{ width: size, height: size }} />
    : <div className="rounded-full flex items-center justify-center font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.34, background: avatarGradient(hueFromString(p.name || p.user_id)) }}>{initials(p.name || '·')}</div>;

const BrowseHybrid = ({ people, onSwipe, onWave, swiped, venue }: any) => {
  const [view, setView] = useState<'swipe' | 'grid'>('swipe');
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const active = people.filter((p: any) => !swiped?.has(p.user_id));
  const featured = active.find((p: any) => p.user_id === featuredId) || active[0] || null;

  if (!people.length) {
    return <div className="text-center text-[12px] text-muted-foreground py-6">Niko vidljiv još — budi prvi 👋</div>;
  }

  return (
    <div>
      {/* rail */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">KO JE TU · {people.length}</span>
        <button onClick={() => setView(view === 'swipe' ? 'grid' : 'swipe')} className="text-[11px] font-bold text-primary inline-flex items-center gap-1">
          {view === 'swipe' ? <>▦ Grid</> : <>❤ Swipe</>}
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 mb-1">
        {people.map((p: any) => {
          const done = swiped?.has(p.user_id);
          return (
            <button key={p.user_id} onClick={() => { setFeaturedId(p.user_id); setView('swipe'); }} className="flex flex-col items-center gap-1 flex-none" style={{ opacity: done ? 0.4 : 1 }}>
              <div className={cn('rounded-full p-0.5', featured?.user_id === p.user_id ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-white/10')}>
                <Avatar p={p} size={46} />
              </div>
              <span className="text-[9px] text-muted-foreground max-w-[48px] truncate">{p.name}</span>
            </button>
          );
        })}
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {people.map((p: any) => (
            <button key={p.user_id} onClick={() => { setFeaturedId(p.user_id); setView('swipe'); }} className="relative aspect-square rounded-xl overflow-hidden" style={{ opacity: swiped?.has(p.user_id) ? 0.45 : 1 }}>
              {p.avatar ? <img src={p.avatar} className="absolute inset-0 w-full h-full object-cover" /> :
                <div className="absolute inset-0" style={{ background: avatarGradient(hueFromString(p.name || p.user_id)) }} />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                <span className="text-[10px] font-bold">{p.name}{p.age ? `, ${p.age}` : ''}</span>
              </div>
              {swiped?.has(p.user_id) && <span className="absolute top-1 right-1 text-success text-xs">✓</span>}
            </button>
          ))}
        </div>
      ) : featured ? (
        <div>
          <div className="relative rounded-2xl overflow-hidden h-56" style={{ background: `radial-gradient(120% 80% at 30% 20%, oklch(0.55 0.22 ${hueFromString(featured.name || featured.user_id)}), oklch(0.32 0.18 ${(hueFromString(featured.name || featured.user_id) + 30) % 360}) 50%, #0a0612)` }}>
            {featured.avatar && <img src={featured.avatar} className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.85), transparent 55%)' }} />
            <div className="absolute left-3.5 bottom-3.5">
              <div className="text-[20px] font-extrabold">{featured.name}{featured.age ? <span className="font-semibold">, {featured.age}</span> : ''}</div>
              <div className="text-[11px] text-white/85">📍 ovde · {venue.name}</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <button onClick={() => onSwipe(featured.user_id, featured.name, 'pass')} className="w-12 h-12 rounded-full bg-card border border-border-strong flex items-center justify-center text-lg text-[#f87171]">✕</button>
            <button onClick={() => onSwipe(featured.user_id, featured.name, 'like')} className="w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white" style={{ background: 'linear-gradient(135deg, hsl(var(--success)), #34d399)' }}>❤️</button>
            <button onClick={() => onWave(featured.user_id, featured.name)} className="w-12 h-12 rounded-full bg-card border border-border-strong flex items-center justify-center text-lg">👋</button>
          </div>
        </div>
      ) : (
        <div className="text-center text-[12px] text-muted-foreground py-6">To je sve za sad — prošao/la si sve koji su tu ✨</div>
      )}
    </div>
  );
};

/* ───────── Live presence card ───────── */
const LivePresenceCard = ({ venue, locked, atVenue, presence, meVisible, onToggleVisible, togglingVisible, onUnlock, onCheckIn, checkingIn, onWalk, onWave, onSwipe, swiped }: any) => {
  const isHot = venue.heat >= 80;
  const people = presence?.people || [];
  const headcount = presence?.headcount ?? venue.here ?? 0;
  return (
    <div className="relative rounded-[20px] overflow-hidden border" style={{
      background: `linear-gradient(135deg, oklch(0.32 0.16 ${venue.hue} / 0.6) 0%, hsl(var(--card)) 50%)`,
      borderColor: `oklch(0.55 0.18 ${venue.hue} / 0.4)`,
    }}>
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-[52px] h-[52px] rounded-[14px] flex-shrink-0 flex items-center justify-center text-[26px]"
            style={{ background: `linear-gradient(135deg, oklch(0.55 0.22 ${venue.hue}), oklch(0.35 0.18 ${(venue.hue + 30) % 360}))` }}>{venue.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="font-extrabold text-base">{venue.name}</span>
              {isHot && <span className="px-1.5 rounded-full text-white text-[9px] font-extrabold" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316)' }}>HOT</span>}
              {atVenue && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-success/25 text-success">📍 YOU'RE HERE</span>}
            </div>
            <div className="text-[11px] text-muted-foreground mb-1.5">{venue.neighborhood} · {venue.walk} min walk · {venue.vibe}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded bg-white/[0.08] overflow-hidden">
                <div className="h-full rounded" style={{ width: `${venue.heat}%`, background: `linear-gradient(90deg, oklch(0.55 0.22 ${venue.hue}), hsl(var(--heat)))` }} />
              </div>
              <span className="text-[10px] font-bold text-heat">🔥 {venue.heat}</span>
            </div>
          </div>
        </div>

        {/* public stats — headcount always shown */}
        <div className="flex gap-3 py-2.5 mt-3 border-y border-border">
          <Stat n={headcount} l="here now" emoji="👥" />
          <div className="w-px self-stretch bg-border" />
          <Stat n={meVisible ? people.length : '—'} l="visible" emoji="💜" />
          <div className="w-px self-stretch bg-border" />
          <Stat n={`${venue.walk}m`} l="walk" emoji="🚶" />
          <div className="w-px self-stretch bg-border" />
          <Stat n="4.6" l="rating" emoji="⭐" />
        </div>

        {/* gated section */}
        <div className="relative mt-3">
          <div className={cn('transition', locked && 'blur-[7px] pointer-events-none select-none')}>
            {/* opt-in visibility toggle */}
            {atVenue && (
              <button onClick={onToggleVisible} disabled={togglingVisible}
                className={cn('flex w-full items-center justify-between rounded-xl border px-3 py-2 mb-3', meVisible ? 'border-success/40 bg-success/10' : 'border-border bg-white/[0.04]')}>
                <div className="text-left">
                  <div className="text-[12px] font-semibold">Prikaži me ovde</div>
                  <div className="text-[10px] text-muted-foreground">{meVisible ? 'Vidljiv si — i listaš ko je tu' : 'Skriven — vidiš samo broj'}</div>
                </div>
                <span className={cn('relative w-10 h-6 rounded-full transition', meVisible ? 'bg-success' : 'bg-white/15')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', meVisible ? 'left-[18px]' : 'left-0.5')} />
                </span>
              </button>
            )}

            {meVisible ? (
              <BrowseHybrid people={people} onSwipe={onSwipe} onWave={onWave} swiped={swiped} venue={venue} />
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🫥</div>
                <div className="text-[13px] font-semibold mb-1">{headcount} {headcount === 1 ? 'osoba je' : 'ljudi je'} ovde</div>
                <div className="text-[11px] text-muted-foreground mb-3 max-w-[240px] mx-auto">Uključi „Prikaži me ovde" da vidiš ko je tu — i da oni vide tebe. Fer razmena 🤝</div>
                {atVenue
                  ? <button onClick={onToggleVisible} className="px-4 py-2.5 rounded-full text-white font-bold text-[13px]" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>Prikaži me i listaj</button>
                  : <div className="text-[11px] text-muted-foreground">Čekiraj se (GPS) da postaneš vidljiv ovde.</div>}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={onWalk} className="flex-[2] py-3 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-1.5" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>🚶 Walk here · {venue.walk} min</button>
              <button onClick={onCheckIn} disabled={checkingIn} className="flex-1 py-3 rounded-xl border border-border-strong font-semibold text-[13px]">{checkingIn ? '…' : '📍 Check in'}</button>
            </div>
          </div>

          {locked && (
            <div className="absolute -inset-2.5 z-[5] rounded-2xl flex flex-col items-center justify-center text-center p-4"
              style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.4), rgba(10,10,10,0.88) 60%)' }}>
              <div className="w-11 h-11 rounded-full mb-2.5 flex items-center justify-center text-xl border border-accent/40 bg-gradient-to-br from-accent/20 to-secondary/15"><Lock className="w-5 h-5" /></div>
              <div className="font-bold text-sm mb-1">Peek to see who's here</div>
              <div className="text-[11px] text-muted-foreground mb-3 max-w-[240px]">Or walk to {venue.name} and check in — it's free when you're there.</div>
              <div className="flex gap-2">
                <button onClick={onUnlock} className="px-4 py-2.5 rounded-full text-white font-extrabold text-[13px] inline-flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>🔓 Unlock · 100 RSD</button>
                <button onClick={onCheckIn} disabled={checkingIn} className="px-3.5 py-2.5 rounded-full border border-border-strong bg-white/[0.06] font-semibold text-xs">
                  {checkingIn ? '…' : '📍 Check in free'}
                </button>
              </div>
              <div className="text-[10px] text-text-faint mt-2.5">100 RSD ≈ €0.85 · 24h access · 1 venue</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ n, l, emoji, highlight, blur }: any) => (
  <div className={cn('flex-1 text-center', blur && 'blur-[4px]')}>
    <div className={cn('text-base font-extrabold inline-flex items-baseline gap-1', highlight && 'text-[#c4b5fd]')}>
      <span className="text-[11px]">{emoji}</span>{n}
    </div>
    <div className="text-[9px] text-muted-foreground mt-0.5 tracking-wide">{l}</div>
  </div>
);

/* ───────── Ranked venue row ───────── */
const VenueRow = ({ v, selected, atVenue, peeked, onClick }: any) => {
  const isUnlocked = atVenue || peeked;
  const tier = v.heat >= 85 ? 'INFERNO' : v.heat >= 70 ? 'HOT' : 'WARM';
  return (
    <button onClick={onClick} className={cn('flex items-center gap-3 p-2.5 rounded-2xl border text-left transition', selected ? 'border-primary/50' : 'border-border')}
      style={selected ? { background: `linear-gradient(135deg, oklch(0.3 0.15 ${v.hue} / 0.35), hsl(var(--card)))` } : { background: 'hsl(var(--card))' }}>
      <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `linear-gradient(135deg, oklch(0.5 0.2 ${v.hue}), oklch(0.32 0.16 ${(v.hue + 30) % 360}))` }}>
        {v.emoji}
        {atVenue && <span className="absolute -top-1 -right-1 text-[8px]">📍</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate flex items-center gap-1.5">
          {v.name}
          {atVenue && <span className="text-[8px] px-1 rounded-full bg-success/25 text-success font-extrabold">HERE · FREE</span>}
        </div>
        <div className="text-[10px] text-muted-foreground">{v.neighborhood} · 🚶 {v.walk}m · 👥 {v.here} here</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[13px] font-extrabold text-heat">🔥 {v.heat}</div>
        <div className="text-[8px] text-muted-foreground">{tier}</div>
      </div>
    </button>
  );
};

/* ───────── Paywall sheet ───────── */
const PaywallSheet = ({ venue, onClose, onBuy, onCheckIn }: any) => (
  <div className="fixed inset-0 z-[100] flex flex-col justify-end">
    <div onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
    <div className="relative z-10 bg-background rounded-t-[26px] px-4 pt-3.5 pb-7 max-h-[92%] overflow-y-auto no-scrollbar">
      <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `linear-gradient(135deg, oklch(0.55 0.22 ${venue.hue}), oklch(0.35 0.18 ${(venue.hue + 30) % 360}))` }}>{venue.emoji}</div>
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground font-semibold tracking-wide">UNLOCK PEEK</div>
          <div className="text-lg font-extrabold">{venue.name}</div>
        </div>
      </div>

      {/* free callout */}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-success/40 bg-success/10 mb-4">
        <span className="text-2xl">🚶</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-success">Walk here — it's free</div>
          <div className="text-[11px] text-muted-foreground">Check in at {venue.name} ({venue.walk} min) → everything unlocks + 50 XP</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {PRICING.map((p) => (
          <button key={p.id} onClick={onBuy} className="relative text-left p-3 rounded-2xl border"
            style={{ borderColor: p.best ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
            {p.best && <span className="absolute -top-2 right-2.5 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>BEST VALUE</span>}
            <div className="text-2xl mb-1.5">{p.emoji}</div>
            <div className="text-[13px] font-bold">{p.label}</div>
            <div className="text-[10px] text-muted-foreground mb-1.5">{p.sub}</div>
            <div className={cn('text-lg font-extrabold', p.best ? 'text-accent' : 'text-foreground')}>{p.rsd} <span className="text-[10px] font-semibold text-muted-foreground">RSD</span></div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3.5 mb-4">
        <div className="text-[11px] font-bold tracking-wide text-muted-foreground mb-2">WHAT YOU UNLOCK</div>
        {['👥 See who is at the venue right now', '💜 Spot friends + matches inside', '👋 Wave & DM before you walk over', '🃏 Swipe ravers inside the venue', '🚪 Skip-the-line at partner clubs'].map((t) => (
          <div key={t} className="flex items-center gap-2 text-[12px] py-1"><span className="text-success">✓</span>{t}</div>
        ))}
      </div>

      <button onClick={onCheckIn} className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
        📍 I'm here — check in free
      </button>
      <div className="text-center text-[10px] text-text-faint mt-2.5">Cancel anytime · Apple Pay / Google Pay / Visa · XP earned in-venue stays after a pass expires.</div>
    </div>
  </div>
);

export default HeatMap;
