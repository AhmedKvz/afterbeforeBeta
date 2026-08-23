export const QUEST_PHASES = ['pre', 'live', 'after', 'impact', 'return'] as const;

export type NightQuestPhase = typeof QUEST_PHASES[number];

export interface NightQuestRun {
  version: 3;
  phase: NightQuestPhase;
  accepted: boolean;
  sideQuestAccepted: boolean;
  acceptedAt: string | null;
  presenceVerifiedAt: string | null;
  endedAt: string | null;
  chronicleSavedAt: string | null;
  rewardUnlockedAt: string | null;
  venueId: string | null;
  venueName: string | null;
  presenceMinutes: number;
  headcount: number;
  chronicle: string;
}

export type NightQuestAction =
  | { type: 'toggle-side' }
  | { type: 'accept'; at?: string }
  | { type: 'verify-presence'; at?: string; venueId: string; venueName: string; headcount: number }
  | { type: 'finish-night'; at?: string; presenceMinutes: number; headcount: number }
  | { type: 'save-chronicle'; at?: string; chronicle: string }
  | { type: 'unlock-reward'; at?: string }
  | { type: 'reset' };

const nowIso = () => new Date().toISOString();

export const createNightQuestRun = (): NightQuestRun => ({
  version: 3,
  phase: 'pre',
  accepted: false,
  sideQuestAccepted: false,
  acceptedAt: null,
  presenceVerifiedAt: null,
  endedAt: null,
  chronicleSavedAt: null,
  rewardUnlockedAt: null,
  venueId: null,
  venueName: null,
  presenceMinutes: 0,
  headcount: 0,
  chronicle: '',
});

export const phaseIndex = (phase: NightQuestPhase) => QUEST_PHASES.indexOf(phase);

export const restoreNightQuestRun = (value: string | null): NightQuestRun => {
  if (!value) return createNightQuestRun();
  try {
    const parsed = JSON.parse(value) as Partial<NightQuestRun>;
    if (parsed.version !== 3 || !parsed.phase || !QUEST_PHASES.includes(parsed.phase)) return createNightQuestRun();
    return { ...createNightQuestRun(), ...parsed };
  } catch {
    return createNightQuestRun();
  }
};

/**
 * Pure Quest Engine 3.0 state machine. Every transition is explicit so UI,
 * analytics and the future server-backed run table share the same lifecycle.
 */
export const nightQuestReducer = (run: NightQuestRun, action: NightQuestAction): NightQuestRun => {
  switch (action.type) {
    case 'toggle-side':
      if (run.phase !== 'pre') return run;
      return { ...run, sideQuestAccepted: !run.sideQuestAccepted };

    case 'accept':
      if (run.phase !== 'pre') return run;
      return { ...run, accepted: true, acceptedAt: run.acceptedAt || action.at || nowIso() };

    case 'verify-presence':
      if (run.phase !== 'pre' || !run.accepted) return run;
      return {
        ...run,
        phase: 'live',
        presenceVerifiedAt: action.at || nowIso(),
        venueId: action.venueId,
        venueName: action.venueName,
        headcount: Math.max(0, action.headcount),
      };

    case 'finish-night':
      if (run.phase !== 'live') return run;
      return {
        ...run,
        phase: 'after',
        endedAt: action.at || nowIso(),
        presenceMinutes: Math.max(1, Math.round(action.presenceMinutes)),
        headcount: Math.max(run.headcount, action.headcount),
      };

    case 'save-chronicle': {
      if (run.phase !== 'after') return run;
      const chronicle = action.chronicle.trim();
      if (!chronicle) return run;
      return { ...run, phase: 'impact', chronicle, chronicleSavedAt: action.at || nowIso() };
    }

    case 'unlock-reward':
      if (run.phase !== 'impact') return run;
      return { ...run, phase: 'return', rewardUnlockedAt: action.at || nowIso() };

    case 'reset':
      return createNightQuestRun();

    default:
      return run;
  }
};
