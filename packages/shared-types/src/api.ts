/** Standard success envelope returned by every DineScout API endpoint. */
export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

/** Standard error envelope. Never carries a stack trace or internal detail. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface RestaurantSearchQuery extends PaginationQuery {
  search?: string;
  cuisine?: string; // CuisineSlug, comma-separated for multi-select
  dietary?: string; // DietaryTag, comma-separated
  ratingMin?: number;
  price?: string; // PriceRange
  lat?: number;
  lng?: number;
  radius?: number; // km
  openNow?: boolean;
  sort?: 'rating' | 'distance' | 'popularity' | 'newest';
}

export interface ReviewListQuery extends PaginationQuery {
  sort?: 'most_relevant' | 'newest' | 'highest_rated' | 'lowest_rated';
}
