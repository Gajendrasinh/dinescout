import { boundingBox, haversineDistanceKm, isOpenAt } from './geo';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    const point = { lat: 1.3521, lng: 103.8198 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it('returns a plausible distance between two known Singapore points', () => {
    // Marina Bay Sands to Changi Airport is roughly 17-18km.
    const marinaBay = { lat: 1.2838, lng: 103.8591 };
    const changi = { lat: 1.3644, lng: 103.9915 };
    const distance = haversineDistanceKm(marinaBay, changi);
    expect(distance).toBeGreaterThan(14);
    expect(distance).toBeLessThan(20);
  });
});

describe('boundingBox', () => {
  it('produces a box that contains the center point', () => {
    const center = { lat: 1.3521, lng: 103.8198 };
    const box = boundingBox(center, 5);
    expect(center.lat).toBeGreaterThanOrEqual(box.minLat);
    expect(center.lat).toBeLessThanOrEqual(box.maxLat);
    expect(center.lng).toBeGreaterThanOrEqual(box.minLng);
    expect(center.lng).toBeLessThanOrEqual(box.maxLng);
  });
});

describe('isOpenAt', () => {
  const monday10am = new Date('2024-01-01T10:00:00'); // a Monday, local time

  it('is open when the current time falls within a same-day window', () => {
    const hours = [{ dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00', isClosed: false }];
    expect(isOpenAt(hours, monday10am)).toBe(true);
  });

  it('is closed outside the window', () => {
    const hours = [{ dayOfWeek: 1, opensAt: '11:00', closesAt: '18:00', isClosed: false }];
    expect(isOpenAt(hours, monday10am)).toBe(false);
  });

  it('respects an explicit isClosed flag even within business hours', () => {
    const hours = [{ dayOfWeek: 1, opensAt: '00:00', closesAt: '23:59', isClosed: true }];
    expect(isOpenAt(hours, monday10am)).toBe(false);
  });

  it('handles an overnight window that spans midnight', () => {
    const lateNight = new Date('2024-01-02T01:00:00'); // Tuesday 1am
    const hours = [{ dayOfWeek: 1, opensAt: '18:00', closesAt: '02:00', isClosed: false }];
    expect(isOpenAt(hours, lateNight)).toBe(true);
  });

  it('is closed when no hours are defined for the day', () => {
    expect(isOpenAt([], monday10am)).toBe(false);
  });
});
