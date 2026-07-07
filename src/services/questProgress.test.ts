import { describe, it, expect } from 'vitest';
import { getCurrentWeekStart } from './questProgress';

// Weekly quest assignment keys off this Monday string. If it drifts, users
// get re-assigned quests mid-week or never (the content-swap bug class).

describe('getCurrentWeekStart', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(getCurrentWeekStart()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resolves to a Monday', () => {
    const d = new Date(getCurrentWeekStart() + 'T12:00:00');
    expect(d.getDay()).toBe(1); // 1 = Monday
  });

  it('is not in the future', () => {
    expect(getCurrentWeekStart() <= new Date().toISOString().split('T')[0]).toBe(true);
  });
});
