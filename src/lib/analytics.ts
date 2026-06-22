import { supabase } from '@/integrations/supabase/client';

// First-party analytics. Fire-and-forget: must NEVER block UX or throw.
// All events land in public.analytics_events via the track() RPC (auth.uid() filled server-side).

const SESSION_KEY = 'ab_session_id';

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return 's_unknown';
  }
}

export async function track(event: string, props: Record<string, unknown> = {}): Promise<void> {
  try {
    await (supabase as any).rpc('track', {
      p_event: event,
      p_props: props,
      p_session: getSessionId(),
    });
  } catch {
    // swallow — analytics is best-effort and must not affect the user
  }
}
