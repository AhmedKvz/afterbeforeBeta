import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import { useConversations, useChat, useBlockUser, Conversation } from '@/hooks/useMessaging';
import { useReportUser } from '@/hooks/useStories';
import { useReceivedSparks, useSparkActions } from '@/hooks/useSparks';
import { useAuth } from '@/contexts/AuthContext';
import { OS, G, hexA, MONO } from '../osTheme';

const WHEEL = [G.techno, G.house, G.underground, G.festival, G.afterparty, G.community];
const colOf = (name: string) => { let h = 0; for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % WHEEL.length; return WHEEL[h]; };
const rel = (d?: string) => { if (!d) return ''; try { return formatDistanceToNow(new Date(d), { addSuffix: false }); } catch { return ''; } };
const mk = (c: string) => `linear-gradient(135deg,${c},#15161b)`;

export const OSMatches = () => {
  const { data: conversations = [], isLoading } = useConversations();
  const { data: sparks = [] } = useReceivedSparks();
  const { respond } = useSparkActions();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = conversations.find((c: any) => c.id === openId) || null;
  if (openId && open) return <OSChat conv={open} onBack={() => setOpenId(null)} />;

  const waves = conversations.filter((c: any) => c.is_incoming_wave);
  const chats = conversations.filter((c: any) => !c.is_incoming_wave);
  const empty = !isLoading && conversations.length === 0 && sparks.length === 0;

  return (
    <div className="os-scroll" style={{ minHeight: '100vh', overflowY: 'auto', paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 150 }}>
      <div style={{ padding: '8px 18px 0' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.22em', color: OS.ink6 }}>VEZE · CONNECTIONS</div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', color: OS.ink, marginTop: 2 }}>Matches</div>
      </div>

      {isLoading && <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink5, textAlign: 'center', padding: '40px 0' }}>UČITAVAM…</div>}

      {empty && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: OS.ink5 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>✨</div>
          <div style={{ fontSize: 14, color: OS.ink }}>Još nema veza</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Pošalji iskru sa žurke (Explore → mapa).</div>
        </div>
      )}

      {/* sparks */}
      {sparks.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: G.afterparty, marginBottom: 11 }}>[ ✨ {sparks.length} {sparks.length === 1 ? 'ISKRA' : 'ISKRI'} ]</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sparks.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 15, background: `radial-gradient(120% 100% at 0% 0%, ${hexA(G.afterparty, 0.14)}, transparent 60%), ${OS.surface}`, border: `1px solid ${hexA(G.afterparty, 0.4)}` }}>
                <span style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 19, background: `linear-gradient(135deg,${G.afterparty},${G.underground})`, animation: 'os-pulse 2s ease-in-out infinite' }}>✨</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: OS.ink }}>Tajna iskra</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 3 }}>{s.venue_emoji || '📍'} {(s.venue_name || 'BEOGRAD').toUpperCase()} · {rel(s.created_at)}</div>
                </div>
                <button onClick={() => respond.mutate(s.id, { onSuccess: (d: any) => d?.conversation_id && setOpenId(d.conversation_id) })} disabled={respond.isPending}
                  style={{ flex: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 600, padding: '8px 13px', borderRadius: 11, border: 0, background: G.afterparty, color: '#0B0B0D' }}>UZVRATI</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* new waves */}
      {waves.length > 0 && (
        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 11 }}>[ NOVO ]</div>
          <div className="os-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto' }}>
            {waves.map((n: any) => {
              const c = colOf(n.name || '·');
              return (
                <button key={n.id} onClick={() => setOpenId(n.id)} style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>
                  <span style={{ width: 60, height: 60, borderRadius: '50%', background: n.avatar ? `center/cover url(${n.avatar})` : mk(c), border: `2px solid ${c}`, boxShadow: `0 0 14px ${hexA(c, 0.4)}` }} />
                  <span style={{ fontSize: 11, color: OS.ink, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* conversations */}
      {chats.length > 0 && (
        <div style={{ padding: '22px 16px 0' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 11 }}>[ RAZGOVORI ]</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chats.map((c: any) => {
              const col = colOf(c.name || '·');
              return (
                <button key={c.id} onClick={() => setOpenId(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 13, borderRadius: 15, background: OS.surface, border: `1px solid ${OS.line}`, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                  <span style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', background: c.avatar ? `center/cover url(${c.avatar})` : mk(col), border: `1px solid ${hexA(col, 0.5)}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: OS.ink }}>{c.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6 }}>{rel(c.last_at)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: c.unread ? OS.ink : OS.ink5, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.last_message || (c.status === 'wave' ? 'Pozdrav poslat 👋' : 'Recite ćao 👋')}
                    </div>
                  </div>
                  {c.unread > 0 && <span style={{ flex: 'none', width: 9, height: 9, borderRadius: '50%', background: G.community, boxShadow: `0 0 8px ${G.community}` }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Chat thread ── */
const OSChat = ({ conv, onBack }: { conv: Conversation; onBack: () => void }) => {
  const { user } = useAuth();
  const { messages, send, sending } = useChat(conv.id) as any;
  const block = useBlockUser();
  const report = useReportUser();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const col = colOf(conv.name || '·');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    send(body);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(11,11,13,.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${OS.line}`, padding: 'calc(env(safe-area-inset-top) + 10px) 12px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, cursor: 'pointer', color: OS.ink }}><ArrowLeft className="w-5 h-5" /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', background: conv.avatar ? `center/cover url(${conv.avatar})` : mk(col) }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: OS.ink }}>{conv.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: G.festival }}>● AKTIVAN/NA</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenu((m) => !m)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, cursor: 'pointer', color: OS.ink2 }}><MoreVertical className="w-5 h-5" /></button>
          {menu && (
            <div style={{ position: 'absolute', right: 0, top: 44, zIndex: 20, width: 168, borderRadius: 12, overflow: 'hidden', background: OS.surface2, border: `1px solid ${OS.line2}` }}>
              <button onClick={() => { report.mutate({ target: conv.other_id, reason: 'inappropriate' }); setMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 13px', fontSize: 13, color: OS.ink, background: 'transparent', border: 0, cursor: 'pointer' }}>🚩 Prijavi</button>
              <button onClick={() => { block.mutate(conv.other_id); onBack(); }} style={{ width: '100%', textAlign: 'left', padding: '10px 13px', fontSize: 13, color: G.afterparty, background: 'transparent', border: 0, borderTop: `1px solid ${OS.line}`, cursor: 'pointer' }}>🚫 Blokiraj</button>
            </div>
          )}
        </div>
      </header>

      <div className="os-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {conv.status === 'wave' && (messages || []).length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: OS.ink5, padding: '24px 0' }}>👋 Pozdrav. Napiši poruku — kad {conv.is_incoming_wave ? 'odgovoriš' : 'uzvrate'}, otvara se chat.</div>
        )}
        {(messages || []).map((m: any) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} style={{ maxWidth: '78%', padding: '8px 14px', borderRadius: 18, fontSize: 14, ...(mine
              ? { alignSelf: 'flex-end', background: G.techno, color: '#fff', borderBottomRightRadius: 5 }
              : { alignSelf: 'flex-start', background: OS.surface, border: `1px solid ${OS.line}`, color: OS.ink, borderBottomLeftRadius: 5 }) }}>{m.body}</div>
          );
        })}
      </div>

      <form onSubmit={submit} style={{ position: 'sticky', bottom: 0, background: 'rgba(11,11,13,.92)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${OS.line}`, padding: '12px 12px calc(env(safe-area-inset-bottom) + 12px)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Poruka za ${conv.name}…`}
          style={{ flex: 1, borderRadius: 999, padding: '12px 16px', fontSize: 14, outline: 'none', background: OS.surface, border: `1px solid ${OS.line2}`, color: OS.ink }} />
        <button type="submit" disabled={sending || !text.trim()} style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, cursor: 'pointer', background: G.community, color: '#0B0B0D', opacity: sending || !text.trim() ? 0.5 : 1 }}><Send className="w-5 h-5" /></button>
      </form>
    </div>
  );
};
