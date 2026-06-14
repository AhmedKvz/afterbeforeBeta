// Creator Trust Levels — the stacking ladder that gates quest creation.
// Single source of truth for both the Quests UI and the landing page.
// Backend enforcement lives in supabase migration 20260614130000_creator_levels.sql
// (creator_tier_for / create_user_quest). Keep the two in sync.

export type Visibility = 'private' | 'crew' | 'community' | 'public' | 'venue' | 'sponsored';

export interface ReachOption {
  id: Visibility;
  tier: number;        // creator tier required to publish this reach
  icon: string;
  label: string;
  sub: string;
}

/** Each quest "reach" and the tier it unlocks at (stacking). */
export const REACH_OPTIONS: ReachOption[] = [
  { id: 'private',   tier: 1, icon: '🔒', label: 'Private',   sub: 'Just you' },
  { id: 'crew',      tier: 1, icon: '👯', label: 'Crew',      sub: 'Invite friends · 1.5× XP' },
  { id: 'community', tier: 2, icon: '🗳️', label: 'Community', sub: 'Suggest to the scene · reviewed' },
  { id: 'public',    tier: 3, icon: '🌍', label: 'Public',    sub: 'Everyone in Belgrade' },
  { id: 'venue',     tier: 4, icon: '🏛️', label: 'Venue',     sub: 'Official with a club' },
  { id: 'sponsored', tier: 5, icon: '💸', label: 'Sponsored', sub: 'Brand-backed · earn a cut' },
];

export interface CreatorTier {
  tier: number;
  name: string;
  icon: string;
  hue: number;
  blurb: string;
  needLevel: number;   // player level required (0 = baseline)
  needCreated: number; // quests created required
  unlocks: string[];
}

/** The full ladder, Tier 0 → Tier 5. Requirements mirror the SQL exactly. */
export const CREATOR_TIERS: CreatorTier[] = [
  {
    tier: 0, name: 'Player', icon: '🎮', hue: 200,
    blurb: 'Play quests, earn XP & rewards.',
    needLevel: 0, needCreated: 0,
    unlocks: ['Join any quest', 'Earn XP, badges & rewards', 'Build your raver passport'],
  },
  {
    tier: 1, name: 'Crew Maker', icon: '🛠️', hue: 282,
    blurb: 'Design quests for yourself and your friends.',
    needLevel: 1, needCreated: 0,
    unlocks: ['Create private quests', 'Create crew quests (invite friends · 1.5× XP)'],
  },
  {
    tier: 2, name: 'Contributor', icon: '🗳️', hue: 330,
    blurb: 'Pitch quests to the whole scene.',
    needLevel: 3, needCreated: 2,
    unlocks: ['Suggest community quests', 'Goes to a quick safety review + votes'],
  },
  {
    tier: 3, name: 'Verified Creator', icon: '⭐', hue: 38,
    blurb: 'Publish straight to the city.',
    needLevel: 5, needCreated: 5,
    unlocks: ['Publish public quests (auto-approved)', 'Creator badge on your profile', 'Basic quest analytics'],
  },
  {
    tier: 4, name: 'Pro Creator', icon: '🏛️', hue: 160,
    blurb: 'Build official quests with venues.',
    needLevel: 7, needCreated: 10,
    unlocks: ['Venue-collab quests', 'More active quests at once', 'Featured placement'],
  },
  {
    tier: 5, name: 'Partner Creator', icon: '💸', hue: 145,
    blurb: 'Turn quests into income.',
    needLevel: 10, needCreated: 20,
    unlocks: ['Sponsored quests', 'Revenue share (70 / 20 / 10)', 'Full analytics dashboard'],
  },
];

export const tierMeta = (tier: number): CreatorTier =>
  CREATOR_TIERS[Math.max(0, Math.min(tier, CREATOR_TIERS.length - 1))];

/** Next tier above the current one, or null if maxed. */
export const nextTier = (tier: number): CreatorTier | null =>
  tier >= CREATOR_TIERS.length - 1 ? null : CREATOR_TIERS[tier + 1];

export interface CreatorStatus {
  tier: number;
  level: number;
  created: number;
  is_founding_raver?: boolean;
  requirements: { tier: number; need_level: number; need_created: number; met: boolean }[];
}
