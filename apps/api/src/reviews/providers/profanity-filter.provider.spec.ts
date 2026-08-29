import { LocalWordListProfanityFilter } from './profanity-filter.provider';

describe('LocalWordListProfanityFilter', () => {
  const filter = new LocalWordListProfanityFilter();

  it('flags text containing a blocked term', async () => {
    const result = await filter.check('This place is absolute shit.');
    expect(result.isProfane).toBe(true);
    expect(result.matchedTerms).toContain('shit');
  });

  it('is case-insensitive', async () => {
    const result = await filter.check('What a BASTARD of a wait time.');
    expect(result.isProfane).toBe(true);
  });

  it('does not flag clean text', async () => {
    const result = await filter.check('Great food and friendly staff, would recommend.');
    expect(result.isProfane).toBe(false);
    expect(result.matchedTerms).toEqual([]);
  });
});
