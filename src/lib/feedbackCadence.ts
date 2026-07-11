// Feedback prompt cadence — localStorage only. Lives in lib so the OS shell
// doesn't import legacy components (severs the last OS→legacy import; the
// legacy FeedbackSheet re-exports from here). Pure read: the sheet itself
// stamps the cooldown key when it is actually shown.
export const FEEDBACK_COOLDOWN_KEY = 'ab_feedback_last';
export const FEEDBACK_COOLDOWN_DAYS = 7;

export function shouldShowFeedback(): boolean {
  try {
    const last = localStorage.getItem(FEEDBACK_COOLDOWN_KEY);
    if (!last) return true;
    const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= FEEDBACK_COOLDOWN_DAYS;
  } catch {
    return false;
  }
}
