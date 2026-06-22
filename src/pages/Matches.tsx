import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useChat, useBlockUser, Conversation } from '@/hooks/useMessaging';
import { useReportUser } from '@/hooks/useStories';
import { useReceivedSparks, useSparkActions } from '@/hooks/useSparks';
import { BottomNav } from '@/components/BottomNav';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { cn } from '@/lib/utils';

const Avatar = ({ name, avatar, size = 48 }: { name: string; avatar?: string | null; size?: number }) =>
  avatar
    ? <img src={avatar} className="rounded-full object-cover flex-none" style={{ width: size, height: size }} />
    : <div className="rounded-full flex-none flex items-center justify-center font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.36, background: avatarGradient(hueFromString(name)) }}>{initials(name)}</div>;

const rel = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: false }); } catch { return ''; } };

const Matches = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: sparks = [] } = useReceivedSparks();
  const { respond } = useSparkActions();
  const [openId, setOpenId] = useState<string | null>(params.get('c'));

  if (!user) { navigate('/auth'); return null; }

  const open = conversations.find((c) => c.id === openId) || null;
  if (openId && open) return <ChatView conv={open} onBack={() => setOpenId(null)} />;

  const waves = conversations.filter((c) => c.is_incoming_wave);
  const chats = conversations.filter((c) => !c.is_incoming_wave);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="glass-header px-4 py-4">
        <h1 className="font-bold text-xl">Poruke</h1>
      </header>

      <div className="px-4 py-4 space-y-6">
        {isLoading && <p className="text-center text-muted-foreground text-sm py-8">Učitavam…</p>}

        {!isLoading && conversations.length === 0 && sparks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">✨</div>
            <p className="font-semibold" style={{ color: 'var(--ab-ink)' }}>Još nema poruka</p>
            <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ab-ink-3)' }}>Pošalji iskru nekome na žurci da počneš.</p>
            <button onClick={() => navigate('/heatmap')} className="px-5 py-3 rounded-full font-extrabold text-sm" style={{ background: 'var(--ab-acid)', color: 'var(--ab-acid-ink)', boxShadow: 'var(--ab-glow-acid)' }}>
              Idi na Heat Map →
            </button>
          </div>
        )}

        {sparks.length > 0 && (
          <section>
            <h2 className="text-[11px] font-extrabold tracking-[0.12em] mb-2" style={{ color: 'var(--ab-ink-3)' }}>✨ {sparks.length} {sparks.length === 1 ? 'ISKRA ČEKA' : 'ISKRI ČEKA'}</h2>
            <p className="text-[11px] mb-2.5 -mt-1" style={{ color: 'var(--ab-ink-3)' }}>Neko sa žurke ti je poslao iskru. Uzvrati da se otkrije ko.</p>
            <div className="space-y-2">
              {sparks.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ border: '1px solid oklch(0.62 0.25 300 / 0.45)', background: 'radial-gradient(120% 100% at 0% 0%, oklch(0.62 0.25 300 / 0.16), transparent 60%), var(--ab-surface)' }}>
                  <div className="w-11 h-11 rounded-full flex-none grid place-items-center text-xl ab-pulse" style={{ background: 'linear-gradient(135deg, var(--ab-uv), oklch(0.66 0.25 18))' }}>✨</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: 'var(--ab-ink)' }}>Tajna iskra</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--ab-ink-3)' }}>sa {s.venue_emoji || '📍'} {s.venue_name} · {s.created_at ? rel(s.created_at) : ''}</div>
                  </div>
                  <button
                    onClick={() => respond.mutate(s.id, { onSuccess: (d: any) => d?.conversation_id && setOpenId(d.conversation_id) })}
                    disabled={respond.isPending}
                    className="flex-none text-[12px] font-extrabold px-3.5 py-2 rounded-xl disabled:opacity-60"
                    style={{ background: 'var(--ab-acid)', color: 'var(--ab-acid-ink)', boxShadow: 'var(--ab-glow-acid)' }}
                  >
                    ✨ Uzvrati
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {waves.length > 0 && (
          <section>
            <h2 className="text-[11px] font-extrabold tracking-[0.12em] mb-2" style={{ color: 'var(--ab-ink-3)' }}>👋 POZDRAVI · {waves.length}</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {waves.map((c) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} className="flex flex-col items-center gap-1.5 flex-none w-[72px]">
                  <div className="rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, var(--ab-uv), var(--ab-acid))' }}><Avatar name={c.name} avatar={c.avatar} size={58} /></div>
                  <span className="text-[11px] truncate max-w-[68px]" style={{ color: 'var(--ab-ink-2)' }}>{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {chats.length > 0 && (
          <section>
            <h2 className="text-[11px] font-extrabold tracking-[0.12em] mb-2" style={{ color: 'var(--ab-ink-3)' }}>RAZGOVORI</h2>
            <div className="space-y-1">
              {chats.map((c) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} className="flex w-full items-center gap-3 p-2.5 rounded-2xl text-left transition-colors hover:bg-white/[0.04]">
                  <Avatar name={c.name} avatar={c.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--ab-ink)' }}>{c.name}</span>
                      <span className="text-[10px] font-bold" style={{ color: c.unread ? 'var(--ab-uv)' : 'var(--ab-ink-3)' }}>{c.last_at ? rel(c.last_at) : ''}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] truncate" style={{ color: c.unread ? 'var(--ab-ink)' : 'var(--ab-ink-3)' }}>
                        {c.last_message || (c.status === 'wave' ? 'Pozdrav poslat 👋' : 'Recite ćao 👋')}
                      </span>
                      {c.unread > 0 && <span className="flex-none min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center" style={{ background: 'var(--ab-uv)', color: '#fff' }}>{c.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

/* ───────── Chat thread ───────── */
const ChatView = ({ conv, onBack }: { conv: Conversation; onBack: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, send, sending } = useChat(conv.id);
  const block = useBlockUser();
  const report = useReportUser();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    send(body);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-header px-3 py-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <button onClick={() => navigate(`/u/${conv.other_id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar name={conv.name} avatar={conv.avatar} size={36} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'var(--ab-ink)' }}>{conv.name}</div>
            <div className="text-[10px]" style={{ color: 'var(--ab-acid)' }}>● aktivan/na · vidi profil</div>
          </div>
        </button>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center" style={{ color: 'var(--ab-ink-2)' }}><MoreVertical className="w-5 h-5" /></button>
          {menu && (
            <div className="absolute right-0 top-11 z-20 w-44 rounded-xl shadow-lg overflow-hidden" style={{ background: 'var(--ab-raised)', border: '1px solid var(--ab-hairline)' }}>
              <button onClick={() => { report.mutate({ target: conv.other_id, reason: 'inappropriate' }); setMenu(false); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/[0.04]" style={{ color: 'var(--ab-ink)' }}>🚩 Prijavi</button>
              <button onClick={() => { block.mutate(conv.other_id); onBack(); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/[0.04]" style={{ color: 'oklch(0.70 0.20 22)', borderTop: '1px solid var(--ab-hairline)' }}>🚫 Blokiraj</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {conv.status === 'wave' && messages.length === 0 && (
          <div className="text-center text-[12px] py-6" style={{ color: 'var(--ab-ink-3)' }}>
            👋 Pozdrav. Napiši poruku — kad {conv.is_incoming_wave ? 'odgovoriš' : 'uzvrate'}, otvara se chat.
          </div>
        )}
        {messages.map((m: any) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn('max-w-[78%] px-3.5 py-2 rounded-2xl text-sm', mine ? 'ml-auto rounded-br-sm' : 'rounded-bl-sm')}
              style={mine
                ? { background: 'linear-gradient(135deg, var(--ab-uv), var(--ab-uv-dim))', color: '#fff' }
                : { background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline)', color: 'var(--ab-ink)' }}>
              {m.body}
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="sticky bottom-0 backdrop-blur p-3 flex items-center gap-2" style={{ background: 'oklch(0.135 0.012 285 / 0.92)', borderTop: '1px solid var(--ab-hairline)' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Poruka za ${conv.name}…`}
          className="flex-1 rounded-full px-4 py-3 text-sm outline-none" style={{ background: 'var(--ab-surface)', border: '1px solid var(--ab-hairline-strong)', color: 'var(--ab-ink)' }} />
        <button type="submit" disabled={sending || !text.trim()} className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50" style={{ background: 'var(--ab-acid)', color: 'var(--ab-acid-ink)', boxShadow: 'var(--ab-glow-acid)' }}>
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default Matches;
