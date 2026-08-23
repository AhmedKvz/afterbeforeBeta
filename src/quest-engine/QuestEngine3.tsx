import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  Fingerprint,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuests } from '@/hooks/useQuests';
import { useVenuePresence } from '@/hooks/useHeatVenues';
import type { MyNight } from '@/hooks/useMyNight';
import { track } from '@/lib/analytics';
import { toast } from 'sonner';
import {
  QUEST_PHASES,
  createNightQuestRun,
  nightQuestReducer,
  phaseIndex,
  restoreNightQuestRun,
  type NightQuestPhase,
} from './nightQuestEngine';
import './QuestEngine3.css';

const PHASE_META: Record<NightQuestPhase, { label: string; title: string; principle: string }> = {
  pre: { label: 'PRE', title: 'Namera', principle: 'Commitment > browsing' },
  live: { label: 'LIVE', title: 'Prisustvo', principle: 'Presence > scrolling' },
  after: { label: 'AFTER', title: 'Sećanje', principle: 'Memory > posting' },
  impact: { label: 'IMPACT', title: 'Smisao', principle: 'Meaning > points' },
  return: { label: 'RETURN', title: 'Povratak', principle: 'Return > retention tricks' },
};

const DEFAULT_CHRONICLE = 'Došli smo zbog iste namere, ali je noć proradila tek kada smo se pojavili u istom satu.';

export interface QuestEngine3Props {
  night: MyNight | null | undefined;
  onRequestCheckIn: () => void;
}

const Signal = ({ children }: { children: React.ReactNode }) => (
  <div className="qe3-signal"><span><Check size={13} /></span><p>{children}</p></div>
);

