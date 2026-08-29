import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CuisineSlug, PriceRange, RestaurantSummary } from '@dinescout/shared-types';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { FavoritesService } from './favorites.service';

const RESTAURANT: RestaurantSummary = {
  id: 'r1',
  slug: 'test-place',
  name: 'Test Place',
  heroImageUrl: 'https://example.com/img.jpg',
  rating: 4.5,
  reviewCount: 10,
  cuisines: [{ id: 'c1', slug: CuisineSlug.INDIAN, name: 'Indian', emoji: '🍛' }],
  dietaryOptions: [],
  priceRange: PriceRange.MODERATE,
  distanceKm: null,
  isOpenNow: true,
  isFavorite: false,
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let httpMock: HttpTestingController;
  let loggedIn: boolean;

  beforeEach(() => {
    loggedIn = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } },
      ],
    });
    service = TestBed.inject(FavoritesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('optimistically marks a restaurant as favorited before the server call resolves', () => {
    loggedIn = true;
    const promise = service.toggle('r1');

    expect(service.isFavorite('r1')).toBe(true); // optimistic, before the request settles

    httpMock.expectOne(`${environment.apiBaseUrl}/favorites/r1`).flush(null);
    return promise;
  });

  it('rolls back the optimistic update if the persist call fails', async () => {
    loggedIn = true;
    const promise = service.toggle('r1');
    expect(service.isFavorite('r1')).toBe(true);

    httpMock
      .expectOne(`${environment.apiBaseUrl}/favorites/r1`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    await promise;
    expect(service.isFavorite('r1')).toBe(false);
  });

  it('merges a restaurant summary with the live favorites signal', () => {
    expect(service.withFavoriteStatus(RESTAURANT).isFavorite).toBe(false);
  });
});
