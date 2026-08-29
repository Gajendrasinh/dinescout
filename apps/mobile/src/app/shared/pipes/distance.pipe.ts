import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dsDistance', standalone: true })
export class DistancePipe implements PipeTransform {
  transform(km: number | null | undefined): string {
    if (km === null || km === undefined) return '';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }
}