export const QuestEngine3 = ({ night, onRequestCheckIn }: QuestEngine3Props) => {
  const { user } = useAuth();
  const { quests, isLoading, claimReward } = useQuests();
  const storageKey = `ab-night-quest-v3:${user?.id || 'guest'}`;
  const [run, dispatch] = useReducer(nightQuestReducer, undefined, () => {
    if (typeof window === 'undefined') return createNightQuestRun();
    return restoreNightQuestRun(window.localStorage.getItem(storageKey));
  });
  const [chronicleDraft, setChronicleDraft] = useState(run.chronicle || DEFAULT_CHRONICLE);

  const linkedQuest = useMemo(() => {
    const open = quests.filter((quest) => !quest.xp_claimed);
    return [...open].sort((a, b) => (b.xp_reward || 0) - (a.xp_reward || 0))[0] || null;
  }, [quests]);

  const venueName = night?.venueName || run.venueName || 'Kult';
  const presenceName = night?.venueName || run.venueName || null;
  const { data: presence } = useVenuePresence(presenceName);
  const here = Math.max(run.headcount, presence?.headcount ?? 0);
  const currentIndex = phaseIndex(run.phase);
  const linkedProgress = linkedQuest
    ? Math.min(100, Math.round(((linkedQuest.progress || 0) / Math.max(linkedQuest.target_count || 1, 1)) * 100))
    : 0;
  const minutesHere = night
    ? Math.max(1, Math.round((Date.now() - new Date(night.since).getTime()) / 60_000))
    : Math.max(run.presenceMinutes, 45);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(run));
  }, [run, storageKey]);

  useEffect(() => {
    if (!night || !run.accepted || run.phase !== 'pre') return;
    dispatch({
      type: 'verify-presence',
      venueId: night.venueId,
      venueName: night.venueName,
      headcount: presence?.headcount ?? 0,
    });
    track('night_quest_presence_verified', { venue_id: night.venueId, side_quest: run.sideQuestAccepted });
  }, [night, presence?.headcount, run.accepted, run.phase, run.sideQuestAccepted]);

  const acceptQuest = () => {
    dispatch({ type: 'accept' });
    track('night_quest_accepted', { quest: 'convergence_hour', side_quest: run.sideQuestAccepted });
    if (!night) toast('Misija prihvaćena', { description: 'Check-in na lokaciji automatski pali LIVE fazu.' });
  };

  const finishNight = () => {
    dispatch({ type: 'finish-night', presenceMinutes: minutesHere, headcount: here });
    track('night_quest_finished', { venue: venueName, presence_minutes: minutesHere, headcount: here });
  };

  const saveChronicle = () => {
    if (!chronicleDraft.trim()) {
      toast('Dodaj jednu rečenicu koju želiš da zapamtiš.');
      return;
    }
    dispatch({ type: 'save-chronicle', chronicle: chronicleDraft });
    track('night_quest_chronicle_saved', { length: chronicleDraft.trim().length });
  };

  const unlockReward = () => {
    dispatch({ type: 'unlock-reward' });
    track('night_quest_impact_viewed', { venue: venueName, side_quest: run.sideQuestAccepted });
  };

  const reset = () => {
    dispatch({ type: 'reset' });
    setChronicleDraft(DEFAULT_CHRONICLE);
  };

  const primaryAction = () => {
    if (run.phase === 'pre') {
      if (!run.accepted) acceptQuest();
      else onRequestCheckIn();
      return;
    }
    if (run.phase === 'live') { finishNight(); return; }
    if (run.phase === 'after') { saveChronicle(); return; }
    if (run.phase === 'impact') { unlockReward(); return; }
    reset();
  };

  const primaryLabel = (() => {
    if (run.phase === 'pre') return run.accepted ? 'Check-in kada stigneš' : 'Prihvati hero quest';
    if (run.phase === 'live') return 'Završi noć';
    if (run.phase === 'after') return 'Sačuvaj hroniku';
    if (run.phase === 'impact') return 'Otključaj nagradu';
    return 'Nova noć';
  })();

  const phaseBody = (() => {
    if (run.phase === 'pre') {
      return (
        <>
          <QuestHeading eyebrow="PRE · ČETVRTAK 21:10" title="Sat konvergencije" status={run.accepted ? 'ČEKA CHECK-IN' : 'HERO QUEST'}>
            {venueName} · dolazak 23:30–00:30 · ostani najmanje 45 min
          </QuestHeading>
          <p className="qe3-lead">Ne biraš još jedan event. Biraš ulogu: pojavi se u istom satu kao ostatak scene i pretvori rasutu nameru u stvarnu energiju.</p>
          <div className="qe3-progress">
            <div><span>Kolektivni prag</span><strong>{here || 14}/20</strong></div>
            <i><span style={{ width: `${Math.min(100, ((here || 14) / 20) * 100)}%` }} /></i>
          </div>
          <dl className="qe3-facts">
            <div><dt>Vreme</dt><dd>23:30–00:30</dd></div>
            <div><dt>Dokaz</dt><dd>Check-in + završetak</dd></div>
            <div><dt>Telefon</dt><dd>Ostaje u džepu</dd></div>
          </dl>
          <button className={`qe3-side ${run.sideQuestAccepted ? 'is-on' : ''}`} type="button" aria-pressed={run.sideQuestAccepted} onClick={() => dispatch({ type: 'toggle-side' })}>
            <span>{run.sideQuestAccepted ? <Check size={16} /> : <UserPlus size={16} />}</span>
            <span><strong>Side quest</strong><small>Dovedi nekog prvi put</small></span>
            <em>{run.sideQuestAccepted ? 'UKLJUČEN' : 'OPCIONALNO'}</em>
          </button>
        </>
      );
    }

    if (run.phase === 'live') {
      return (
        <>
          <QuestHeading eyebrow="LIVE · PROOF OF PRESENCE" title="Telefon u džep. Ti u sceni." status="VERIFIKOVANO">
            {venueName} · od {night?.sinceLabel || '23:44'}
          </QuestHeading>
          <div className="qe3-live-count"><strong>{here}</strong><span>{here === 1 ? 'osoba je sada ovde' : 'ljudi je sada ovde'}</span></div>
          <div className="qe3-signals">
            <Signal>Dolazak u vremenskom prozoru potvrđen</Signal>
            <Signal>{minutesHere} min proteklo od potvrđenog check-ina</Signal>
            <Signal>{run.sideQuestAccepted ? 'Side quest prihvaćen; potvrda gosta ostaje sledeći signal' : 'Hero quest aktivan bez dodatnih zadataka'}</Signal>
          </div>
          <div className="qe3-pocket"><Fingerprint size={22} /><p><strong>Nema feeda. Nema live zadataka.</strong><br />„Telefon u džepu” je tvoj pledge; engine ne glumi da vidi screen-time.</p></div>
        </>
      );
    }

    if (run.phase === 'after') {
      return (
        <>
          <QuestHeading eyebrow="AFTER · JUTARNJI SIGNAL" title="Jutarnja hronika" status="PRIVATNO">
            Noć postaje trag tek kada se završi.
          </QuestHeading>
          <dl className="qe3-timeline">
            <dt>{night?.sinceLabel || '23:44'}</dt><dd>Dolazak u {venueName}</dd>
            <dt>+{Math.min(minutesHere, 24)}m</dt><dd>Check-in signal potvrđen</dd>
            <dt>+{run.presenceMinutes || minutesHere}m</dt><dd>Noć završena; phone-free pledge zaključen</dd>
          </dl>
          <label className="qe3-chronicle">
            <span>Jedna rečenica koju želiš da zadržiš</span>
            <textarea value={chronicleDraft} onChange={(event) => setChronicleDraft(event.target.value)} rows={4} maxLength={280} />
            <small>{chronicleDraft.length}/280 · samo ti vidiš dok ne odlučiš da podeliš</small>
          </label>
        </>
      );
    }

    if (run.phase === 'impact') {
      return (
        <>
          <QuestHeading eyebrow="IMPACT RECEIPT" title="Nisi samo završio quest. Pomakao si scenu." status="DOKAZANO">
            Doprinos je vidljiv, ali identitet ostaje pod tvojom kontrolom.
          </QuestHeading>
          <dl className="qe3-impact">
            <div><dt>Ljudi u zoni</dt><dd>{Math.max(here, 1)}</dd></div>
            <div><dt>Od check-ina</dt><dd>{run.presenceMinutes}m</dd></div>
            <div><dt>Novi ljudi</dt><dd>{run.sideQuestAccepted ? 1 : 0}</dd></div>
          </dl>
          <div className="qe3-contribution"><ShieldCheck size={22} /><div><span>TVOJ DOPRINOS</span><strong>{run.presenceMinutes} min od potvrđenog check-ina{run.sideQuestAccepted ? ' · side quest pledge' : ''}</strong></div></div>
          <blockquote>„{run.chronicle}”</blockquote>
        </>
      );
    }

    return (
      <>
        <QuestHeading eyebrow="RETURN · NAGRADA OTKLJUČANA" title="Nagrada je stvarna jer je i doprinos bio stvaran." status="SCENE BUILDER">
          Povratak nastaje iz identiteta i kontinuiteta, ne iz grindovanja.
        </QuestHeading>
        <div className="qe3-ticket">
          <div><span>NAGRADA OVE NOĆI</span><h3>Welcome drink + priority ulaz</h3><p>Važi do 23:45 na sledećem Night Director dropu.</p></div>
          <div><span>STATUS</span><strong>SCENE<br />BUILDER</strong></div>
        </div>
        {linkedQuest?.is_completed && !linkedQuest?.xp_claimed && (
          <button className="qe3-claim" type="button" onClick={() => claimReward({ questId: linkedQuest.id, xpReward: linkedQuest.xp_reward })}>
            <Sparkles size={16} /> Preuzmi i +{linkedQuest.xp_reward} XP iz povezanog questa
          </button>
        )}
        <p className="qe3-return-note">Sledeći drop · četvrtak u 21:00 · nagrada je ograničena mestom i vremenom.</p>
      </>
    );
  })();

  return (
    <div className={`qe3 qe3-${run.phase}`}>
      <nav className="qe3-phases" aria-label="Faze Night Director questa">
        {QUEST_PHASES.map((phase, index) => {
          const done = index < currentIndex;
          const active = phase === run.phase;
          return (
            <div key={phase} className={active ? 'is-active' : done ? 'is-done' : ''} aria-current={active ? 'step' : undefined}>
              <span>{done ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span>
              <strong>{PHASE_META[phase].label}</strong>
              <small>{PHASE_META[phase].title}</small>
            </div>
          );
        })}
      </nav>

      <div className="qe3-grid">
        <section className="qe3-main" aria-live="polite">
          {phaseBody}
          <div className="qe3-actions">
            {currentIndex > 0 && <button className="qe3-reset" type="button" onClick={reset}><RotateCcw size={14} /> Resetuj demo</button>}
            <button className="qe3-primary" type="button" onClick={primaryAction}>
              {primaryLabel}{run.phase === 'return' ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </section>

        <aside className="qe3-rail">
          <div className="qe3-rail-head"><span>NIGHT DIRECTOR</span><strong>0{currentIndex + 1}</strong></div>
          <h2>{PHASE_META[run.phase].title}</h2>
          <p>{PHASE_META[run.phase].principle}</p>
          <div className="qe3-rule" />
          <div className="qe3-live-truth">
            <span><MapPin size={14} /> {venueName}</span>
            <strong>{night ? 'CHECK-IN AKTIVAN' : run.accepted ? 'ČEKA DOLAZAK' : 'PRE NOĆI'}</strong>
          </div>
          <ul className="qe3-dna">
            <li><Clock3 size={15} /><span><strong>Jedan hero quest</strong><small>Fokus, ne katalog</small></span></li>
            <li><UserPlus size={15} /><span><strong>Jedan side quest</strong><small>Uvek opcionalan</small></span></li>
            <li><LockKeyhole size={15} /><span><strong>Privatno po defaultu</strong><small>Korisnik bira deljenje</small></span></li>
            <li><Users size={15} /><span><strong>Kolektivni ishod</strong><small>Značenje iznad poena</small></span></li>
          </ul>
          <div className="qe3-linked">
            <span>POVEZANI NEDELJNI QUEST</span>
            {isLoading ? <p>Učitavamo…</p> : linkedQuest ? (
              <><strong>{linkedQuest.title}</strong><div><i><span style={{ width: `${linkedProgress}%` }} /></i><em>{linkedQuest.progress}/{linkedQuest.target_count}</em></div></>
            ) : <p>Novi drop se priprema.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
};

const QuestHeading = ({ eyebrow, title, status, children }: { eyebrow: string; title: string; status: string; children: React.ReactNode }) => (
  <header className="qe3-heading">
    <div><span>{eyebrow}</span><h1>{title}</h1><p>{children}</p></div>
    <em>{status}</em>
  </header>
);

export default QuestEngine3;
