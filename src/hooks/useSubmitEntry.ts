import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SubmitEntryArgs {
  challengeId: string;
  caption: string;
  file: File | null;
}

export const useSubmitEntry = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ challengeId, caption, file }: SubmitEntryArgs) => {
      if (!user) throw new Error('Moraš biti prijavljen');
      if (!caption.trim() && !file) throw new Error('Dodaj sliku ili opis');
      if (caption.length > 280) throw new Error('Opis najviše 280 karaktera');

      let mediaUrl: string | null = null;

      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Slika do 5 MB');
        if (!file.type.startsWith('image/')) throw new Error('Samo slike su dozvoljene');

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${challengeId}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('challenge-entries')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('challenge-entries').getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }

      const { error } = await supabase.from('challenge_entries').insert({
        challenge_id: challengeId,
        user_id: user.id,
        caption: caption.trim() || null,
        media_url: mediaUrl,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success('Prijava poslata 🎉');
      qc.invalidateQueries({ queryKey: ['challenge-entries', vars.challengeId] });
      qc.invalidateQueries({ queryKey: ['challenges'] });
      qc.invalidateQueries({ queryKey: ['user-entry', vars.challengeId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Prijava nije uspela'),
  });
};

export const useUserEntry = (challengeId: string | undefined, userId: string | undefined) => {
  return {
    queryKey: ['user-entry', challengeId, userId],
  };
};
