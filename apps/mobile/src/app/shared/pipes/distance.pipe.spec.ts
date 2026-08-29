import { DistancePipe } from './distance.pipe';

describe('DistancePipe', () => {
  const pipe = new DistancePipe();

  it('formats sub-kilometer distances in meters', () => {
    expect(pipe.transform(0.35)).toBe('350 m');
  });

  it('formats kilometer-plus distances with one decimal', () => {
    expect(pipe.transform(3.456)).toBe('3.5 km');
  });

  it('returns an empty string for null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
