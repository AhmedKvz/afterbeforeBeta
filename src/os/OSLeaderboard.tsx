import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenueDirectory } from '@/hooks/useHeatVenues';
import { AB, G, hexA, MONO } from './osTheme';

const db = supabase as any;
const LABEL = { fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: AB.ink3 } as const;

interface Row { user_id: string; display_name: string; avatar_url: string | null; checkins: number; venues: number; me: boolean }

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * TABELA (founder 2026-07-29) — leaderboard učesnika u Misije hubu.
 * MESEC određuje top 3 za nagradu iznenađenja; GODINA je duga trka;
 * MESTO = ko je domaći gde. Metrika: verifikovani dolasci (pošten broj).
 */
export const OSLeaderboard = () => {
  const [scope, setScope] = useState<'month' | 'year'>('month');
  const [venue, setVenue] = useState<string>('');
  const { data: dir } = useVenueDirectory();
  const venues: any[] = (dir?.venues || []).filter((v: any) => !v.active_until);

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ['leaderboard', scope, venue],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_leaderboard', { p_scope: scope, p_venue: venue || null });
      if (error) throw error;
      return data || [];
    },
  });

  const pill = (on: boolean) => ({
    flex: 'none' as const, cursor: 'pointer', padding: '8px 14px', borderRadius: 999,
    fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
    border: `1px solid ${on ? 'transparent' : AB.line}`,
    background: on ? AB.acid : AB.surface, color: on ? AB.acidInk : AB.ink3,
  });

  return (
    <div style={{ padding: '4px 18px 0' }}>
      {/* mesečna nagrada — jasno, pošteno, bez sitnih slova */}
      <div style={{ padding: '12px 14px', borderRadius: 16, background: hexA(G.house, 0.08), border: `1px solid ${hexA(G.house, 0.4)}`, marginBottom: 14 }}>
        <div style={{ ...LABEL, color: G.house }}>🎁 SVAKOG MESECA · PRVA TRI</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: AB.ink2, marginTop: 5 }}>
          Top 3 meseca nose <b style={{ color: AB.ink }}>nagradu iznenađenja</b> — objava prvog u mesecu. Broje se samo pravi dolasci.
        </div>
      </div>

      <div className="os-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
        <button onClick={() => setScope('month')} className="os-press" style={pill(scope === 'month')}>MESEC</button>
        <button onClick={() => setScope('year')} className="os-press" style={pill(scope === 'year')}>GODINA</button>
        <select value={venue} onChange={(e) => setVenue(e.target.value)} aria-label="Mesto"
          style={{ flex: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: 999, fontFamily: MONO, fontSize: 11, fontWeight: 600, appearance: 'auto', border: `1px solid ${venue ? 'transparent' : AB.line}`, background: venue ? AB.raised : AB.surface, color: venue ? AB.ink : AB.ink3, maxWidth: 150 }}>
          <option value="">SVA MESTA</option>
          {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {isLoading && <div style={{ ...LABEL, textAlign: 'center', padding: '24px 0' }}>UČITAVA…</div>}
      {!isLoading && rows.length === 0 && (
        <div style={{ ...LABEL, textAlign: 'center', padding: '24px 0', lineHeight: 1.8 }}>
          JOŠ NIKO NIJE UPISAN {scope === 'month' ? 'OVOG MESECA' : 'OVE GODINE'}.<br />PRVI CHECK-IN VODI.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const top3 = i < 3;
          return (
            <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 16, background: r.me ? hexA(G.techno, 0.08) : AB.surface, border: `1px solid ${r.me ? hexA(G.techno, 0.45) : top3 ? hexA(G.house, 0.4) : AB.line}` }}>
              <span style={{ flex: 'none', width: 26, textAlign: 'center', fontFamily: MONO, fontSize: top3 ? 16 : 12, fontWeight: 600, color: top3 ? G.house : AB.ink3 }}>{top3 ? MEDAL[i] : i + 1}</span>
              <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: r.avatar_url ? `center/cover url(${r.avatar_url})` : `linear-gradient(135deg,${G.underground},${G.techno})` }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', color: AB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.display_name}{r.me ? ' · ti' : ''}
              </span>
              <span style={{ flex: 'none', textAlign: 'right' }}>
                <span style={{ display: 'block', fontFamily: MONO, fontSize: 15, fontWeight: 600, color: top3 ? G.house : AB.ink2 }}>{r.checkins}</span>
                <span style={{ display: 'block', fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: AB.ink3 }}>{r.checkins === 1 ? 'DOLAZAK' : 'DOLAZAKA'}{!venue ? ` · ${r.venues} ${r.venues === 1 ? 'MESTO' : 'MESTA'}` : ''}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
