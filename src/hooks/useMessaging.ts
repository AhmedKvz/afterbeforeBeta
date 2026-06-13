import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface Conversation {
  id: string;
  status: 'wave' | 'active';
  initiated_by: string;
  other_id: string;
  name: string;
  avatar: string | null;
  last_message: string | null;
  last_at: string;
  unread: number;
  is_incoming_wave: boolean;
}

/** My inbox: conversations with the other person's profile + unread. Realtime-refreshed. */
export const useConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const q = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_conversations');
      if (error) throw error;
      return (data as Conversation[]) || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = db
      .channel('inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [user, queryClient]);

  const unreadTotal = (q.data || []).reduce((s, c) => s + (c.unread || 0), 0);
  return { ...q, unreadTotal };
};

/** A single chat thread: messages + realtime + send + mark read. */
export const useChat = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await db
        .from('messages').select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    // mark read on open
    db.rpc('mark_conversation_read', { p_conversation: conversationId });
    const ch = db
      .channel('chat-' + conversationId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        db.rpc('mark_conversation_read', { p_conversation: conversationId });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [conversationId, queryClient]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await db.rpc('send_message', { p_conversation: conversationId, p_body: body });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => toast('Poruka nije poslata', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });

  return { messages: q.data || [], isLoading: q.isLoading, send: send.mutate, sending: send.isPending };
};

/** Wave at someone (anyone can). Returns conversation id. */
export const useSendWave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { data, error } = await db.rpc('send_wave', { p_target: targetId });
      if (error) throw error;
      return data as { conversation_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast('👋 Pozdrav poslat', { description: 'Javiće ti se ako uzvrate.' });
    },
    onError: (e: any) => toast('Nije uspelo', { description: e?.message ?? 'Pokušaj ponovo.' }),
  });
};

/** Block a user. */
export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await db.rpc('block_user', { p_target: targetId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['venue-presence'] });
      toast('Korisnik blokiran');
    },
  });
};
