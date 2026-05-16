export type VenueType = 'club' | 'restaurant' | 'cafe' | 'bar' | 'venue' | 'afterplace' | 'splav';

export const VENUE_REVIEW_TAGS: Record<string, string[]> = {
  club: ['Music', 'Crowd', 'Sound System', 'Vibe', 'Security', 'Prices', 'Line/Waiting', 'Drinks'],
  splav: ['Music', 'Crowd', 'Sound System', 'Vibe', 'View', 'Prices', 'Line/Waiting', 'Drinks'],
  restaurant: ['Food', 'Service', 'Ambience', 'Price/Value', 'Cleanliness'],
  cafe: ['Coffee', 'Atmosphere', 'Staff', 'Work-Friendly', 'Music', 'Crowd'],
  bar: ['Drinks', 'Vibe', 'Music', 'Staff', 'Prices'],
  afterplace: ['Food', 'Speed', 'Late Hours', 'Price/Value', 'Vibe'],
  venue: ['Vibe', 'Sound', 'Crowd', 'Staff', 'Prices'],
};

export const getReviewTagsFor = (type?: string | null): string[] =>
  VENUE_REVIEW_TAGS[(type || 'club') as VenueType] || VENUE_REVIEW_TAGS.club;

export const VENUE_TYPE_LABEL: Record<string, string> = {
  club: 'Club',
  splav: 'Splav',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  afterplace: 'Food Corner',
  venue: 'Venue',
};
