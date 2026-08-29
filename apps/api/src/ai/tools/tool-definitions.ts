import { AiToolName } from '@dinescout/shared-types';

/** Anthropic-style tool (function) definitions. This is the ENTIRE surface
 *  the LLM can act through — it never sees a database connection, only
 *  these whitelisted, schema-validated tools. ToolRouter refuses anything
 *  not listed here. */
export interface ToolDefinition {
  name: AiToolName;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: AiToolName.SEARCH_RESTAURANTS,
    description:
      'Search published restaurants by free-text query, cuisine, dietary preference, price, and minimum rating. Use this for general "find me a restaurant" requests.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Free text: name, cuisine, or dish' },
        cuisine: { type: 'string', description: 'Comma-separated cuisine slugs' },
        dietary: { type: 'string', description: 'Comma-separated dietary slugs' },
        ratingMin: { type: 'number' },
        price: { type: 'string', enum: ['$', '$$', '$$$', '$$$$'] },
        openNow: { type: 'boolean' },
        limit: { type: 'number', description: 'Max results, default 5, max 10' },
      },
    },
  },
  {
    name: AiToolName.FIND_NEARBY_RESTAURANTS,
    description:
      'Find restaurants within a radius (km) of a lat/lng. Use when the user mentions "near me", "nearby", or gives a distance.',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        radius: { type: 'number', description: 'Kilometers, default 3' },
        cuisine: { type: 'string' },
        dietary: { type: 'string' },
      },
      required: ['lat', 'lng'],
    },
  },
  {
    name: AiToolName.GET_RESTAURANT,
    description: 'Get full details for one restaurant by id.',
    input_schema: {
      type: 'object',
      properties: { restaurantId: { type: 'string' } },
      required: ['restaurantId'],
    },
  },
  {
    name: AiToolName.GET_MENU,
    description: 'Get the menu (categories + items with prices) for a restaurant.',
    input_schema: {
      type: 'object',
      properties: { restaurantId: { type: 'string' } },
      required: ['restaurantId'],
    },
  },
  {
    name: AiToolName.SEARCH_DISHES,
    description: 'Search menu items by dish name across restaurants, e.g. "ramen", "biryani".',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Max results, default 5, max 10' },
      },
      required: ['query'],
    },
  },
  {
    name: AiToolName.GET_REVIEWS,
    description:
      'Get recent published reviews for a restaurant. Use this before summarizing what people say about a place — never invent review content.',
    input_schema: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string' },
        limit: { type: 'number', description: 'Max results, default 10, max 30' },
      },
      required: ['restaurantId'],
    },
  },
  {
    name: AiToolName.GET_OPENING_HOURS,
    description: 'Get opening hours and current open/closed status for a restaurant.',
    input_schema: {
      type: 'object',
      properties: { restaurantId: { type: 'string' } },
      required: ['restaurantId'],
    },
  },
  {
    name: AiToolName.GET_USER_PREFERENCES,
    description:
      "Get the current user's saved dietary/cuisine/price preferences, if logged in, to personalize recommendations.",
    input_schema: { type: 'object', properties: {} },
  },
];

export const ALLOWED_TOOL_NAMES = new Set<string>(TOOL_DEFINITIONS.map((t) => t.name));
