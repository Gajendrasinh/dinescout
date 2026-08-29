import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuisinesService } from '../../../core/services/cuisines.service';
import {
  DISTANCE_OPTIONS_KM,
  EMPTY_FILTER_STATE,
  FilterState,
  PRICE_OPTIONS,
  RATING_OPTIONS,
} from '../../models/filter-state';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonToggle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { Cuisine, DietaryOption } from '@dinescout/shared-types';
import { ChipComponent } from '../chip/chip.component';

@Component({
  selector: 'app-filter-sheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonButton,
    IonToggle,
    ChipComponent,
  ],
  templateUrl: './filter-sheet.component.html',
  styleUrl: './filter-sheet.component.scss',
})
export class FilterSheetComponent implements OnInit {
  private readonly cuisinesService = inject(CuisinesService);
  private readonly modalController = inject(ModalController);

  @Input() initialState: FilterState = { ...EMPTY_FILTER_STATE };
  @Output() apply = new EventEmitter<FilterState>();

  state: FilterState = { ...EMPTY_FILTER_STATE };
  cuisines: Cuisine[] = [];
  dietaryOptions: DietaryOption[] = [];

  readonly ratingOptions = RATING_OPTIONS;
  readonly priceOptions = PRICE_OPTIONS;
  readonly distanceOptions = DISTANCE_OPTIONS_KM;

  ngOnInit(): void {
    this.state = { ...this.initialState, cuisines: [...this.initialState.cuisines], dietary: [...this.initialState.dietary] };
    this.cuisinesService.listCuisines().subscribe((c) => (this.cuisines = c));
    this.cuisinesService.listDietaryOptions().subscribe((d) => (this.dietaryOptions = d));
  }

  toggleCuisine(slug: string): void {
    this.state.cuisines = this.state.cuisines.includes(slug)
      ? this.state.cuisines.filter((s) => s !== slug)
      : [...this.state.cuisines, slug];
  }

  toggleDietary(slug: string): void {
    this.state.dietary = this.state.dietary.includes(slug)
      ? this.state.dietary.filter((s) => s !== slug)
      : [...this.state.dietary, slug];
  }

  selectRating(value: number): void {
    this.state.ratingMin = this.state.ratingMin === value ? undefined : value;
  }

  selectPrice(value: string): void {
    this.state.price = this.state.price === value ? undefined : value;
  }

  selectDistance(value: number): void {
    this.state.radiusKm = this.state.radiusKm === value ? undefined : value;
  }

  reset(): void {
    this.state = { ...EMPTY_FILTER_STATE };
  }

  dismiss(): void {
    void this.modalController.dismiss();
  }

  applyFilters(): void {
    this.apply.emit(this.state);
    void this.modalController.dismiss(this.state);
  }
}
