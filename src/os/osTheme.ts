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
  // lifted for contrast (was 8A8E98 / 6E727C / 54565E) — micro-labels must
  // stay legible on the void in a dark club. Order ink5 > ink6 > ink7 kept.
  ink5: '#9CA0AA',
  ink6: '#868A94',
  ink7: '#70747D',
} as const;

export const MONO = "'IBM Plex Mono', monospace";

/** AFTERBEFORE_DESIGN.md v1 — Frame tokeni (CSS vars iz index.css).
 *  Kanon ekrani (Quests → Home → …) koriste ove umesto OS.* surface boja;
 *  žanr/kultura i dalje ide kroz G/genreCol (content nosi boju, Frame ne). */
export const AB = {
  void: 'var(--ab-void)', surface: 'var(--ab-surface)', raised: 'var(--ab-raised)',
  line: 'var(--ab-hairline)', line2: 'var(--ab-hairline-strong)',
  ink: 'var(--ab-ink)', ink2: 'var(--ab-ink-2)', ink3: 'var(--ab-ink-3)',
  acid: 'var(--ab-acid)', acidDim: 'var(--ab-acid-dim)', acidInk: 'var(--ab-acid-ink)',
  uv: 'var(--ab-uv)', uvDim: 'var(--ab-uv-dim)', hot: 'var(--ab-hot)',
};

/** Role-based fixed field colors for dense lists (no per-genre rainbow).
 *  genre = blue · name = red · energy = green. Same across the whole app. */
export const ROLE = {
  genre: '#7AA0E8',
  name: '#E8705F',
  energy: '#34d399',
} as const;

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
