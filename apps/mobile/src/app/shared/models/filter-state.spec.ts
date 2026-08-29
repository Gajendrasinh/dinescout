import { countActiveFilters, EMPTY_FILTER_STATE, filterStateToQuery } from './filter-state';

describe('filterStateToQuery', () => {
  it('omits empty/undefined fields entirely', () => {
    const query = filterStateToQuery(EMPTY_FILTER_STATE);
    expect(query['cuisine']).toBeUndefined();
    expect(query['dietary']).toBeUndefined();
    expect(query['openNow']).toBeUndefined();
  });

  it('joins multi-select cuisine/dietary into comma-separated strings', () => {
    const query = filterStateToQuery({
      ...EMPTY_FILTER_STATE,
      cuisines: ['indian', 'japanese'],
      dietary: ['vegan'],
    });
    expect(query['cuisine']).toBe('indian,japanese');
    expect(query['dietary']).toBe('vegan');
  });

  it('maps openNow=false to undefined (not sent) but true to true', () => {
    expect(filterStateToQuery({ ...EMPTY_FILTER_STATE, openNow: false })['openNow']).toBeUndefined();
    expect(filterStateToQuery({ ...EMPTY_FILTER_STATE, openNow: true })['openNow']).toBe(true);
  });
});

describe('countActiveFilters', () => {
  it('is zero for the empty state', () => {
    expect(countActiveFilters(EMPTY_FILTER_STATE)).toBe(0);
  });

  it('counts each selected cuisine/dietary individually plus single-select filters', () => {
    const count = countActiveFilters({
      cuisines: ['indian', 'italian'],
      dietary: ['vegan'],
      ratingMin: 4.5,
      price: '$$',
      radiusKm: 3,
      openNow: true,
    });
    expect(count).toBe(7); // 2 + 1 + 1 + 1 + 1 + 1
  });
});
