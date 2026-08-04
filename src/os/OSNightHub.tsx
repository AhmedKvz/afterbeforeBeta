import { useState } from 'react';
import { toast } from 'sonner';
import { useQuests } from '@/hooks/useQuests';
import { useVenuePresence, useSetVenuePresence } from '@/hooks/useHeatVenues';
import { MyNight } from '@/hooks/useMyNight';
import { OSMatches } from './screens/OSMatches';
import { OSDareWheel } from './OSDareWheel';
import { OSDanceMode } from './OSDanceMode';
import { OSCrew } from './OSCrew';
import { ConvergenceClaim, CityCipherCard, IrlStreaks } from './OSGamification';
import { useExit } from './useExit';
import { AB, G, hexA, MONO } from './osTheme';

const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;
const MTAG = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em' } as const;

/**
 * HUB VEČERI (IA v2 §11.2) — otvara ga orb kad si čekiran. Ne uvodi nove
 * mehanike: komponuje postojeće (poruke, quest, točak/ŠIFRA, dance, ekipa,
 * VISIBLE) u jedan ekran tvoje noći. Sve je već otključano check-inom.
 */
export const OSNightHub = ({ night, onClose }: { night: MyNight; onClose: () => void }) => {
  const { closing, close } = useExit(onClose);
  const { quests = [] } = useQuests() as any;
  const { data: presence } = useVenuePresence(night.venueName);
  const setPresence = useSetVenuePresence();
  const [dare, setDare] = useState(false);
  const [dance, setDance] = useState(false);
  const [crew, setCrew] = useState(false);

  const active = quests.find((q: any) => !q.xp_claimed) || null;
  const meVisible = !!presence?.me_visible;
  const here = presence?.headcount ?? 0;

  const toggleVisible = () => setPresence.mutate({ venue: night.venueName, visible: !meVisible }, {
    onError: (e: any) => toast.error(String(e?.message || '').includes('CHECKIN_REQUIRED') ? 'Check-in je istekao — čekiraj se ponovo.' : 'Nije prošlo.'),
  });

  const tile = (emoji: string, title: string, sub: string, col: string, onClick: () => void) => (
    <button onClick={onClick} className="os-press" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: 14, borderRadius: 16, cursor: 'pointer', background: hexA(col, 0.09), border: `1px solid ${hexA(col, 0.4)}` }}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 15.5, letterSpacing: '-.01em', color: AB.ink }}>{title}</span>
        <span style={{ display: 'block', ...MTAG, fontSize: 10, letterSpacing: '.1em', color: AB.ink3, marginTop: 2 }}>{sub}</span>
      </span>
      <span style={{ color: col, fontSize: 18 }}>›</span>
    </button>
  );

  return (
    <div className="os-scroll" style={{ position: 'fixed', inset: 0, zIndex: 95, background: AB.void, overflowY: 'auto', paddingBottom: 40, animation: closing ? 'os-overlay-out .15s ease forwards' : 'os-overlay-in .2s cubic-bezier(.16,1,.3,1)' }}>
      {/* header — tvoja noć */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'oklch(0.135 0.012 285 / 0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${AB.line}`, padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...LABEL, color: AB.acid }}>TVOJA NOĆ · OD {night.sinceLabel}</div>
          <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: AB.ink, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{night.venueName}</div>
        </div>
        <button onClick={close} className="os-press" aria-label="Zatvori" style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', border: `1px solid ${AB.line2}`, cursor: 'pointer', background: 'transparent', color: AB.ink2, fontSize: 15 }}>✕</button>
      </div>

      {/* VISIBLE — identitet je opt-in, broj je uvek istina */}
      <div style={{ margin: '16px 18px 0', padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink }}>{here} {here === 1 ? 'osoba' : 'ljudi'} ovde</div>
          <div style={{ ...MTAG, fontSize: 10, color: AB.ink3, marginTop: 3 }}>{meVisible ? 'VIDE TE · ISTIČE SAM' : 'GHOST · BROJE TE, NE VIDE'}</div>
        </div>
        <button onClick={toggleVisible} disabled={setPresence.isPending} aria-label="Vidljivost" style={{ flex: 'none', cursor: 'pointer', width: 46, height: 27, borderRadius: 999, border: `1px solid ${AB.line2}`, background: meVisible ? 'var(--ab-acid-soft)' : 'rgba(255,255,255,.06)', position: 'relative', padding: 0 }}>
          <span style={{ position: 'absolute', top: 2, left: meVisible ? 21 : 2, width: 21, height: 21, borderRadius: '50%', background: meVisible ? AB.acid : AB.ink2, transition: 'left .2s' }} />
        </button>
      </div>

      {/* aktivni quest — jedna traka */}
      {active && (
        <div style={{ margin: '12px 18px 0', padding: 14, borderRadius: 16, background: AB.surface, border: `1px solid ${AB.uvDim}` }}>
          <div style={{ ...LABEL, color: AB.uv }}>AKTIVAN QUEST</div>
          <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-.01em', color: AB.ink, marginTop: 5 }}>{active.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'oklch(1 0 0 / 0.07)', overflow: 'hidden' }}>
              <div className={active.is_completed ? 'ab-acid-fill' : undefined} style={{ height: '100%', width: `${Math.min(100, Math.round((active.progress / Math.max(active.target_count, 1)) * 100))}%`, borderRadius: 999, background: active.is_completed ? undefined : AB.acidDim }} />
            </div>
            <span style={{ ...MTAG, fontSize: 10, color: AB.ink3 }}>{active.progress}/{active.target_count}</span>
          </div>
        </div>
      )}

      {/* gamifikacija v2 — dođi i uzmi · sastavi šifru · tvoji ljudi */}
      <ConvergenceClaim venueId={night.venueId} />
      <CityCipherCard solvable />
      <IrlStreaks compact />

      {/* igre i ekipa — sve otključano check-inom */}
      <div style={{ padding: '12px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tile('🎲', 'Zavrti noć', 'TOČAK · ŠIFRA · EKIPE', G.afterparty, () => setDare(true))}
        {tile('🧑‍🤝‍🧑', 'Nađi ekipu', 'NIKAD NE IZLAZIŠ SAM', G.community, () => setCrew(true))}
        {tile('🕺', 'Dance Floor', 'PLEŠI · SKORUJ · LEADERBOARD', G.underground, () => setDance(true))}
      </div>

      {/* poruke — bez zasebnog taba (IA v2 §11.2) */}
      <OSMatches embedded />

      <div style={{ ...LABEL, textAlign: 'center', padding: '30px 18px 0' }}>NOĆ TRAJE DOK SI TU</div>

      {dare && <OSDareWheel onClose={() => setDare(false)} />}
      {dance && <OSDanceMode venueId={night.venueId} venueName={night.venueName} onClose={() => setDance(false)} />}
      {crew && <OSCrew eventId={null} venueId={night.venueId} title={night.venueName} onClose={() => setCrew(false)} />}
    </div>
  );
};
