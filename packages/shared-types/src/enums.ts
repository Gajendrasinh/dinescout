export enum CuisineSlug {
  INDIAN = 'indian',
  CHINESE = 'chinese',
  JAPANESE = 'japanese',
  KOREAN = 'korean',
  THAI = 'thai',
  VIETNAMESE = 'vietnamese',
  ITALIAN = 'italian',
  MEXICAN = 'mexican',
  AMERICAN = 'american',
  MEDITERRANEAN = 'mediterranean',
  ARABIC = 'arabic',
  SINGAPOREAN = 'singaporean',
  MALAYSIAN = 'malaysian',
  FUSION = 'fusion',
  PIZZA = 'pizza',
  BURGER = 'burger',
  CAFE = 'cafe',
  DESSERT = 'dessert',
}

export enum DietaryTag {
  VEGETARIAN = 'vegetarian',
  NON_VEGETARIAN = 'non_vegetarian',
  VEGAN = 'vegan',
  HALAL = 'halal',
  JAIN = 'jain',
  SEAFOOD = 'seafood',
}

export enum PriceRange {
  BUDGET = '$',
  MODERATE = '$$',
  UPSCALE = '$$$',
  FINE_DINING = '$$$$',
}

export enum RestaurantStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export enum ReviewSort {
  MOST_RELEVANT = 'most_relevant',
  NEWEST = 'newest',
  HIGHEST_RATED = 'highest_rated',
  LOWEST_RATED = 'lowest_rated',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum AiRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum AnalyticsEvent {
  RESTAURANT_VIEWED = 'restaurant_viewed',
  MENU_VIEWED = 'menu_viewed',
  RESTAURANT_FAVORITED = 'restaurant_favorited',
  SEARCH_PERFORMED = 'search_performed',
  REVIEW_CREATED = 'review_created',
  AI_CHAT_STARTED = 'ai_chat_started',
  AI_RECOMMENDATION_CLICKED = 'ai_recommendation_clicked',
  DIRECTIONS_CLICKED = 'directions_clicked',
  CALL_CLICKED = 'call_clicked',
}
