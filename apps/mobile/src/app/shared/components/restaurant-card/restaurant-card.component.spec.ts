import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CuisineSlug, DietaryTag, PriceRange, RestaurantSummary } from '@dinescout/shared-types';
import { RestaurantCardComponent } from './restaurant-card.component';

const RESTAURANT: RestaurantSummary = {
  id: 'r1',
  slug: 'test-place',
  name: 'Test Place',
  heroImageUrl: 'https://example.com/img.jpg',
  rating: 4.5,
  reviewCount: 120,
  cuisines: [{ id: 'c1', slug: CuisineSlug.INDIAN, name: 'Indian', emoji: '🍛' }],
  dietaryOptions: [{ id: 'd1', slug: DietaryTag.VEGETARIAN, label: 'Veg', emoji: '🥬' }],
  priceRange: PriceRange.MODERATE,
  distanceKm: 1.2,
  isOpenNow: true,
  isFavorite: false,
};

describe('RestaurantCardComponent', () => {
  let fixture: ComponentFixture<RestaurantCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RestaurantCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(RestaurantCardComponent);
    fixture.componentInstance.restaurant = RESTAURANT;
    fixture.detectChanges();
  });

  it('renders the restaurant name', () => {
    const name = fixture.nativeElement.querySelector('.ds-card__name');
    expect(name.textContent).toContain('Test Place');
  });

  it('emits open when the card is clicked', () => {
    const spy = jasmine.createSpy('open');
    fixture.componentInstance.open.subscribe(spy);
    fixture.nativeElement.querySelector('ion-card').click();
    expect(spy).toHaveBeenCalledWith(RESTAURANT);
  });

  it('emits toggleFavorite without triggering open when the heart button is clicked', () => {
    const openSpy = jasmine.createSpy('open');
    const favSpy = jasmine.createSpy('fav');
    fixture.componentInstance.open.subscribe(openSpy);
    fixture.componentInstance.toggleFavorite.subscribe(favSpy);

    fixture.nativeElement.querySelector('.ds-card__fav').click();

    expect(favSpy).toHaveBeenCalledWith(RESTAURANT);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('shows a "Closed" badge when the restaurant is not open now', () => {
    fixture.componentInstance.restaurant = { ...RESTAURANT, isOpenNow: false };
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.ds-card__status');
    expect(badge?.textContent).toContain('Closed');
  });

  it('renders a skeleton instead of restaurant content while loading', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ds-card--skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ds-card__name')).toBeFalsy();
  });
});
