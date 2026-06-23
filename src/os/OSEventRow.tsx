import { OS, MONO } from './osTheme';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
const DOW3 = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'];

// Role-based fixed colors — every field has ONE consistent color across the
// whole list (no per-genre rainbow). Calm, editorial — not a betting site.
// genre = blue · name = red · date + time = white.
const GENRE_C = '#7AA0E8';        // genre — always this blue
const NAME_C = '#E8705F';         // event/club name — always this red
const NEUTRAL_THUMB = 'linear-gradient(135deg,#1b1c20,#0e0f12)';

/** Resident Advisor-style event row, OS-skinned. Shared by Home + venue profile. */
export const OSEventRow = ({ e, past, onClick }: { e: any; past?: boolean; onClick?: () => void }) => {
  const d = e.date ? new Date(e.date) : null;
  const genre = (e.music_genres || []).slice(0, 2).join(' · ') || 'TBA';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 14, width: '100%', textAlign: 'left',
        padding: '13px 0', opacity: past ? 0.62 : 1, background: 'transparent',
        border: 0, borderTop: `1px solid ${OS.line}`, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* date — white */}
      <div style={{ flex: 'none', width: 48, textAlign: 'center', alignSelf: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 600, color: OS.ink, lineHeight: 1 }}>{d ? d.getDate() : '—'}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6, marginTop: 3, letterSpacing: '.04em' }}>{d ? MONTHS[d.getMonth()] : ''}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: OS.ink6, marginTop: 1 }}>{d ? DOW3[d.getDay()] : ''}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, alignSelf: 'center' }}>
        {/* genre — always blue */}
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: GENRE_C, marginBottom: 4 }}>{genre.toUpperCase()}</div>
        {/* name — always red */}
        <div style={{ fontSize: 15.5, fontWeight: 600, color: NAME_C, lineHeight: 1.2 }}>{e.title}</div>
        {/* time · venue — white */}
        <div style={{ fontFamily: MONO, fontSize: 11, color: OS.ink2, marginTop: 4 }}>{e.start_time?.slice(0, 5)}{e.venue_name ? ` · ${e.venue_name}` : ''}</div>
      </div>
      {/* thumbnail — neutral fallback (no per-genre tint) */}
      <div style={{ flex: 'none', width: 60, height: 60, borderRadius: 11, alignSelf: 'center', overflow: 'hidden', background: e.image_url ? `center/cover url(${e.image_url})` : NEUTRAL_THUMB, border: `1px solid ${OS.line2}` }} />
    </Tag>
  );
};
