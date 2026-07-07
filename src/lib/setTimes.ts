// Set-times (satnica) helpers — pure, unit-testable.

export interface SetSlot { artist: string; time: string } // time = local 'HH:MM'

/** Timestamp of an act on a given night; an act before 6am belongs to the next calendar day. */
export const actTimestamp = (nightDate: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const d = new Date(`${nightDate}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  if ((h || 0) < 6) d.setDate(d.getDate() + 1); // early-morning act rolls to next day
  return d;
};

/** Chronological order for a night (handles after-midnight wrap). */
export const sortSlots = (slots: SetSlot[], nightDate: string): SetSlot[] =>
  [...slots].sort((a, b) => actTimestamp(nightDate, a.time).getTime() - actTimestamp(nightDate, b.time).getTime());

/** Index of the act playing at `now` (latest start that has passed), or -1 if none yet. */
export const nowPlayingIndex = (slots: SetSlot[], nightDate: string, now: Date): number => {
  let idx = -1;
  let best = -Infinity;
  slots.forEach((s, i) => {
    const ts = actTimestamp(nightDate, s.time).getTime();
    if (ts <= now.getTime() && ts > best) { best = ts; idx = i; }
  });
  return idx;
};
