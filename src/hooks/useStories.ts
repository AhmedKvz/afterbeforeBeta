import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface StoryGroup {
  user_id: string;
  name: string;
  avatar: string | null;
  latest: string;
  stories: { id: string; media_url: string; caption: string | null; venue: string | null; created_at: string }[];
}

export const useActiveStories = () => {
  return useQuery<StoryGroup[]>({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data, error } = await db.rpc('get_active_stories');
      if (error) throw error;
      return (data as StoryGroup[]) || [];
    },
    staleTime: 60_000,
  });
};

/** Upload an image to the media bucket and create a 24h story. */
export const usePostStory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption, venue }: { file: File; caption?: string; venue?: string }) => {
      if (!user) throw new Error('Not logged in');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/stories/${Date.now()}.${ext}`;
      const up = await db.storage.from('media').upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = db.storage.from('media').getPublicUrl(path);
      const { error } = await db.from('stories').insert({ user_id: user.id, media_url: pub.publicUrl, caption: caption || null, venue_name: venue || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast('Story objavljen ✨', { description: 'Vidljiv 24h.' });
    },
    onError: (e: any) => toast('Story nije objavljen', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });
};

export const useReportUser = () => {
  return useMutation({
    mutationFn: async ({ target, reason, details }: { target: string; reason: string; details?: string }) => {
      const { error } = await db.rpc('report_user', { p_target: target, p_reason: reason, p_details: details ?? null });
      if (error) throw error;
    },
    onSuccess: () => toast('Prijava poslata', { description: 'Hvala — tim će pogledati.' }),
    onError: (e: any) => toast('Prijava nije poslata', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });
};
