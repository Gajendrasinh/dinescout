import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { Cuisine, DietaryOption } from '@dinescout/shared-types';
import { CuisinesService } from '../../core/services/cuisines.service';
import { UsersService } from '../../core/services/users.service';
import { ChipComponent } from '../../shared/components/chip/chip.component';
import { DISTANCE_OPTIONS_KM, PRICE_OPTIONS } from '../../shared/models/filter-state';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, ChipComponent],
  templateUrl: './preferences.page.html',
  styleUrl: './preferences.page.scss',
})
export class PreferencesPage implements OnInit {
  private readonly cuisinesService = inject(CuisinesService);
  private readonly usersService = inject(UsersService);
  private readonly location = inject(Location);

  readonly cuisines = signal<Cuisine[]>([]);
  readonly dietaryOptions = signal<DietaryOption[]>([]);
  readonly selectedCuisines = signal<string[]>([]);
  readonly selectedDietary = signal<string[]>([]);
  readonly selectedPrice = signal<string | undefined>(undefined);
  readonly selectedDistance = signal<number>(5);
  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly priceOptions = PRICE_OPTIONS;
  readonly distanceOptions = DISTANCE_OPTIONS_KM;

  ngOnInit(): void {
    this.cuisinesService.listCuisines().subscribe((c) => this.cuisines.set(c));
    this.cuisinesService.listDietaryOptions().subscribe((d) => this.dietaryOptions.set(d));
    this.usersService.getPreferences().subscribe((prefs) => {
      this.selectedCuisines.set(prefs.favoriteCuisines);
      this.selectedDietary.set(prefs.dietaryPreferences);
      this.selectedPrice.set(prefs.pricePreference ?? undefined);
      this.selectedDistance.set(prefs.preferredDistanceKm);
    });
  }

  toggleCuisine(slug: string): void {
    this.selectedCuisines.update((list) =>
      list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug],
    );
  }

  toggleDietary(slug: string): void {
    this.selectedDietary.update((list) =>
      list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug],
    );
  }

  selectPrice(value: string): void {
    this.selectedPrice.set(this.selectedPrice() === value ? undefined : value);
  }

  selectDistance(value: number): void {
    this.selectedDistance.set(value);
  }

  save(): void {
    this.saving.set(true);
    this.usersService
      .updatePreferences({
        favoriteCuisines: this.selectedCuisines(),
        dietaryPreferences: this.selectedDietary(),
        pricePreference: this.selectedPrice(),
        preferredDistanceKm: this.selectedDistance(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2000);
        },
        error: () => this.saving.set(false),
      });
  }

  goBack(): void {
    this.location.back();
  }
}
