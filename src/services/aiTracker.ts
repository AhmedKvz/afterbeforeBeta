import { supabase } from '@/integrations/supabase/client';

export const logTrainingEvent = async (
  eventType: 'swipe' | 'match' | 'checkin' | 'review' | 'signal',
  userId: string,
  targetId: string,
  features: Record<string, any>,
  label: string
) => {
  try {
    await supabase.from('ai_training_events' as any).insert({
      event_type: eventType,
      user_id: userId,
      target_id: targetId,
      features,
      label,
    });
  } catch (error) {
    console.error('AI tracker error:', error);
  }
};
