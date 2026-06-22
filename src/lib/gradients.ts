// gradients.ts — hue-based gradients ported 1:1 from the AfterBefore prototype
// (prototype data.jsx: venueGrad / GradientImg / Avatar). Every venue, event and
// avatar in the prototype is tinted by a single `hue` (0–360) using oklch, which
// gives the signature deep, saturated nightlife look. Use these to reproduce it.
//
// Example:
//   <div style={{ background: venueGradient(282) }} />
//   <div style={{ background: avatarGradient(profile.hue) }} />

/** Card / hero background — linear, deep, fades to near-black. (prototype venueGrad) */
export function venueGradient(hue = 280): string {
  return `linear-gradient(135deg, oklch(0.58 0.2 ${hue}) 0%, oklch(0.34 0.16 ${(hue + 30) % 360}) 60%, #050207 100%)`;
}

/** Rich radial hero background used by the prototype's GradientImg (rich=true). */
export function richGradient(hue = 280): string {
  return `radial-gradient(120% 80% at 30% 20%, oklch(0.55 0.22 ${hue}) 0%, oklch(0.32 0.18 ${(hue + 30) % 360}) 45%, #0a0612 100%)`;
}

/** Avatar bubble fill — initials over a hued gradient. (prototype Avatar) */
export function avatarGradient(hue = 280): string {
  return `linear-gradient(135deg, oklch(0.6 0.2 ${hue}), oklch(0.32 0.15 ${(hue + 40) % 360}))`;
}

/** Soft glow blob for heat-map pins / accents. (prototype lights blob) */
export function glowBlob(hue = 280): string {
  return `radial-gradient(closest-side, oklch(0.7 0.22 ${(hue + 60) % 360}) 0%, transparent 70%)`;
}

/** Diagonal grain overlay used over rich gradients (prototype GradientImg grain). */
export const GRAIN_OVERLAY =
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 6px)';

/**
 * Stable hue (0–360) derived from any string (venue/event/person name).
 * The prototype hand-assigns a `hue` per entity; real data has none, so we
 * hash the name to a consistent color — same name always yields the same hue.
 */
export function hueFromString(str: string | null | undefined): number {
  if (!str) return 280; // prototype default purple
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

/** Initials from a name, matching the prototype's Avatar helper. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── AfterBefore Design System — Genre Hue Wheel ──────────────────────────────
// The canonical genre→hue map (AFTERBEFORE_DESIGN.md §2.4). Content carries the
// culture color; the brand Frame stays monochrome. Same layout, different genre
// energy — a Techno night reads blue, a House night reads gold.

const GENRE_WHEEL: Record<string, number> = {
  techno: 240,
  house: 60,
  'deep house': 60,
  underground: 300,
  minimal: 300,
  dnb: 150,
  'drum and bass': 150,
  'drum & bass': 150,
  jungle: 150,
  trance: 200,
  psy: 200,
  psytrance: 200,
  disco: 350,
  funk: 350,
  'hip hop': 35,
  'hip-hop': 35,
  rnb: 35,
  'r&b': 35,
};

/** Genre name → hue (0–360). Falls back to the neutral "mixed" hue 285. */
export function genreHue(genre: string | null | undefined): number {
  if (!genre) return 285;
  return GENRE_WHEEL[genre.trim().toLowerCase()] ?? 285;
}

/** Full-saturation genre color, for left-edges, tags, glows. */
export function genreColor(genre: string | null | undefined, L = 0.64, C = 0.18): string {
  return `oklch(${L} ${C} ${genreHue(genre)})`;
}

/** Faint genre wash for card backgrounds — never a full fill. */
export function genreTint(genre: string | null | undefined, alpha = 0.08): string {
  return `oklch(0.64 0.18 ${genreHue(genre)} / ${alpha})`;
}

/** Heat tier → label/class, mirroring the prototype's INFERNO / HOT / WARM tiers. */
export function heatTier(heat: number): 'inferno' | 'hot' | 'warm' | 'cool' {
  if (heat >= 85) return 'inferno';
  if (heat >= 70) return 'hot';
  if (heat >= 50) return 'warm';
  return 'cool';
}
