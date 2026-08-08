import { useState } from 'react';
import { Artist, ARTIST_TYPE_LABEL, useArtists } from '@/hooks/useArtists';
import { avatarGradient, hueFromString, initials } from '@/lib/gradients';
import { AB, MONO } from './osTheme';

const LABEL: React.CSSProperties = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: AB.ink3, fontWeight: 600 };
const reveal = (i: number) => ({ animation: `ab-reveal .22s cubic-bezier(.16,1,.3,1) ${i * 40}ms both` });

const DATE_FMT = new Intl.DateTimeFormat('sr-Latn', { day: 'numeric', month: 'short' });

/**
 * SCENA — mreža umetnika u GRAD-u. Ljudi koje pratiš, ne inventar koji
 * skroluješ: ambasadori prvi, red = ko je + kad mu je sledeći termin.
 */
export const OSScena = ({ onOpenArtist }: { onOpenArtist: (a: Artist) => void }) => {
  const { data: artists = [], isLoading } = useArtists();
  const [typeF, setTypeF] = useState<string | null>(null);

  const types = [...new Set(artists.map((a) => a.type))];
  const shown = typeF ? artists.filter((a) => a.type === typeF) : artists;

  if (isLoading) return <div style={{ padding: '30px 0', textAlign: 'center', ...LABEL }}>UČITAVAM SCENU…</div>;

  if (artists.length === 0) {
    return (
      <div style={{ padding: 18, borderRadius: 16, border: `1px dashed ${AB.line2}` }}>
        <div style={LABEL}>SCENA</div>
        <div style={{ fontWeight: 800, fontSize: 17, marginTop: 8 }}>Mreža se formira.</div>
        <p style={{ fontSize: 13.5, color: AB.ink2, lineHeight: 1.55, margin: '8px 0 0' }}>
          DJ-evi, tattoo majstori i umetnici scene dobijaju svoje stranice ovde —
          timetable, radovi i praćenje. Prvi ambasadori stižu uskoro.
        </p>
      </div>
    );
  }

  return (
    <div>
      {types.length > 1 && (
        <div className="os-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12 }}>
          {[null, ...types].map((t) => {
            const on = typeF === t;
            return (
              <button key={t ?? 'sve'} onClick={() => setTypeF(t)} className="os-press"
                style={{ flex: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? AB.acid : AB.line2}`, background: on ? 'var(--ab-acid-soft)' : 'transparent', color: on ? AB.acid : AB.ink2 }}>
                {t === null ? 'SVI' : ARTIST_TYPE_LABEL[t] || t.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {shown.map((a, i) => (
        <button key={a.userId} onClick={() => onOpenArtist(a)} className="os-press"
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 0', background: 'transparent', border: 0, borderTop: `1px solid ${AB.line}`, cursor: 'pointer', ...reveal(i) }}>
          {a.avatarUrl
            ? <img src={a.avatarUrl} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
            : <div style={{ width: 46, height: 46, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', background: avatarGradient(hueFromString(a.name)) }}>{initials(a.name)}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontWeight: 800, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
              {a.ambassador && <span title="Ambasador scene" style={{ color: AB.acid, fontSize: 13, flex: 'none' }}>★</span>}
            </div>
            <div style={{ ...LABEL, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ARTIST_TYPE_LABEL[a.type] || 'UMETNIK'}
              {a.nextGig ? ` · ${DATE_FMT.format(new Date(a.nextGig.date))}${a.nextGig.venue ? ' · ' + a.nextGig.venue.toUpperCase() : ''}` : ''}
            </div>
          </div>
          <span style={{ ...LABEL, flex: 'none' }}>{a.followers > 0 ? `${a.followers} ♥` : ''}</span>
        </button>
      ))}
    </div>
  );
};
