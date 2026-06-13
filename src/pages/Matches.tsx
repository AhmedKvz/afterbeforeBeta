import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MoreVertical, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useChat, useBlockUser, Conversation } from '@/hooks/useMessaging';
import { useReportUser } from '@/hooks/useStories';
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

        {!isLoading && conversations.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Još nema poruka</p>
            <p className="text-sm mt-1">Pozdravi nekoga 👋 sa heat mape da započneš.</p>
          </div>
        )}

        {waves.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">👋 POZDRAVI · {waves.length}</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {waves.map((c) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} className="flex flex-col items-center gap-1.5 flex-none w-[72px]">
                  <div className="rounded-full p-0.5 bg-gradient-to-br from-primary to-secondary"><Avatar name={c.name} avatar={c.avatar} size={58} /></div>
                  <span className="text-[11px] truncate max-w-[68px]">{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {chats.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground mb-2">RAZGOVORI</h2>
            <div className="space-y-1">
              {chats.map((c) => (
                <button key={c.id} onClick={() => setOpenId(c.id)} className="flex w-full items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.04] text-left">
                  <Avatar name={c.name} avatar={c.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{c.name}</span>
                      <span className={cn('text-[10px]', c.unread ? 'text-primary font-bold' : 'text-muted-foreground')}>{c.last_at ? rel(c.last_at) : ''}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-[12px] truncate', c.unread ? 'text-foreground' : 'text-muted-foreground')}>
                        {c.last_message || (c.status === 'wave' ? 'Pozdrav poslat 👋' : 'Recite ćao 👋')}
                      </span>
                      {c.unread > 0 && <span className="flex-none min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-white grid place-items-center">{c.unread}</span>}
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
            <div className="font-bold text-sm truncate">{conv.name}</div>
            <div className="text-[10px] text-success">● aktivan/na · vidi profil</div>
          </div>
        </button>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center"><MoreVertical className="w-5 h-5" /></button>
          {menu && (
            <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              <button onClick={() => { report.mutate({ target: conv.other_id, reason: 'inappropriate' }); setMenu(false); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/[0.04]">🚩 Prijavi</button>
              <button onClick={() => { block.mutate(conv.other_id); onBack(); }} className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-white/[0.04] border-t border-border">🚫 Blokiraj</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {conv.status === 'wave' && messages.length === 0 && (
          <div className="text-center text-[12px] text-muted-foreground py-6">
            👋 Pozdrav. Napiši poruku — kad {conv.is_incoming_wave ? 'odgovoriš' : 'uzvrate'}, otvara se chat.
          </div>
        )}
        {messages.map((m: any) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn('max-w-[78%] px-3.5 py-2 rounded-2xl text-sm', mine
              ? 'ml-auto bg-gradient-to-br from-primary to-secondary text-white rounded-br-sm'
              : 'bg-card border border-border rounded-bl-sm')}>
              {m.body}
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-3 flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Poruka za ${conv.name}…`}
          className="flex-1 bg-card border border-border-strong rounded-full px-4 py-3 text-sm outline-none focus:border-primary" />
        <button type="submit" disabled={sending || !text.trim()} className="w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default Matches;
