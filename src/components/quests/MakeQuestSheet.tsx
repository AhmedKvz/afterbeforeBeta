import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Lock } from 'lucide-react';
import { useCustomQuests, useCreatorStatus } from '@/hooks/useQuestSystem';
import { REACH_OPTIONS, type Visibility } from '@/lib/creatorLevels';
import { CreatorLadderSheet } from '@/components/quests/CreatorLevel';
import { cn } from '@/lib/utils';

type Tpl = { id: string; icon: string; title: string; sub: string; kind: string; category: string; t: number; xp: number };

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Sve' },
  { id: 'love', label: '💜 Ljubav' },
  { id: 'social', label: '🫂 Društvo' },
  { id: 'adventure', label: '🧭 Avantura' },
  { id: 'creative', label: '🎨 Kreativa' },
  { id: 'vote', label: '🗳️ Glasanje' },
  { id: 'challenge', label: '🔥 Izazov' },
  { id: 'crew', label: '👯 Ekipa' },
];

const QUEST_TEMPLATES: Tpl[] = [
  { id: 's1', icon: '🔮', title: 'Nađi rave-blizanca', sub: 'Mečuj se sa nekim ko deli tvoj vibe', kind: 'match', category: 'love', t: 1, xp: 120 },
  { id: 's2', icon: '💫', title: 'Dancefloor konekcija', sub: 'Upoznaj nekoga na podijumu', kind: 'match', category: 'love', t: 1, xp: 100 },
  { id: 's3', icon: '👋', title: 'Upoznaj 3 nova lica', sub: 'Pozdravi 3 osobe večeras', kind: 'match', category: 'social', t: 3, xp: 150 },
  { id: 'a1', icon: '🚢', title: 'Splav do izlaska sunca', sub: 'N splavi pre zore', kind: 'walk', category: 'adventure', t: 3, xp: 300 },
  { id: 'a2', icon: '🗺️', title: 'Venue crawl', sub: 'Obiđi N lokala večeras', kind: 'walk', category: 'adventure', t: 4, xp: 200 },
  { id: 'a3', icon: '🕵️', title: 'Lov na skriveni bar', sub: 'Nađi tajno mesto', kind: 'walk', category: 'adventure', t: 1, xp: 120 },
  { id: 'c1', icon: '👗', title: 'Najbolji outfit', sub: 'Glasajte za fit večeri', kind: 'custom', category: 'creative', t: 1, xp: 100 },
  { id: 'c2', icon: '📸', title: 'Uhvati momenat', sub: 'Postavi najbolji kadar noći', kind: 'custom', category: 'creative', t: 1, xp: 90 },
  { id: 'v1', icon: '🎧', title: 'Glasaj za DJ-a', sub: 'Okruni večerašnji set', kind: 'custom', category: 'vote', t: 1, xp: 60 },
  { id: 'h1', icon: '💧', title: 'Hydration hero', sub: 'Skeniraj water point, ostani hidriran', kind: 'custom', category: 'challenge', t: 1, xp: 60 },
  { id: 'h2', icon: '🎶', title: 'Probaj novi žanr', sub: 'Uđi u sobu koju bi preskočio', kind: 'walk', category: 'challenge', t: 1, xp: 110 },
  { id: 'cr1', icon: '👯', title: 'Dođi sa ekipom', sub: 'Stigni sa 3+ prijatelja', kind: 'match', category: 'crew', t: 3, xp: 180 },
  { id: 'free', icon: '🤝', title: 'Napravi svoj', sub: 'Slobodna forma — tvoja ideja, tvoja nagrada', kind: 'custom', category: 'custom', t: 1, xp: 100 },
];

const EMOJI = ['🎯', '🔮', '💫', '👋', '🚢', '🗺️', '🕵️', '👗', '📸', '🎧', '💧', '🎶', '👯', '🍸', '🌅', '🔥', '💜', '🎉'];

const TIMEFRAMES = [
  { id: 'today', label: 'Danas' },
  { id: 'week', label: 'Ove nedelje' },
  { id: 'month', label: 'Ovog meseca' },
];

interface MakeQuestSheetProps {
  onClose: () => void;
}

