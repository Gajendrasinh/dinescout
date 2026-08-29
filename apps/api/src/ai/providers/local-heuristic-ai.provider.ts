import { Injectable } from '@nestjs/common';
import { AiToolName, CuisineSlug, DietaryTag, MenuItem, RestaurantSummary, Review } from '@dinescout/shared-types';
import { ToolCallRecord } from '../tools/tool-router.service';
import { AiGenerateParams, AiGenerateResult, AiProvider } from './ai-provider.interface';

const CUISINE_KEYWORDS: [string, CuisineSlug][] = Object.values(CuisineSlug).map((slug) => [
  slug,
  slug,
]);
const DIETARY_KEYWORDS: [string, DietaryTag][] = [
  ['vegetarian', DietaryTag.VEGETARIAN],
  ['veg', DietaryTag.VEGETARIAN],
  ['vegan', DietaryTag.VEGAN],
  ['halal', DietaryTag.HALAL],
  ['jain', DietaryTag.JAIN],
  ['seafood', DietaryTag.SEAFOOD],
  ['non-veg', DietaryTag.NON_VEGETARIAN],
  ['non veg', DietaryTag.NON_VEGETARIAN],
];

function findKeyword<T extends string>(text: string, table: [string, T][]): T | undefined {
  return table.find(([keyword]) => text.includes(keyword))?.[1];
}

function extractDishQuery(text: string): string | undefined {
  const dishWords = ['ramen', 'biryani', 'pizza', 'burger', 'sushi', 'noodles', 'dumpling', 'curry', 'pasta', 'taco'];
  return dishWords.find((word) => text.includes(word));
}

/**
 * Zero-credential fallback used when `AI_API_KEY` is not configured. It
 * does not call any LLM — it runs a small set of keyword heuristics to
 * pick one whitelisted tool, then composes a templated reply strictly
 * from that tool's (real, database-backed) result. It intentionally does
 * not attempt open-ended conversation; it degrades gracefully rather than
 * pretending to be the full assistant.
 */
@Injectable()
export class LocalHeuristicAiProvider implements AiProvider {
  readonly degraded = true;

  async generate(params: AiGenerateParams): Promise<AiGenerateResult> {
    const text = params.userMessage.toLowerCase();
    const toolCalls: ToolCallRecord[] = [];

    const wantsMenu = /\bmenu\b|what should i order|what to order/.test(text);
    const wantsReviews = /review|people (say|think|like)|worth it/.test(text);
    const wantsNearby = /near me|nearby|close by|within \d/.test(text);
    const wantsOpenNow = /open now|currently open/.test(text);

    if (wantsMenu && params.hints.restaurantId) {
      const result = (await params.executeTool(AiToolName.GET_MENU, {
        restaurantId: params.hints.restaurantId,
      })) as { items: MenuItem[] };
      toolCalls.push({ tool: AiToolName.GET_MENU, args: { restaurantId: params.hints.restaurantId }, ok: true });
      const popular = result.items.filter((i) => i.isPopular).slice(0, 3);
      const picks = (popular.length > 0 ? popular : result.items.slice(0, 3))
        .map((i) => `${i.name} (${i.currency} ${i.price.toFixed(2)})`)
        .join(', ');
      return {
        text: picks
          ? `Popular picks on this menu: ${picks}.`
          : "I couldn't find menu items for this restaurant yet.",
        toolCalls,
      };
    }

    if (wantsReviews && params.hints.restaurantId) {
      const reviews = (await params.executeTool(AiToolName.GET_REVIEWS, {
        restaurantId: params.hints.restaurantId,
        limit: 15,
      })) as Review[];
      toolCalls.push({ tool: AiToolName.GET_REVIEWS, args: { restaurantId: params.hints.restaurantId }, ok: true });
      return { text: summarizeReviewsLocally(reviews), toolCalls };
    }

    const cuisine = findKeyword(text, CUISINE_KEYWORDS);
    const dietary = findKeyword(text, DIETARY_KEYWORDS);
    const dish = extractDishQuery(text);

    if (dish && !cuisine) {
      const results = (await params.executeTool(AiToolName.SEARCH_DISHES, {
        query: dish,
        limit: 5,
      })) as MenuItem[];
      toolCalls.push({ tool: AiToolName.SEARCH_DISHES, args: { query: dish }, ok: true });
      return { text: describeDishResults(dish, results), toolCalls };
    }

    if (wantsNearby && params.hints.lat !== undefined && params.hints.lng !== undefined) {
      const results = (await params.executeTool(AiToolName.FIND_NEARBY_RESTAURANTS, {
        lat: params.hints.lat,
        lng: params.hints.lng,
        radius: 3,
        cuisine,
        dietary,
      })) as RestaurantSummary[];
      toolCalls.push({ tool: AiToolName.FIND_NEARBY_RESTAURANTS, args: { lat: params.hints.lat, lng: params.hints.lng }, ok: true });
      return { text: describeRestaurantResults(results, { nearby: true }), toolCalls };
    }

    const results = (await params.executeTool(AiToolName.SEARCH_RESTAURANTS, {
      cuisine,
      dietary,
      openNow: wantsOpenNow || undefined,
      limit: 5,
    })) as RestaurantSummary[];
    toolCalls.push({ tool: AiToolName.SEARCH_RESTAURANTS, args: { cuisine, dietary }, ok: true });
    return { text: describeRestaurantResults(results, {}), toolCalls };
  }
}

