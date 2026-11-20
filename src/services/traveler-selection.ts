import type { TravelerId } from '../content/world/assets';

const storageKey = 'dunhuang:traveler-selection:v1';

export const travelerProfiles = {
  classic: {
    name: '鸣沙', portrait: 'traveler-selection/v004/classic.webp',
    compact: 'traveler-selection/v004/classic-compact.webp', avatar: 'traveler-selection/v004/classic-avatar.webp',
  },
  tripo: {
    name: '林澈', portrait: 'traveler-selection/v004/tripo.webp',
    compact: 'traveler-selection/v004/tripo-compact.webp', avatar: 'traveler-selection/v004/tripo-avatar.webp',
  },
} satisfies Record<TravelerId, { name: string; portrait: string; compact: string; avatar: string }>;

export function readTravelerSelection(): TravelerId | null {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved === 'classic' || saved === 'tripo' ? saved : null;
  } catch {
    return null;
  }
}

export function saveTravelerSelection(id: TravelerId): void {
  try {
    localStorage.setItem(storageKey, id);
  } catch { /* The app still uses the selection for this visit. */ }
}
