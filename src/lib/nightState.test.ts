import { describe, it, expect } from 'vitest';
import { nightDateStr, localDateStr, lifecycleKey } from './nightState';

// Local-time Date builder so tests don't depend on the runner's UTC offset
// for the parts that matter (we compare same-tz Dates throughout).
const at = (iso: string) => new Date(iso); // 'YYYY-MM-DDTHH:MM:SS' → local

describe('localDateStr', () => {
  it('formats local Y-M-D zero-padded', () => {
    expect(localDateStr(at('2026-03-05T14:00:00'))).toBe('2026-03-05');
    expect(localDateStr(at('2026-12-09T09:00:00'))).toBe('2026-12-09');
  });
});

describe('nightDateStr (before 6am = previous day)', () => {
  it('afternoon → same day', () => {
    expect(nightDateStr(at('2026-07-05T22:00:00'))).toBe('2026-07-05');
  });
  it('01:00 → previous day (still the same night)', () => {
    expect(nightDateStr(at('2026-07-06T01:00:00'))).toBe('2026-07-05');
  });
  it('05:59 → previous day; 06:00 → same day (boundary)', () => {
    expect(nightDateStr(at('2026-07-06T05:59:00'))).toBe('2026-07-05');
    expect(nightDateStr(at('2026-07-06T06:00:00'))).toBe('2026-07-06');
  });
  it('crosses month boundary', () => {
    expect(nightDateStr(at('2026-08-01T02:00:00'))).toBe('2026-07-31');
  });
});

describe('lifecycleKey', () => {
  const ev = (date: string, start: string) => ({ date, start_time: start });

  it('tonight, before start → gathering when people going', () => {
    expect(lifecycleKey(ev('2026-07-05', '23:00:00'), 3, at('2026-07-05T22:00:00'))).toBe('gathering');
  });

  it('tonight, before start, nobody going → announced', () => {
    expect(lifecycleKey(ev('2026-07-05', '23:00:00'), 0, at('2026-07-05T22:00:00'))).toBe('announced');
  });

  it('tonight, after start → live', () => {
    expect(lifecycleKey(ev('2026-07-05', '23:00:00'), 0, at('2026-07-05T23:30:00'))).toBe('live');
  });

  it('THE BUG FIX: party started 23:00, now 01:00 next day → still live', () => {
    expect(lifecycleKey(ev('2026-07-05', '23:00:00'), 0, at('2026-07-06T01:00:00'))).toBe('live');
  });

  it('yesterday event seen the next afternoon → not live (announced/past)', () => {
    expect(lifecycleKey(ev('2026-07-05', '23:00:00'), 0, at('2026-07-06T14:00:00'))).toBe('announced');
  });

  it('handles HH:MM start (no seconds)', () => {
    expect(lifecycleKey(ev('2026-07-05', '23:00'), 0, at('2026-07-05T23:30:00'))).toBe('live');
  });

  it('missing start_time never goes live', () => {
    expect(lifecycleKey({ date: '2026-07-05', start_time: null }, 5, at('2026-07-05T23:30:00'))).toBe('gathering');
  });
});