function describeRestaurantResults(
  results: RestaurantSummary[],
  opts: { nearby?: boolean },
): string {
  if (results.length === 0) {
    return "I couldn't find a match for that. Try a different cuisine or widen the search.";
  }
  const list = results
    .slice(0, 5)
    .map((r) => `${r.name} (⭐ ${r.rating.toFixed(1)}, ${r.priceRange}${r.distanceKm !== null && r.distanceKm !== undefined ? `, ${r.distanceKm}km` : ''})`)
    .join('; ');
  const prefix = opts.nearby ? 'Nearby options: ' : 'Here are a few options: ';
  return `${prefix}${list}.`;
}

function describeDishResults(dish: string, results: MenuItem[]): string {
  if (results.length === 0) {
    return `I couldn't find "${dish}" on any menu right now.`;
  }
  const list = results
    .slice(0, 5)
    .map((i) => `${i.name} (${i.currency} ${i.price.toFixed(2)})`)
    .join('; ');
  return `Found ${dish} on these menus: ${list}.`;
}

// Curated theme phrases to look for verbatim (case-insensitively) in review
// text. Only themes that are actually found get reported — nothing here is
// asserted about a restaurant unless the words are present in a real review.
const POSITIVE_THEMES: [RegExp, string][] = [
  [/great food|delicious|tasty|amazing food/, 'Great food'],
  [/friendly (staff|service)|attentive service|helpful staff/, 'Friendly service'],
  [/large portion|generous portion|big portion/, 'Large portions'],
  [/good value|worth (the|it)|reasonably priced/, 'Good value'],
  [/cozy|great atmosphere|nice ambiance|nice ambience/, 'Great atmosphere'],
  [/fresh ingredients|fresh food/, 'Fresh ingredients'],
];
const NEGATIVE_THEMES: [RegExp, string][] = [
  [/long wait|slow service|took (a )?while/, 'Longer wait times'],
  [/overpriced|too expensive|pricey/, 'On the pricier side'],
  [/noisy|too loud/, 'Can get noisy'],
  [/small portion/, 'Portions can be small'],
  [/cold (food|when it arrived)/, 'Food arrived cold for some diners'],
];

function summarizeReviewsLocally(reviews: Review[]): string {
  if (reviews.length === 0) {
    return 'There are no published reviews for this restaurant yet.';
  }

  const corpus = reviews.map((r) => `${r.title} ${r.comment}`.toLowerCase());
  const countMatches = (themes: [RegExp, string][]) =>
    themes
      .map(([pattern, label]) => ({ label, count: corpus.filter((c) => pattern.test(c)).length }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

  const positive = countMatches(POSITIVE_THEMES);
  const negative = countMatches(NEGATIVE_THEMES);
  const frequentThreshold = Math.max(2, Math.ceil(reviews.length * 0.2));

  const lines: string[] = [];
  const frequent = positive.filter((t) => t.count >= frequentThreshold);
  if (frequent.length > 0) {
    lines.push(`People frequently mention: ${frequent.map((t) => `👍 ${t.label}`).join(' ')}`);
  }
  const occasional = [
    ...positive.filter((t) => t.count < frequentThreshold).map((t) => ({ ...t, icon: '👍' })),
    ...negative.map((t) => ({ ...t, icon: '⚠️' })),
  ];
  if (occasional.length > 0) {
    lines.push(
      `Some reviews mention: ${occasional.map((t) => `${t.icon} ${t.label}`).join(' ')}`,
    );
  }

  if (lines.length === 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return `Based on ${reviews.length} reviews (avg ${avg.toFixed(1)}★), no strong recurring themes stood out yet.`;
  }

  return lines.join(' ');
}
