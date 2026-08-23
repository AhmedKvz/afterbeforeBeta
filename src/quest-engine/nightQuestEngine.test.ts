import { describe, expect, it } from 'vitest';
import { createNightQuestRun, nightQuestReducer, restoreNightQuestRun } from './nightQuestEngine';

describe('Quest Engine 3.0 state machine', () => {
  it('moves through the complete verified night lifecycle', () => {
    let run = createNightQuestRun();
    run = nightQuestReducer(run, { type: 'toggle-side' });
    run = nightQuestReducer(run, { type: 'accept', at: '2026-08-27T21:10:00Z' });
    run = nightQuestReducer(run, {
      type: 'verify-presence',
      at: '2026-08-27T21:44:00Z',
      venueId: 'kult',
      venueName: 'Kult',
      headcount: 18,
    });
    expect(run.phase).toBe('live');
    expect(run.sideQuestAccepted).toBe(true);

    run = nightQuestReducer(run, { type: 'finish-night', at: '2026-08-27T23:00:00Z', presenceMinutes: 76, headcount: 22 });
    run = nightQuestReducer(run, { type: 'save-chronicle', at: '2026-08-28T08:32:00Z', chronicle: 'Scena se skupila.' });
    run = nightQuestReducer(run, { type: 'unlock-reward', at: '2026-08-28T08:33:00Z' });

    expect(run.phase).toBe('return');
    expect(run.presenceMinutes).toBe(76);
    expect(run.headcount).toBe(22);
    expect(run.chronicle).toBe('Scena se skupila.');
  });

  it('does not allow an unaccepted or unverified run to skip phases', () => {
    const initial = createNightQuestRun();
    const unverified = nightQuestReducer(initial, {
      type: 'verify-presence', venueId: 'kult', venueName: 'Kult', headcount: 20,
    });
    const skipped = nightQuestReducer(unverified, { type: 'finish-night', presenceMinutes: 45, headcount: 20 });
    expect(skipped).toEqual(initial);
  });

  it('restores only compatible persisted runs', () => {
    expect(restoreNightQuestRun('{"version":2,"phase":"return"}').phase).toBe('pre');
    expect(restoreNightQuestRun('{not-json').phase).toBe('pre');
    expect(restoreNightQuestRun(JSON.stringify({ ...createNightQuestRun(), phase: 'after' })).phase).toBe('after');
  });
});
