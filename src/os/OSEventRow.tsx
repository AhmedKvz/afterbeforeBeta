import { AB, OS, MONO, ROLE } from './osTheme';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
const DOW3 = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'];

// Redizajn 2026-08-04: ROLE je premapiran na AB skalu — žanr je tiha meta
// linija, ime je najjače (belo), acid se čuva za prisustvo. Bez crveno/plavo.
const GENRE_C = ROLE.genre;
const NAME_C = ROLE.name;
const NEUTRAL_THUMB = 'linear-gradient(135deg,#17191d,#0c0d0f)';

/** Resident Advisor-style event row, OS-skinned. Shared by Home + venue profile.
 *  Optional `state` renders a lifecycle chip (LIVE / SKUPLJA SE / NAJAVLJEN). */
export const OSEventRow = ({ e, past, onClick, state }: { e: any; past?: boolean; onClick?: () => void; state?: { label: string; color: string } | null }) => {
  const d = e.date ? new Date(e.date) : null;
  const genre = (e.music_genres || []).slice(0, 2).join(' · ') || 'TBA';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 14, width: '100%', textAlign: 'left',
        padding: '13px 0', opacity: past ? 0.62 : 1, background: 'transparent',
        border: 0, borderTop: `1px solid ${AB.line}`, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* date — white */}
      <div style={{ flex: 'none', width: 48, textAlign: 'center', alignSelf: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 600, color: AB.ink, lineHeight: 1 }}>{d ? d.getDate() : '—'}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: AB.ink3, marginTop: 3, letterSpacing: '.04em' }}>{d ? MONTHS[d.getMonth()] : ''}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: AB.ink3, marginTop: 1 }}>{d ? DOW3[d.getDay()] : ''}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, alignSelf: 'center' }}>
        {/* genre — always blue */}
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: GENRE_C, marginBottom: 4 }}>{genre.toUpperCase()}</div>
        {/* name — always red */}
        <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-.01em', color: NAME_C, lineHeight: 1.2 }}>{e.title}</div>
        {/* time · venue — white */}
        <div style={{ fontFamily: MONO, fontSize: 11, color: AB.ink2, marginTop: 4 }}>{e.start_time?.slice(0, 5)}{e.venue_name ? ` · ${e.venue_name}` : ''}</div>
        {/* lifecycle state chip (optional) */}
        {state && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: state.color, marginTop: 6 }}>
            {state.label === 'LIVE SADA' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: state.color, animation: 'os-pulse 1.3s ease-in-out infinite' }} />}
            {state.label}
          </div>
        )}
      </div>
      {/* thumbnail — neutral fallback (no per-genre tint) */}
      <div style={{ flex: 'none', width: 60, height: 60, borderRadius: 10, alignSelf: 'center', overflow: 'hidden', background: e.image_url ? `center/cover url(${e.image_url})` : NEUTRAL_THUMB, border: `1px solid ${AB.line}` }} />
    </Tag>
  );
};
