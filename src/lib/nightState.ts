// Pure event-lifecycle helpers — no React/theme deps so they're unit-testable.
// Fixes the midnight bug: a party that started at 23:00 must still read LIVE
// at 01:00, even though the calendar date has rolled.

export type LifecycleKey = 'live' | 'gathering' | 'announced';

/** Local YYYY-MM-DD (not UTC — the app does date math in local time). */
export const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Nightlife "night date": anything before 6am still belongs to the previous day. */
export const nightDateStr = (now: Date): string => {
  const d = new Date(now);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return localDateStr(d);
};

export interface EventTimeLite {
  date?: string | null;
  start_time?: string | null; // 'HH:MM' or 'HH:MM:SS'
}

/**
 * Lifecycle of an event relative to `now`:
 *  - live      → belongs to the current night AND its start time has passed
 *  - gathering → not started, but people have signalled "going"
 *  - announced → not started, no signals yet
 */
export const lifecycleKey = (e: EventTimeLite, going: number, now: Date): LifecycleKey => {
  if (e.date && e.start_time && e.date === nightDateStr(now)) {
    const hhmmss = e.start_time.length === 5 ? `${e.start_time}:00` : e.start_time;
    const start = new Date(`${e.date}T${hhmmss}`);
    if (!Number.isNaN(start.getTime()) && now.getTime() >= start.getTime()) return 'live';
  }
  return going > 0 ? 'gathering' : 'announced';
};
