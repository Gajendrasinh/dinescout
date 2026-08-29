import { ToolRouterService } from './tool-router.service';

describe('ToolRouterService', () => {
  const restaurants = { search: jest.fn(), findOne: jest.fn() };
  const menu = { getMenu: jest.fn() };
  const reviews = { list: jest.fn() };
  const prisma = { menuItem: { findMany: jest.fn() } };

  let router: ToolRouterService;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new ToolRouterService(
      restaurants as never,
      menu as never,
      reviews as never,
      prisma as never,
    );
  });

  it('rejects a tool name that is not on the whitelist', async () => {
    const { result, record } = await router.execute('dropAllTables', {}, {});
    expect(result).toEqual({ error: 'Tool not allowed' });
    expect(record.ok).toBe(false);
    expect(restaurants.search).not.toHaveBeenCalled();
  });

  it('routes searchRestaurants to RestaurantsService.search with a clamped limit', async () => {
    restaurants.search.mockResolvedValue({ data: [{ id: 'r1' }], meta: {} });
    const { result, record } = await router.execute(
      'searchRestaurants',
      { search: 'ramen', limit: 999 },
      { userId: 'u1' },
    );
    expect(result).toEqual([{ id: 'r1' }]);
    expect(record.ok).toBe(true);
    // 999 is clamped down to the tool's max result count (10), never passed through raw.
    expect(restaurants.search).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'ramen', limit: 10 }),
      'u1',
    );
  });

  it('falls back to context.restaurantId when getMenu is called without one', async () => {
    menu.getMenu.mockResolvedValue({ categories: [], items: [] });
    const { result } = await router.execute('getMenu', {}, { restaurantId: 'r42' });
    expect(menu.getMenu).toHaveBeenCalledWith('r42');
    expect(result).toEqual({ categories: [], items: [] });
  });

  it('returns a soft error instead of throwing when a downstream service fails', async () => {
    restaurants.findOne.mockRejectedValue(new Error('db down'));
    const { result, record } = await router.execute(
      'getRestaurant',
      { restaurantId: 'r1' },
      {},
    );
    expect(result).toEqual({ error: 'Tool execution failed' });
    expect(record.ok).toBe(false);
  });
});
