import { Pipe, PipeTransform } from '@angular/core';

const UNITS: [number, string][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.345, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

@Pipe({ name: 'dsTimeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(isoDate: string): string {
    const then = new Date(isoDate).getTime();
    if (Number.isNaN(then)) return '';

    let diffSeconds = (Date.now() - then) / 1000;
    if (diffSeconds < 5) return 'just now';

    for (const [amount, unit] of UNITS) {
      if (diffSeconds < amount) {
        const value = Math.floor(diffSeconds);
        return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
      }
      diffSeconds /= amount;
    }
    return isoDate;
  }
}
