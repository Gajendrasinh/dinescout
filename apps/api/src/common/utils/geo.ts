/** Great-circle distance between two coordinates, in kilometers. */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(earthRadiusKm * c * 100) / 100;
}

/** Approximate a lat/lng bounding box for a radius in km — used to cheaply
 *  pre-filter rows in SQL before the precise haversine distance is applied. */
export function boundingBox(center: { lat: number; lng: number }, radiusKm: number) {
  const latDelta = radiusKm / 111; // ~111 km per degree of latitude
  const lngDelta = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180) || 1);
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

const MINUTES_IN_DAY = 24 * 60;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Determines whether "now" (server-local time, demo data is all SGT) falls
 *  within the given day's opening hours, handling overnight ranges (e.g. a
 *  bar open 18:00–02:00). */
export function isOpenAt(
  hours: { dayOfWeek: number; opensAt: string; closesAt: string; isClosed: boolean }[],
  at: Date,
): boolean {
  const dayOfWeek = at.getDay();
  const minutesNow = at.getHours() * 60 + at.getMinutes();

  const today = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (today && !today.isClosed) {
    const opens = toMinutes(today.opensAt);
    const closes = toMinutes(today.closesAt);
    if (closes > opens) {
      if (minutesNow >= opens && minutesNow < closes) return true;
    } else {
      // Overnight window, e.g. 18:00 -> 02:00
      if (minutesNow >= opens || minutesNow < closes) return true;
    }
  }

  // Check yesterday's overnight window spilling into today.
  const yesterday = hours.find((h) => h.dayOfWeek === (dayOfWeek + 6) % 7);
  if (yesterday && !yesterday.isClosed) {
    const opens = toMinutes(yesterday.opensAt);
    const closes = toMinutes(yesterday.closesAt);
    if (closes <= opens && minutesNow < closes) return true;
  }

  return false;
}

export { MINUTES_IN_DAY };