export const MakeQuestSheet = ({ onClose }: MakeQuestSheetProps) => {
  const { create, isCreating } = useCustomQuests();
  const { status } = useCreatorStatus();
  const [step, setStep] = useState<'template' | 'config'>('template');
  const [cat, setCat] = useState('all');
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [target, setTarget] = useState(3);
  const [timeframe, setTimeframe] = useState('week');
  const [reach, setReach] = useState<Visibility>('private');
  const [showLadder, setShowLadder] = useState(false);

  const isCrew = reach === 'crew';
  const xp = tpl ? Math.round(tpl.xp * (target / Math.max(tpl.t, 1)) * (isCrew ? 1.5 : 1)) : 0;
  const shown = cat === 'all' ? QUEST_TEMPLATES : QUEST_TEMPLATES.filter((t) => t.category === cat);

  const pick = (t: Tpl) => { setTpl(t); setTitle(t.title); setIcon(t.icon); setTarget(t.t); setStep('config'); };

  const handleCreate = () => {
    if (!tpl) return;
    create({
      icon, title: title.trim() || tpl.title, description: tpl.sub, kind: tpl.kind,
      target, xp, timeframe, isCrew, visibility: reach, category: tpl.category,
    });
    onClose();
  };

  if (status.tier < 1) {
    return (
      <Shell onClose={onClose}>
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-3xl mx-auto grid place-items-center text-3xl mb-3"
            style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 282), oklch(0.45 0.22 330))' }}>🛠️</div>
          <div className="text-[20px] font-extrabold">Otključaj pravljenje questova</div>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[280px] mx-auto">
            Stigni do <span className="text-foreground font-semibold">nivoa 2</span> da postaneš{' '}
            <span className="text-foreground font-semibold">Crew Maker</span> i napraviš svoj prvi quest.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-full bg-card border border-border">
            <span className="text-muted-foreground">Trenutno si na</span><span className="font-bold">Lv.{status.level}</span>
          </div>
          <button onClick={() => setShowLadder(true)} className="block w-full mt-5 py-3.5 rounded-2xl text-white font-extrabold text-sm"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
            Vidi creator put →
          </button>
        </div>
        {showLadder && <CreatorLadderSheet onClose={() => setShowLadder(false)} />}
      </Shell>
    );
  }

  return (
    <>
    <Shell onClose={onClose}
      back={step === 'config' ? () => setStep('template') : undefined}
      stepLabel={step === 'template' ? 'KORAK 1 / 2' : 'KORAK 2 / 2'}
      title={step === 'template' ? 'Kakav quest praviš?' : 'Doteraj ga'}
    >
      <AnimatePresence mode="wait">
        {step === 'template' ? (
          <motion.div key="tpl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2.5 -mx-1 px-1">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                    cat === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground border-border')}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {shown.map((t) => (
                <button key={t.id} onClick={() => pick(t)}
                  className="text-left p-3 rounded-2xl bg-card border border-border flex flex-col gap-1 active:scale-[0.98] transition">
                  <div className="text-2xl">{t.icon}</div>
                  <div className="font-bold text-[13px] mt-1">{t.title}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug">{t.sub}</div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="cfg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* title + emoji — make it yours */}
            <div className="mb-4">
              <div className="text-[11px] text-muted-foreground font-semibold tracking-wide mb-2">NAZIV</div>
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-card border border-border">
                <div className="w-11 h-11 rounded-xl bg-white/[0.06] grid place-items-center text-2xl flex-none">{icon}</div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={48}
                  placeholder="Daj questu ime…"
                  className="flex-1 bg-transparent outline-none text-[15px] font-bold placeholder:text-muted-foreground/60" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2 pb-0.5">
                {EMOJI.map((e) => (
                  <button key={e} onClick={() => setIcon(e)}
                    className={cn('shrink-0 w-9 h-9 rounded-xl grid place-items-center text-lg border',
                      icon === e ? 'border-accent bg-accent/15' : 'border-border bg-card')}>{e}</button>
                ))}
              </div>
            </div>

            {/* target */}
            <div className="mb-4">
              <div className="text-[11px] text-muted-foreground font-semibold tracking-wide mb-2">KOLIKO?</div>
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-card border border-border">
                <button onClick={() => setTarget((t) => Math.max(1, t - 1))} className="w-9 h-9 rounded-xl bg-white/[0.06] text-lg font-semibold">−</button>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-extrabold">{target}</div>
                  <div className="text-[10px] text-muted-foreground">lokala / ljudi / puta</div>
                </div>
                <button onClick={() => setTarget((t) => Math.min(20, t + 1))} className="w-9 h-9 rounded-xl bg-white/[0.06] text-lg font-semibold">+</button>
              </div>
            </div>

            {/* timeframe */}
            <div className="mb-4">
              <div className="text-[11px] text-muted-foreground font-semibold tracking-wide mb-2">KADA?</div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-card border border-border">
                {TIMEFRAMES.map((tf) => (
                  <button key={tf.id} onClick={() => setTimeframe(tf.id)}
                    className={`py-2 rounded-xl text-xs font-semibold transition ${timeframe === tf.id ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'text-muted-foreground'}`}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* reach — gated by creator tier */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground font-semibold tracking-wide">KO VIDI?</span>
                <button onClick={() => setShowLadder(true)} className="text-[10px] font-bold text-accent">Tier {status.tier} · nadogradi →</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {REACH_OPTIONS.map((opt) => {
                  const locked = status.tier < opt.tier;
                  const active = reach === opt.id;
                  return (
                    <button key={opt.id} onClick={() => (locked ? setShowLadder(true) : setReach(opt.id))}
                      className={cn('text-left p-3 rounded-2xl border relative', locked && 'opacity-70')}
                      style={{
                        background: active ? 'linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--secondary) / 0.08))' : 'hsl(var(--card))',
                        borderColor: active ? 'hsl(var(--accent) / 0.55)' : 'hsl(var(--border))',
                      }}>
                      {locked && <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><Lock className="w-3 h-3" /> T{opt.tier}</span>}
                      <div className={cn('text-[20px] mb-1', locked && 'grayscale')}>{opt.icon}</div>
                      <div className="text-[13px] font-bold">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
              {(reach === 'community' || reach === 'public') && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  🛡️ {reach === 'community' ? 'Ide na brzu bezbednosnu proveru pre nego što se pojavi drugima.' : 'Objavljuje se odmah — uz AI bezbednosnu proveru.'}
                </p>
              )}
            </div>

            {/* XP preview */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/10 to-secondary/5 mb-3.5">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground">Nagrada na završetku</div>
                <div className="text-lg font-extrabold text-accent">+{xp} XP</div>
              </div>
              {isCrew && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">1.5× crew bonus</span>}
            </div>

            <button onClick={handleCreate} disabled={isCreating || !title.trim()}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', boxShadow: '0 10px 28px -8px hsl(var(--primary) / 0.55)' }}>
              {isCrew ? '📨 Pozovi ekipu i pokreni'
                : reach === 'community' ? '🗳️ Pošalji zajednici'
                : reach === 'public' ? '🌍 Objavi quest'
                : '🚀 Pokreni quest'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
    {showLadder && <CreatorLadderSheet onClose={() => setShowLadder(false)} />}
    </>
  );
};

const Shell = ({ children, onClose, back, stepLabel, title }: {
  children: React.ReactNode; onClose: () => void; back?: () => void; stepLabel?: string; title?: string;
}) => (
  <div className="fixed inset-0 z-[100] flex flex-col justify-end">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative z-10 bg-background rounded-t-[26px] px-4 pt-3.5 pb-7 max-h-[92%] overflow-y-auto no-scrollbar shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
      <div className="flex items-start gap-2 mb-3.5">
        {back && <button onClick={back} className="flex items-center pt-1"><ArrowLeft className="w-[18px] h-[18px]" /></button>}
        <div className="flex-1">
          {stepLabel && <div className="text-[11px] text-muted-foreground font-semibold tracking-wide">{stepLabel}</div>}
          {title && <div className="text-[22px] font-extrabold mt-0.5">{title}</div>}
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
);
