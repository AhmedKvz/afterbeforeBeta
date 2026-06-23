import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import confetti from 'canvas-confetti';
import { useLucky100Counter } from '@/hooks/useLucky100Counter';
import { useLucky100Winners } from '@/hooks/useLucky100Winners';
import { OS, G, hexA, MONO } from './osTheme';

const STEPS = [
  { icon: '📍', text: 'Čekiraj se na partnerskom događaju' },
  { icon: '＃', text: 'Tvoj check-in ulazi u globalni brojač' },
  { icon: '🎁', text: 'Svaki peti check-in pobeđuje istog trena' },
  { icon: '🎟', text: 'Pobednici uzimaju besplatne ulaznice' },
];

export const OSLucky100Modal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { stats, recentWinners, luckyInterval } = useLucky100Counter();
  const { unclaimedPrize, hasUnclaimedPrize, totalWins, winHistory } = useLucky100Winners();

  useEffect(() => {
    if (isOpen && hasUnclaimedPrize) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [G.underground, G.afterparty, G.house] });
    }
  }, [isOpen, hasUnclaimedPrize]);

  if (!isOpen) return null;
  const progressToNext = ((luckyInterval - stats.checkInsToNext) / luckyInterval) * 100;

  const share = async () => {
    const text = `🍀 Lucky 100 na AfterBefore — svaki ${luckyInterval}. check-in osvaja besplatnu ulaznicu! #Lucky100`;
    try { if ((navigator as any).share) await (navigator as any).share({ title: 'Lucky 100', text }); else await navigator.clipboard.writeText(text); } catch { /* cancelled */ }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(5,5,7,.66)', animation: 'os-scrim .25s ease' }} />
      <div className="os-scroll" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, top: 40, zIndex: 91, borderRadius: '26px 26px 0 0', overflowY: 'auto', background: OS.surface3, border: '1px solid rgba(255,255,255,.08)', animation: 'os-sheet .4s cubic-bezier(.16,1,.3,1)', paddingBottom: 28, maxWidth: 520, margin: '0 auto' }}>
        {/* header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(14,14,17,.95)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${OS.line}`, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#a64dff,#ff4d8d,#f5a623)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍀</div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: OS.ink }}>Lucky 100</div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink6 }}>INSTANT WIN RAFFLE</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 0, cursor: 'pointer', color: OS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X className="w-5 h-5" /></button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* counter */}
          <div style={{ padding: 16, borderRadius: 18, background: `linear-gradient(140deg,${hexA(G.underground, 0.12)},${hexA(G.house, 0.06)})`, border: `1px solid ${OS.line2}` }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 600, color: OS.ink }}>{stats.globalCount}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: OS.ink5 }}>GLOBAL CHECK-INS</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 }}>
              <span style={{ color: OS.ink3 }}>Sledeći: #{stats.nextLuckyNumber}</span>
              <span style={{ fontFamily: MONO, fontWeight: 600, color: G.festival }}>{stats.checkInsToNext} AWAY</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${progressToNext}%`, background: 'linear-gradient(90deg,#a64dff,#ff4d8d)', borderRadius: 4 }} /></div>
            <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, color: OS.ink6, marginTop: 10 }}>SVAKI {luckyInterval}. CHECK-IN POBEĐUJE 🍀</div>
          </div>

          {/* winner banner */}
          {hasUnclaimedPrize && unclaimedPrize && (
            <div style={{ padding: 14, borderRadius: 14, background: hexA(G.house, 0.1), border: `1px solid ${hexA(G.house, 0.4)}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: G.house }}>Pobedio/la si!</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: hexA(G.house, 0.8) }}>CHECK-IN #{unclaimedPrize.check_in_number}</div>
              </div>
              <button onClick={() => { window.location.hash = '#/lucky100'; }} style={{ padding: '8px 14px', borderRadius: 999, background: G.house, color: '#0B0B0D', fontWeight: 600, fontSize: 12, border: 0, cursor: 'pointer' }}>Uzmi</button>
            </div>
          )}

          {/* how it works */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 11 }}>[ KAKO RADI ]</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}` }}>
                  <span style={{ flex: 'none', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: OS.ink2 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* recent winners */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: OS.ink6, marginBottom: 11 }}>[ SKORAŠNJI POBEDNICI ]</div>
            {recentWinners.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentWinners.slice(0, 5).map((w: any) => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: OS.surface, border: `1px solid ${OS.line}` }}>
                    <span style={{ flex: 'none', width: 32, height: 32, borderRadius: '50%', background: w.avatar_url ? `center/cover url(${w.avatar_url})` : hexA(G.underground, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: G.underground, fontWeight: 700 }}>{!w.avatar_url && (w.display_name?.charAt(0).toUpperCase() || '?')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: OS.ink }}>{w.display_name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6 }}>CHECK-IN #{w.check_in_number}</div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: OS.ink6 }}>{formatDistanceToNow(new Date(w.won_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: MONO, fontSize: 11, color: OS.ink5 }}>JOŠ NEMA POBEDNIKA — BUDI PRVI!</div>}
          </div>

          {/* your stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}`, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: G.house }}>{totalWins}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: OS.ink6, marginTop: 4 }}>POBEDA</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: OS.surface, border: `1px solid ${OS.line}`, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: G.festival }}>{winHistory.filter((w: any) => w.prize_claimed).length}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: OS.ink6, marginTop: 4 }}>UZETO</div>
            </div>
          </div>

          {/* share */}
          <button onClick={share} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, background: 'linear-gradient(135deg,#a64dff,#ff4d8d)', color: '#fff', fontWeight: 600, fontSize: 14, border: 0, cursor: 'pointer' }}>↗ Podeli Lucky 100</button>
        </div>
      </div>
    </>
  );
};
