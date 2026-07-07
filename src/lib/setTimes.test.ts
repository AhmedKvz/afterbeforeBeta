import { describe, it, expect } from 'vitest';
import { actTimestamp, sortSlots, nowPlayingIndex, SetSlot } from './setTimes';

const at = (iso: string) => new Date(iso);
const NIGHT = '2026-07-05';
const slots: SetSlot[] = [
  { artist: 'Warmup', time: '23:00' },
  { artist: 'MAGLA', time: '00:30' },
  { artist: 'Headliner', time: '02:30' },
  { artist: 'Closing', time: '05:00' },
];

describe('actTimestamp', () => {
  it('evening act stays on the night date', () => {
    expect(actTimestamp(NIGHT, '23:00').getDate()).toBe(5);
  });
  it('early-morning act rolls to the next calendar day', () => {
    expect(actTimestamp(NIGHT, '02:30').getDate()).toBe(6);
  });
});

describe('sortSlots (after-midnight wrap)', () => {
  it('orders across midnight correctly', () => {
    const shuffled = [slots[2], slots[0], slots[3], slots[1]];
    expect(sortSlots(shuffled, NIGHT).map((s) => s.artist)).toEqual(['Warmup', 'MAGLA', 'Headliner', 'Closing']);
  });
});

describe('nowPlayingIndex', () => {
  it('nothing yet before the first act', () => {
    expect(nowPlayingIndex(slots, NIGHT, at('2026-07-05T22:00:00'))).toBe(-1);
  });
  it('warmup during the first slot', () => {
    expect(nowPlayingIndex(slots, NIGHT, at('2026-07-05T23:30:00'))).toBe(0);
  });
  it('headliner after 02:30 (next calendar day)', () => {
    expect(nowPlayingIndex(slots, NIGHT, at('2026-07-06T03:00:00'))).toBe(2);
  });
  it('MAGLA between 00:30 and 02:30', () => {
    expect(nowPlayingIndex(slots, NIGHT, at('2026-07-06T01:00:00'))).toBe(1);
  });
});
