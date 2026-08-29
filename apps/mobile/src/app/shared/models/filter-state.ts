export interface FilterState {
  cuisines: string[];
  dietary: string[];
  ratingMin?: number;
  price?: string;
  radiusKm?: number;
  openNow: boolean;
}

export const EMPTY_FILTER_STATE: FilterState = {
  cuisines: [],
  dietary: [],
  ratingMin: undefined,
  price: undefined,
  radiusKm: undefined,
  openNow: false,
};

export const RATING_OPTIONS = [4.5, 4.0, 3.5];
export const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$'];
export const DISTANCE_OPTIONS_KM = [1, 3, 5, 10];

export function filterStateToQuery(state: FilterState): Record<string, string | number | boolean | undefined> {
  return {
    cuisine: state.cuisines.length > 0 ? state.cuisines.join(',') : undefined,
    dietary: state.dietary.length > 0 ? state.dietary.join(',') : undefined,
    ratingMin: state.ratingMin,
    price: state.price,
    radius: state.radiusKm,
    openNow: state.openNow ? true : undefined,
  };
}

export function countActiveFilters(state: FilterState): number {
  let count = state.cuisines.length + state.dietary.length;
  if (state.ratingMin) count += 1;
  if (state.price) count += 1;
  if (state.radiusKm) count += 1;
  if (state.openNow) count += 1;
  return count;
}
