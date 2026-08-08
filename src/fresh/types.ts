import type { OSVenue } from '@/os/OSVenueSheet';

export type FreshTab = 'tonight' | 'discover' | 'people' | 'passport';

export interface FreshActions {
  openVenue: (venue: OSVenue) => void;
  openVenuePicker: () => void;
  openNightHub: () => void;
  openMessages: () => void;
  openMissions: () => void;
  openNotifications: () => void;
  go: (tab: FreshTab) => void;
}
