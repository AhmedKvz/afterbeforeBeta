// Nightlife OS design direction — shared tokens.
// A terminal/operating-system aesthetic for the night: IBM Plex Mono labels,
// deep neutral blacks, and a 6-genre color wheel. Ported 1:1 from the
// "AfterBefore App.dc.html" Claude Design handoff.

/** The 6-genre color wheel. */
export const G = {
  techno: '#3b6fe6',
  house: '#f5a623',
  underground: '#a64dff',
  festival: '#34d399',
  afterparty: '#ff4d8d',
  community: '#56d6e6',
} as const;

/** Surface + ink scale. */
export const OS = {
  bgDeep: '#070708',
  bg: '#0B0B0D',
  surface: '#131417',
  surface2: '#15161b',
  surface3: '#0E0E11',
  line: 'rgba(255,255,255,.06)',
  line2: 'rgba(255,255,255,.08)',
  ink: '#F5F5F5',
  ink2: '#D4D7DE',
  ink3: '#C9CCD4',
  ink4: '#B6BAC4',
  ink5: '#8A8E98',
  ink6: '#6E727C',
  ink7: '#54565E',
} as const;

export const MONO = "'IBM Plex Mono', monospace";

/** hex + alpha → rgba() string. */
export const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Map any genre / venue-type string to a wheel color. */
export function genreCol(genre?: string | null): string {
  const g = (genre || '').toLowerCase();
  if (/techno|tech\s?house/.test(g)) return G.techno;
  if (/house|disco|funk|groove/.test(g)) return G.house;
  if (/under|minimal|dub|ambient|experimental/.test(g)) return G.underground;
  if (/festival|open\s?air|trance|psy/.test(g)) return G.festival;
  if (/after|jungle|dnb|drum|breaks|hard/.test(g)) return G.afterparty;
  if (/club|bar|splav|cafe|community|hip|rnb|r&b/.test(g)) return G.community;
  return G.community;
}

/** Diagonal striped venue/event placeholder background (when no image). */
export const stripe = (c: string): string =>
  `linear-gradient(150deg,${hexA(c, 0.4)},#101013 78%)`;

/** Diagonal hatch overlay used over images. */
export const HATCH =
  'repeating-linear-gradient(48deg,rgba(255,255,255,.04),rgba(255,255,255,.04) 10px,transparent 10px,transparent 20px)';

/** Conic avatar gradient (profile / orb core). */
export const CONIC = 'conic-gradient(from 200deg,#a64dff,#3b6fe6,#56d6e6,#34d399,#a64dff)';
