import {
  CuisineSlug,
  DietaryTag,
  PriceRange,
  RestaurantStatus,
  ReviewStatus,
  UserRole,
} from './enums';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Cuisine {
  id: string;
  slug: CuisineSlug;
  name: string;
  emoji: string;
}

export interface DietaryOption {
  id: string;
  slug: DietaryTag;
  label: string;
  emoji: string;
}

export interface OpeningHour {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  opensAt: string; // "09:00"
  closesAt: string; // "22:00"
  isClosed: boolean;
}

export interface RestaurantPhoto {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface RestaurantSummary {
  id: string;
  slug: string;
  name: string;
  heroImageUrl: string;
  rating: number;
  reviewCount: number;
  cuisines: Cuisine[];
  dietaryOptions: DietaryOption[];
  priceRange: PriceRange;
  distanceKm: number | null;
  isOpenNow: boolean;
  isFavorite: boolean;
}

export interface Restaurant extends RestaurantSummary {
  description: string;
  address: string;
  coordinates: Coordinates;
  phone: string | null;
  website: string | null;
  status: RestaurantStatus;
  photos: RestaurantPhoto[];
  openingHours: OpeningHour[];
  popularDishIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isPopular: boolean;
  isAvailable: boolean;
  allergens: string[];
}

export interface ReviewPhoto {
  id: string;
  url: string;
}

export interface ReviewAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Review {
  id: string;
  restaurantId: string;
  author: ReviewAuthor;
  rating: number;
  title: string;
  comment: string;
  photos: ReviewPhoto[];
  status: ReviewStatus;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  editedByAuthor: boolean;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ReviewSummaryResponse {
  averageRating: number;
  reviewCount: number;
  distribution: RatingDistribution;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

export interface UserPreferences {
  favoriteCuisines: CuisineSlug[];
  dietaryPreferences: DietaryTag[];
  pricePreference: PriceRange | null;
  preferredDistanceKm: number;
}

export interface Favorite {
  restaurantId: string;
  createdAt: string;
}
