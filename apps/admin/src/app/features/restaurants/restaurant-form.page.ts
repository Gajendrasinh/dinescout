import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Cuisine, DietaryOption } from '@dinescout/shared-types';
import { CuisinesService } from '../../core/services/cuisines.service';
import { AdminRestaurantsService } from '../../core/services/restaurants.service';

@Component({
  selector: 'admin-restaurant-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './restaurant-form.page.html',
})
export class RestaurantFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly restaurantsService = inject(AdminRestaurantsService);
  private readonly cuisinesService = inject(CuisinesService);

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly cuisines = signal<Cuisine[]>([]);
  readonly dietaryOptions = signal<DietaryOption[]>([]);
  readonly selectedCuisines = signal<string[]>([]);
  readonly selectedDietary = signal<string[]>([]);

  private restaurantId: string | null = null;

  readonly priceOptions = ['$', '$$', '$$$', '$$$$'];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    address: ['', [Validators.required, Validators.minLength(4)]],
    lat: [1.3521, [Validators.required]],
    lng: [103.8198, [Validators.required]],
    phone: [''],
    website: [''],
    priceRange: ['$$', [Validators.required]],
  });

  ngOnInit(): void {
    this.cuisinesService.listCuisines().subscribe((c) => this.cuisines.set(c));
    this.cuisinesService.listDietaryOptions().subscribe((d) => this.dietaryOptions.set(d));

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.restaurantId = id;
      this.restaurantsService.getOne(id).subscribe((r) => {
        this.form.patchValue({
          name: r.name,
          description: r.description,
          address: r.address,
          lat: r.coordinates.lat,
          lng: r.coordinates.lng,
          phone: r.phone ?? '',
          website: r.website ?? '',
          priceRange: r.priceRange,
        });
        this.selectedCuisines.set(r.cuisines.map((c) => c.slug));
        this.selectedDietary.set(r.dietaryOptions.map((d) => d.slug));
      });
    }
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

  save(): void {
    if (this.form.invalid || this.selectedCuisines().length === 0) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Name, description, address, and at least one cuisine are required.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    const payload = {
      ...value,
      phone: value.phone || undefined,
      website: value.website || undefined,
      cuisineSlugs: this.selectedCuisines(),
      dietarySlugs: this.selectedDietary(),
    };

    const request$ = this.isEdit()
      ? this.restaurantsService.update(this.restaurantId!, payload)
      : this.restaurantsService.create(payload);

    request$.subscribe({
      next: () => void this.router.navigate(['/restaurants']),
      error: (err: { message?: string }) => {
        this.saving.set(false);
        this.errorMessage.set(err.message ?? 'Failed to save restaurant.');
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/restaurants']);
  }
}
