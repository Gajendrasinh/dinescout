import { HeuristicSpamDetector } from './spam-detector.provider';

describe('HeuristicSpamDetector', () => {
  const detector = new HeuristicSpamDetector();

  it('flags text containing a URL', async () => {
    const result = await detector.check('Best deals at http://spam-site.example, visit now!');
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons).toContain('contains a URL');
  });

  it('flags excessive repeated characters', async () => {
    const result = await detector.check('soooooooooo good');
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons).toContain('excessive repeated characters');
  });

  it('flags excessive capitalization', async () => {
    const result = await detector.check('THIS PLACE IS AMAZING GO NOW');
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons).toContain('excessive capitalization');
  });

  it('does not flag a normal review', async () => {
    const result = await detector.check(
      'Really enjoyed the food here, the staff were friendly and the portions generous.',
    );
    expect(result.isSuspicious).toBe(false);
  });
});
