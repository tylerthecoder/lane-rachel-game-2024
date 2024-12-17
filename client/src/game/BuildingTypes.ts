export type BuildingType =
  | 'restaurant'
  | 'pokemon'
  | 'dogStore'
  | 'park'
  | 'house';

export interface Building {
  side: 'left' | 'right';
  y: number;
  width: number;
  height: number;
  distance: number;
  type: BuildingType;
}

// Map building types to their image URLs - temporarily using the same image for all types
export const buildingImages: Record<BuildingType, string> = {
  restaurant: '/buildings/restraunt.webp',
  pokemon: '/buildings/restraunt.webp',
  dogStore: '/buildings/restraunt.webp',
  park: '/buildings/restraunt.webp',
  house: '/buildings/restraunt.webp',
};