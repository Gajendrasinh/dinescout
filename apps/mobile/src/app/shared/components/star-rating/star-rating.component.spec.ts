import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  let fixture: ComponentFixture<StarRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StarRatingComponent] }).compileComponents();
    fixture = TestBed.createComponent(StarRatingComponent);
  });

  it('formats the rating to one decimal place', () => {
    fixture.componentInstance.rating = 4;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4.0');
  });

  it('exposes an accessible label with the rating out of 5', () => {
    fixture.componentInstance.rating = 3.7;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[role="img"]');
    expect(el.getAttribute('aria-label')).toBe('3.7 out of 5 stars');
  });
});
