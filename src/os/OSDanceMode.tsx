import { useState, useEffect } from 'react';
import { useDanceMeter } from '@/hooks/useDanceMeter';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/analytics';
import { incrementQuestProgress } from '@/services/questProgress';
import { OS, G, hexA, MONO, ROLE } from './osTheme';

const db = supabase as any;

interface Props { venueId?: string | null; venueName?: string; onClose: () => void }

export const OSDanceMode = ({ venueId, venueName, onClose }: Props) => {
  const dance = useDanceMeter();
  const [phase, setPhase] = useState<'intro' | 'live' | 'done' | 'board'>('intro');
  const [result, setResult] = useState<{ score: number; moves: number; rank: number | null }>({ score: 0, moves: 0, rank: null });

  const begin = async () => { setPhase('live'); await dance.start(); };

  const finish = async () => {
    dance.stop();
    const score = dance.score, moves = dance.moves;
    setResult({ score, moves, rank: null });
    setPhase('done');
    track('dance_session', { score, moves, venue: venueName, simulated: dance.simulated });
    try {
      const { data } = await db.rpc('save_dance_session', { p_score: score, p_moves: moves, p_duration: dance.seconds, p_venue: venueId ?? null, p_venue_name: venueName ?? null });
      if (data?.rank) setResult((r) => ({ ...r, rank: data.rank }));
      // quest engine: "Pomeri pod" (dance type)
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) await incrementQuestProgress(auth.user.id, 'dance');
    } catch { /* table not migrated yet — score still shown */ }
  };

  const glow = 0.2 + dance.intensity * 0.8;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: OS.bgDeep, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 14px) 18px 0' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.2em', color: OS.ink5 }}>🕺 DANCE FLOOR{venueName ? ` · ${venueName.toUpperCase()}` : ''}</div>
        <button onClick={() => { dance.stop(); onClose(); }} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 0, cursor: 'pointer', color: OS.ink }}>✕</button>
      </div>

      {phase === 'intro' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14 }}>
          <div style={{ fontSize: 64 }}>🕺</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: OS.ink }}>Spremi se za podijum</div>
          <div style={{ fontSize: 14, color: OS.ink4, maxWidth: 280, lineHeight: 1.5 }}>Telefon u džep ili u ruku. Što više plešeš, veći skor — i mesto na noćnom leaderboardu.</div>
          <button onClick={begin} style={{ marginTop: 12, padding: '16px 36px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 16, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg,${G.afterparty},${G.underground})`, boxShadow: `0 14px 40px -10px ${hexA(G.afterparty, 0.7)}` }}>POČNI 🔥</button>
          <button onClick={() => setPhase('board')} style={{ marginTop: 4, background: 'transparent', border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', color: OS.ink5 }}>VIDI LEADERBOARD →</button>
        </div>
      )}

      {phase === 'live' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
          {/* pulsing score */}
          <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${hexA(G.afterparty, glow * 0.5)}, transparent 70%)`, transform: `scale(${1 + dance.intensity * 0.4})`, transition: 'transform .12s' }} />
            <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', border: `2px solid ${hexA(G.afterparty, glow)}`, boxShadow: `0 0 ${20 + dance.intensity * 50}px ${hexA(G.afterparty, glow)}` }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 56, color: OS.ink, lineHeight: 1 }}>{dance.score}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', color: G.afterparty, marginTop: 6 }}>DANCE SCORE</div>
            </div>
          </div>
          {/* intensity meter */}
          <div style={{ width: '80%', maxWidth: 300, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${Math.round(dance.intensity * 100)}%`, background: `linear-gradient(90deg,${G.afterparty},${G.house})`, borderRadius: 4, transition: 'width .1s' }} />
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 12, fontFamily: MONO, fontSize: 12, color: OS.ink4 }}>
            <span>🔥 {dance.moves} POKRETA</span>
            <span>⏱ {dance.seconds}s</span>
          </div>
          {dance.simulated && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: OS.ink6, marginTop: 4 }}>SIM · NEMA SENZORA NA OVOM UREĐAJU</div>}
          <button onClick={finish} style={{ marginTop: 20, padding: '14px 40px', borderRadius: 999, border: `1px solid ${OS.line2}`, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: OS.ink, background: OS.surface }}>STOP</button>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 10 }}>
          <div style={{ fontSize: 54 }}>{result.rank === 1 ? '👑' : '🔥'}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', color: OS.ink5 }}>DANCE SCORE</div>
          <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 60, color: ROLE.energy, lineHeight: 1 }}>{result.score}</div>
          <div style={{ fontFamily: MONO, fontSize: 13, color: OS.ink4 }}>{result.moves} pokreta{result.rank ? ` · #${result.rank} večeras` : ''}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={() => setPhase('board')} style={{ padding: '13px 22px', borderRadius: 14, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#0B0B0D', background: G.afterparty }}>Leaderboard</button>
            <button onClick={begin} style={{ padding: '13px 22px', borderRadius: 14, border: `1px solid ${OS.line2}`, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: OS.ink, background: 'transparent' }}>Još jednom</button>
          </div>
        </div>
      )}

      {phase === 'board' && <Leaderboard onBack={() => setPhase(dance.score > 0 ? 'done' : 'intro')} />}
    </div>
  );
};

const Leaderboard = ({ onBack }: { onBack: () => void }) => {
  const [scope, setScope] = useState<'night' | 'week' | 'all'>('night');
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    db.rpc('get_dance_leaderboard', { p_scope: scope })
      .then(({ data }: any) => { if (alive) setRows(data || []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [scope]);

  const SCOPES: [typeof scope, string][] = [['night', 'VEČERAS'], ['week', 'NEDELJA'], ['all', 'SVE']];

  return (
    <div className="os-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 0, cursor: 'pointer', color: OS.ink }}>←</button>
        <div style={{ fontSize: 20, fontWeight: 700, color: OS.ink }}>Dance Floor MVP</div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {SCOPES.map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.06em', border: 0, background: scope === k ? hexA(G.afterparty, 0.18) : 'rgba(255,255,255,.05)', color: scope === k ? G.afterparty : OS.ink5 }}>{l}</button>
        ))}
      </div>
      {rows === null ? (
        <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, color: OS.ink5, padding: '30px 0' }}>UČITAVAM…</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, color: OS.ink5, padding: '30px 0' }}>JOŠ NIKO NIJE PLESAO — BUDI PRVI 🕺</div>
      ) : (
        <div>
          {rows.map((r, i) => (
            <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderTop: `1px solid ${OS.line}` }}>
              <div style={{ flex: 'none', width: 28, textAlign: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 16, color: i === 0 ? G.house : i < 3 ? OS.ink : OS.ink5 }}>{i + 1}</div>
              <span style={{ flex: 'none', width: 38, height: 38, borderRadius: '50%', background: r.avatar_url ? `center/cover url(${r.avatar_url})` : `linear-gradient(135deg,${G.afterparty},#15161b)` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: ROLE.name }}>{r.display_name || 'Raver'}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink5, marginTop: 2 }}>{r.moves} pokreta</div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: ROLE.energy }}>{r.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
