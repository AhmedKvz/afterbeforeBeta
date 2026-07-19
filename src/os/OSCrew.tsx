import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { OS, G, hexA, MONO } from './osTheme';
import { useExit } from './useExit';

const db = supabase as any;

interface Props { eventId?: string | null; venueId?: string | null; title?: string; onClose: () => void }

/** "Nađi ekipu" — opt-in crew for tonight, formed from people going to / at the
 *  same place. Group chat (safer than 1:1). Bootstraps the crew graph. */
export const OSCrew = ({ eventId, venueId, title, onClose }: Props) => {
  const { closing, close } = useExit(onClose);
  const qc = useQueryClient();
  const [crewId, setCrewId] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setMe(auth?.user?.id ?? null);
      try {
        const { data, error } = await db.rpc('join_crew', { p_event: eventId ?? null, p_venue: venueId ?? null });
        if (error) throw error;
        setCrewId(data?.crew_id ?? null);
      } catch (e: any) { toast.error('Ne mogu da nađem ekipu — pokušaj kasnije.'); }
      finally { setJoining(false); }
    })();
  }, [eventId, venueId]);

  const { data: crew } = useQuery({
    queryKey: ['crew', crewId],
    enabled: !!crewId,
    refetchInterval: 60_000, // fallback only — realtime channel below drives updates
    queryFn: async () => { const { data } = await db.rpc('get_crew', { p_crew: crewId }); return data; },
  });

  // Realtime: new messages/members invalidate instantly (was a 5s poll = 720 RPC/h).
  useEffect(() => {
    if (!crewId) return;
    const ch = supabase
      .channel(`crew-${crewId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crew_messages', filter: `crew_id=eq.${crewId}` }, () => qc.invalidateQueries({ queryKey: ['crew', crewId] }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crew_members', filter: `crew_id=eq.${crewId}` }, () => qc.invalidateQueries({ queryKey: ['crew', crewId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [crewId, qc]);

  const send = async () => {
    if (!crewId || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim(); setText('');
    const { error } = await db.rpc('post_crew_message', { p_crew: crewId, p_body: body });
    setSending(false);
    if (error) { toast.error('Nije poslato'); setText(body); return; }
    qc.invalidateQueries({ queryKey: ['crew', crewId] });
  };

  const members: any[] = crew?.members || [];
  const messages: any[] = [...(crew?.messages || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: OS.bgDeep, display: 'flex', flexDirection: 'column', animation: closing ? 'os-overlay-out .15s ease forwards' : 'os-overlay-in .2s cubic-bezier(.16,1,.3,1)' }}>
      {/* header */}
      <div style={{ padding: 'calc(env(safe-area-inset-top) + 14px) 16px 12px', borderBottom: `1px solid ${OS.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', color: G.afterparty }}>TVOJA EKIPA VEČERAS</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: OS.ink, marginTop: 2 }}>{crew?.crew?.venue || title || 'Nađi ekipu'}</div>
          </div>
          <button onClick={close} className="os-press" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 0, cursor: 'pointer', color: OS.ink }}>✕</button>
        </div>
        {/* member avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12 }}>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 46 }}>
              {m.avatar
                ? <img src={m.avatar} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, background: avatarGradient(hueFromString(m.name || m.user_id)) }}>{initials(m.name || '·')}</div>}
              <span style={{ fontSize: 10, color: OS.ink5, maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user_id === me ? 'Ti' : (m.name || '·')}</span>
            </div>
          ))}
          <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6, marginLeft: 4 }}>{members.length}/6</div>
        </div>
      </div>

      {/* chat */}
      <div className="os-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {joining && <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, textAlign: 'center', padding: '30px 0' }}>TRAŽIM TI EKIPU…</div>}
        {!joining && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: OS.ink5 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🧑‍🤝‍🧑</div>
            <div style={{ fontSize: 13, color: OS.ink3 }}>{members.length <= 1 ? 'Ti si prvi/prva. Ostavi poruku — ekipa se skuplja.' : 'Recite ćao — večeras izlazite zajedno.'}</div>
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.user_id === me;
          return (
            <div key={msg.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              {!mine && <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6, marginBottom: 3, marginLeft: 4 }}>{msg.name}</div>}
              <div style={{ padding: '9px 13px', borderRadius: 15, fontSize: 14, lineHeight: 1.35, background: mine ? G.afterparty : OS.surface, color: mine ? '#0B0B0D' : OS.ink, border: mine ? 0 : `1px solid ${OS.line}` }}>{msg.body}</div>
            </div>
          );
        })}
      </div>

      {/* input */}
      <div style={{ padding: '10px 16px calc(env(safe-area-inset-bottom) + 12px)', borderTop: `1px solid ${OS.line}`, display: 'flex', gap: 9 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Poruka ekipi…" disabled={joining || !crewId}
          style={{ flex: 1, background: OS.surface, border: `1px solid ${OS.line2}`, borderRadius: 14, padding: '11px 14px', fontSize: 14, color: OS.ink, outline: 'none' }} />
        <button onClick={send} disabled={sending || !text.trim()} style={{ flex: 'none', width: 46, borderRadius: 14, border: 0, cursor: 'pointer', background: text.trim() ? G.afterparty : 'rgba(255,255,255,.06)', color: text.trim() ? '#0B0B0D' : OS.ink6, fontSize: 17 }}>↑</button>
      </div>
    </div>
  );
};
